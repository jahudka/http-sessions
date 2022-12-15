import type { SessionLock } from './sessionLock';

export interface LockManagerInterface {
  acquire(sessionId: string): Promise<SessionLock>;
}
