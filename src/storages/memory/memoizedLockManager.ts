import type { LockManagerInterface } from '../lockManagerInterface';
import { SessionLock } from '../sessionLock';

export class MemoizedLockManager implements LockManagerInterface {
  private readonly locks: Map<string, SessionLock> = new Map();

  public async acquire(sessionId: string): Promise<SessionLock> {
    const lock = new SessionLock(sessionId, () => {
      if (this.locks.get(sessionId) === lock) {
        this.locks.delete(sessionId);
      }
    });

    const previous = this.locks.get(sessionId);
    this.locks.set(sessionId, lock);

    if (previous) {
      await previous.released;
    }

    return lock;
  }
}
