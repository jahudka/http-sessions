import type { ValueMap } from '../types';

export interface StorageInterface {
  /**
   * This method should obtain a new unique session ID
   * and acquire an exclusive lock on it. If a previous
   * session ID is provided, any data associated with it
   * should be moved to the new ID and if there is a lock
   * acquired for the previous ID, it should be released.
   */
  allocateAndLockId(previous?: string): Promise<string>;

  /**
   * This method should acquire an exclusive lock on the session ID
   * and then load and return the associated session data.
   */
  lockAndRead(id: string): Promise<ValueMap | undefined>;

  /**
   * This method should persist the session data, optionally scheduling
   * the data to be purged upon expiration, and release the exclusive lock
   * on the session ID.
   */
  writeAndUnlock(id: string, data: ValueMap, expires?: number): Promise<void> | void;

  /**
   * This method should purge any data related to the provided session ID
   * and release the exclusive lock on the session ID, if one exists.
   */
  purge(id: string): Promise<void> | void;
}
