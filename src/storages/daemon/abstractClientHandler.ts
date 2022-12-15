import type { Socket } from 'net';
import type { SessionLock } from '../sessionLock';
import type { IPCValue } from './ipc';
import { Connection } from './ipc';
import type { LockId } from './types';

const Uint32_max_value = 2 ** 32 - 1;

export abstract class AbstractClientHandler<T extends any[]> {
  private readonly conn: Connection;
  private readonly locks: Map<LockId, SessionLock>;
  private lockId: LockId = 0;

  protected constructor(conn: Socket) {
    this.conn = new Connection(conn);
    this.locks = new Map();

    this.conn.on('message', this.handleMessage.bind(this));
  }

  protected abstract isMessageValid(message: IPCValue[]): message is T;
  protected abstract executeMethod(message: T): Promise<any>;

  private async handleMessage(message: IPCValue[]): Promise<void> {
    if (!this.isMessageValid(message)) {
      return;
    }

    const [err, result] = await this.tryExecuteMethod(message);
    await this.conn.send(message[0], err && (err.message || err.name || 'Unknown error'), result);
  }

  private async tryExecuteMethod(message: T): Promise<[Error | undefined, any]> {
    try {
      const result = await this.executeMethod(message);
      return [undefined, result];
    } catch (e) {
      return [e, undefined];
    }
  }

  protected getLock(id: LockId): SessionLock {
    const lock = this.locks.get(id);

    if (!lock) {
      throw new Error('Invalid lock ID');
    }

    return lock;
  }

  protected saveLock(lock: SessionLock): LockId {
    const id = this.lockId;
    this.locks.set(id, lock);
    lock.released.then(() => this.locks.delete(id));

    if (++this.lockId >= Uint32_max_value) {
      this.lockId = 0;
    }

    return id;
  }
}
