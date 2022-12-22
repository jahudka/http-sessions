import type { SQLSessionInterface } from './sqlSessionInterface';

export type SQLPersistMode = 'insert' | 'update' | 'merge';
export type SQLLockMode = 'exclusive' | 'shared';

/**
 * This interface needs to be implemented by a class which provides
 * an implementation of a specific SQL driver and dialect for use
 * with sessions.
 */
export interface SQLAdapterInterface<Ctx extends object = object> {
  /**
   * This method should take care of any required internal initialisation
   * of the adapter. It can also check and optionally create the required
   * database tables if this is not provided by other means.
   */
  init(withLocks: boolean): Promise<void>;

  /**
   * This method should create and initialise a context object which is used
   * during session locking. If the implementation e.g. works with a connection
   * pool, it should allocate a specific connection, as this is typically required
   * for transactions.
   */
  createContext(): Promise<Ctx> | Ctx;

  /**
   * This method should clean up the context object by e.g. releasing
   * any allocated connections back to the connection pool.
   */
  destroyContext(ctx: Ctx): Promise<void> | void;

  /**
   * This method should start a database-level transaction.
   */
  beginTransaction(ctx: Ctx): Promise<void>;

  /**
   * This method should attempt to commit an existing database-level transaction.
   */
  commit(ctx: Ctx): Promise<void>;

  /**
   * This method should attempt to roll back an existing database-level transaction.
   * If further steps are needed to enable new queries to be run in the same
   * context, it should take them.
   */
  rollback(ctx: Ctx): Promise<void>;

  /**
   * This method should read the session row, if one exists, using the context if provided.
   * If a lock mode is specified, a database-level lock should be requested on the row
   * (e.g. in Postgres, an `exclusive` lock mode should result in a `SELECT ... FOR UPDATE`
   * query, and a `shared` lock mode should result in a `SELECT ... FOR SHARE`).
   */
  getSession(id: string, lock?: SQLLockMode, ctx?: Ctx): Promise<SQLSessionInterface | undefined>;

  /**
   * This method should persist the supplied session data, using the context if provided.
   * Depending on the specified `mode`, an `INSERT`, `UPDATE` or `INSERT ... ON CONFLICT UPDATE ...`
   * query should be run.
   */
  persistSessionData(id: string, session: Omit<SQLSessionInterface, 'id'>, mode?: SQLPersistMode, ctx?: Ctx): Promise<void>;

  /**
   * This method should reset the `lockId` and `lockExpires` fields of the session row
   * to `NULL`, if the `lockId` in the database matches the specified value.
   */
  eraseLockData(id: string, lockId: string): Promise<void>;

  /**
   * This method should delete the session row. If `checkLock` is `true`,
   * it should only delete the session row if the `lockId` field is `NULL`.
   * The method should return `true` if a session row doesn't exist anymore,
   * that is, either it was deleted, or it didn't exist to begin with.
   */
  deleteSession(id: string, checkLock?: boolean): Promise<boolean>;

  /**
   * This method should check a caught `Error` object and return `true`
   * if it represents a unique constraint violation.
   */
  isUniqueConstraintViolationException(e: any): boolean;
}
