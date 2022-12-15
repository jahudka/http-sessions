import type { ValueMap } from '../types';
import type { SessionLock } from './sessionLock';

export interface StorageInterface {
  /**
   * This method should acquire an exclusive lock on the given session ID.
   * It should wait until the lock is available and reject only if it's
   * impossible to acquire a lock.
   */
  lock(sessionId: string): Promise<SessionLock>;

  /**
   * This method should load the data associated with the given session.
   * If a bare session ID is provided, the method should ensure the session
   * data is read atomically, e.g. by acquiring a shared lock and releasing
   * it when the data is read.
   */
  read(session: SessionLock | string): Promise<ValueMap | undefined>;

  /**
   * This method should persist the session data, optionally scheduling its expiration.
   * If a bare session ID is provided, the method should ensure the data is
   * written atomically, e.g. by acquiring an exclusive lock. If `release` is `true`
   * or a bare session ID is provided, the session lock should be released after
   * persisting the session data.
   */
  write(sessionId: string, data: ValueMap, expires?: number): Promise<void>;
  write(lock: SessionLock, data: ValueMap, expires?: number, release?: boolean): Promise<void>;

  /**
   * This method should purge any session data associated with the given session.
   * If a bare session ID is provided, the method should ensure the data is accessed
   * atomically, e.g. by acquiring an exclusive lock. The session lock should be
   * released after purging the session data.
   */
  purge(session: SessionLock | string): Promise<void>;
}
