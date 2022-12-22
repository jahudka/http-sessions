import type { Socket } from 'net';
import { FileManager } from '../file/fileManager';
import type { LockManagerInterface } from '../lockManagerInterface';
import { MemoizedLockManager } from '../memory';
import { AbstractClientHandler } from './abstractClientHandler';
import type { IPCValue } from './ipc';
import type { LockId, SessionId,StorageDaemonMessage } from './types';
import { isStorageDaemonMessage } from './types';

type Entry = {
  data: Buffer;
  tmr?: NodeJS.Timeout;
};

export class StorageClientHandler extends AbstractClientHandler<StorageDaemonMessage> {
  private readonly fileManager?: FileManager;
  private readonly lockManager: LockManagerInterface;
  private readonly sessions: Map<string, Entry> = new Map();

  public constructor(conn: Socket, storageDir?: string) {
    super(conn);
    this.fileManager = storageDir ? new FileManager(storageDir) : undefined;
    this.lockManager = new MemoizedLockManager();
  }

  protected isMessageValid(message: IPCValue[]): message is StorageDaemonMessage {
    return isStorageDaemonMessage(message);
  }

  protected async executeMethod(message: StorageDaemonMessage): Promise<any> {
    switch (message[1]) {
      case 'lock': return await this.lock(message[2]);
      case 'read': return await this.read(message[2]);
      case 'write': await this.write(message[2], message[3], message[4], message[5]); break;
      case 'purge': await this.purge(message[2]); break;
      case 'release': await this.release(message[2]); break;
    }

    return undefined;
  }

  private async lock(id: string): Promise<LockId> {
    const lock = await this.lockManager.acquire(id);
    return this.saveLock(lock);
  }

  private async read(session: LockId | string): Promise<Buffer | undefined> {
    const lock = typeof session === 'string' ? await this.lockManager.acquire(session) : this.getLock(session);
    const data = await this.readData(lock.sessionId);
    typeof session === 'string' && await lock.release();
    return data;
  }

  private async write(session: LockId | string, data: Buffer, expires?: number, release?: boolean): Promise<void> {
    const lock = typeof session === 'string' ? await this.lockManager.acquire(session) : this.getLock(session);
    await this.writeData(lock.sessionId, data, expires);
    (release || typeof session === 'string') && await lock.release();
  }

  private async purge(session: LockId | SessionId): Promise<void> {
    const lock = typeof session === 'string' ? await this.lockManager.acquire(session) : this.getLock(session);
    await this.purgeData(lock.sessionId);
    await lock.release();
  }

  private async release(lockId: LockId): Promise<void> {
    try {
      await this.getLock(lockId).release();
    } catch (e: any) {
      // noop
    }
  }

  private async readData(id: string): Promise<Buffer | undefined> {
    const memoized = this.sessions.get(id);
    memoized && memoized.tmr && clearTimeout(memoized.tmr);

    if (memoized || !this.fileManager) {
      return memoized?.data;
    }

    const data = await this.fileManager.readFile(id);
    data && this.sessions.set(id, { data });
    return data;
  }

  private async writeData(id: string, data: Buffer, expires?: number): Promise<void> {
    const entry: Entry = { data };
    expires && (entry.tmr = setTimeout(() => this.purge(id), expires - Date.now()));
    this.sessions.set(id, entry);

    if (this.fileManager) {
      await this.fileManager.writeFile(id, data, expires);
    }
  }

  private async purgeData(id: string): Promise<void> {
    this.sessions.delete(id);

    if (this.fileManager) {
      await this.fileManager.removeFile(id);
    }
  }
}
