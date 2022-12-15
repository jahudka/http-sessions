import type { LockManagerInterface } from '../lockManagerInterface';
import type { SessionLock } from '../sessionLock';
import { AbstractDaemonClient } from './abstractDaemonClient';

export class DaemonLockManager extends AbstractDaemonClient implements LockManagerInterface {
  public async acquire(sessionId: string): Promise<SessionLock> {
    const lockId = await this.call('acquire', sessionId);
    return this.saveLock(sessionId, lockId);
  }
}
