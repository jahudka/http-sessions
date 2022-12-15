import type { ValueMap } from '../types';
import type { LockManagerInterface } from './lockManagerInterface';
import type { SessionLock } from './sessionLock';
import type { StorageInterface } from './storageInterface';

export abstract class AbstractStorage implements StorageInterface {
  private locks: LockManagerInterface;

  public constructor(lockManager: LockManagerInterface) {
    this.locks = lockManager;
  }

  protected abstract readSessionData(id: string): Promise<ValueMap | undefined>;
  protected abstract writeSessionData(id: string, data: ValueMap, expires?: number): Promise<void>;
  protected abstract purgeSessionData(id: string): Promise<void>;

  public async lock(sessionId: string): Promise<SessionLock> {
    return this.locks.acquire(sessionId);
  }

  public async read(session: SessionLock | string): Promise<ValueMap | undefined> {
    const lock = typeof session === 'string' ? await this.lock(session) : session;
    const data = await this.readSessionData(lock.sessionId);
    typeof session === 'string' && await lock.release();
    return data;
  }

  public async write(session: SessionLock | string, data: ValueMap, expires?: number, release?: boolean): Promise<void> {
    const lock = typeof session === 'string' ? await this.lock(session) : session;
    await this.writeSessionData(lock.sessionId, data, expires);
    (release || typeof session === 'string') && await lock.release();
  }

  public async purge(session: SessionLock | string): Promise<void> {
    const lock = typeof session === 'string' ? await this.locks.acquire(session) : session;
    await this.purgeSessionData(lock.sessionId);
    await lock.release();
  }
}
