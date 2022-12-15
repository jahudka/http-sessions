import { deserialize, serialize } from 'v8';
import type { ValueMap } from '../../types';
import { AbstractStorage } from '../abstractStorage';
import { DummyStorage } from '../dummyStorage';
import type { LockManagerInterface } from '../lockManagerInterface';
import type { SessionLock } from '../sessionLock';
import type { StorageInterface } from '../storageInterface';
import { MemoizedLockManager } from './memoizedLockManager';

type Entry = {
  data?: Buffer;
  lock: SessionLock;
  tmr?: NodeJS.Timeout;
};

export class MemoizedStorage extends AbstractStorage {
  private readonly storage: StorageInterface;
  private readonly sessions: Map<string, Entry> = new Map();

  public constructor(storage?: StorageInterface, lockManager?: LockManagerInterface) {
    super(lockManager ?? new MemoizedLockManager());
    this.storage = storage ?? new DummyStorage();
  }

  public async lock(sessionId: string, localOnly?: boolean): Promise<SessionLock> {
    if (!localOnly) {
      await this.getSession(sessionId);
    }

    return super.lock(sessionId);
  }

  public async purge(id: SessionLock | string): Promise<void> {
    await super.purge(typeof id === 'string' ? await this.lock(id, true) : id);
  }

  protected async readSessionData(id: string): Promise<ValueMap | undefined> {
    const session = await this.getSession(id);

    if (session.data) {
      return deserialize(session.data);
    }

    const data = await this.storage.read(id);
    session.data = data && serialize(data);
    return data;
  }

  protected async writeSessionData(id: string, data: ValueMap, expires?: number): Promise<void> {
    const session = await this.getSession(id);

    await this.storage.write(session.lock, data, expires);

    session.tmr = expires ? setTimeout(() => this.purge(id), expires - Date.now()) : undefined;
    session.data = serialize(data);
  }

  protected async purgeSessionData(id: string): Promise<void> {
    const session = this.sessions.get(id);
    session && session.tmr && clearTimeout(session.tmr);
    await this.storage.purge(session ? session.lock : id);
    this.sessions.delete(id);
  }

  private async getSession(id: string): Promise<Entry> {
    let session = this.sessions.get(id);

    if (!session) {
      session = {
        lock: await this.storage.lock(id),
      };

      this.sessions.set(id, session);
    }

    session.tmr && clearTimeout(session.tmr);
    return session;
  }
}
