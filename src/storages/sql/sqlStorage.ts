import { v4 } from 'uuid';
import type { ValueMap } from '../../types';
import { sleep } from '../../utils';
import type { LockManagerInterface } from '../lockManagerInterface';
import type { SessionLock } from '../sessionLock';
import type { StorageInterface } from '../storageInterface';
import type { SQLAdapterInterface, SQLLockMode } from './sqlAdapterInterface';
import type { SQLSessionInterface } from './sqlSessionInterface';
import { SQLSessionLock } from './sqlSessionLock';

export class SQLStorage implements StorageInterface {
  private readonly adapter: SQLAdapterInterface;
  private readonly locks?: LockManagerInterface;
  private readonly adapterReady: Promise<void>;

  public constructor(adapter: SQLAdapterInterface, lockManager?: LockManagerInterface) {
    this.adapter = adapter;
    this.locks = lockManager;
    this.adapterReady = this.adapter.init(!lockManager);
  }

  public async lock(sessionId: string): Promise<SessionLock> {
    if (this.locks) {
      return this.locks.acquire(sessionId);
    }

    await this.adapterReady;
    const session = await this.readAndLock(sessionId, 'exclusive');
    return new SQLSessionLock(session, async () => this.release(session));
  }

  public async read(session: SessionLock | string): Promise<ValueMap | undefined> {
    await this.adapterReady;

    let entry: SQLSessionInterface | undefined;

    if (typeof session === 'string') {
      // bare session ID provided, we need a lock
      if (this.locks) {
        // external locking, nothing more we can do
        const lock = await this.locks.acquire(session);
        entry = await this.adapter.getSession(session);
        await lock.release();
      } else {
        // native database-level locking
        const ctx = await this.adapter.createContext();
        await this.adapter.beginTransaction(ctx);
        entry = await this.adapter.getSession(session, 'shared', ctx);
        await this.adapter.commit(ctx);
        await this.adapter.destroyContext(ctx);
      }
    } else if (session instanceof SQLSessionLock) {
      // reading data from a session which has an exclusive lock
      entry = session.session;
    } else {
      // lock obtained externally
      entry = await this.adapter.getSession(session.sessionId);
    }

    return entry?.data;
  }

  public async write(session: SessionLock | string, data: ValueMap, expires?: number, release?: boolean): Promise<void> {
    await this.adapterReady;

    const entry: Omit<SQLSessionInterface, 'id'> = {
      data,
      expires: expires ? new Date(expires) : undefined,
    };

    if (typeof session === 'string') {
      // bare session ID - that should always mean a new session at this point

      // if we're configured for external locking, we need to
      // acquire a lock now
      const lock = this.locks && await this.locks.acquire(session);

      // if we don't use external locking, we're good to go as is -
      // database-level locks will do the trick
      await this.adapter.persistSessionData(session, entry, 'insert');

      // release external lock if we acquired one
      lock && await lock.release();
    } else {
      // we have an exclusive lock over the session

      if (session instanceof SQLSessionLock) {
        // if this is a native SQL lock and we want to release it,
        // we can do so in the same SQL operation as the actual data
        // persisting
        if (release) {
          entry.lockId = undefined;
          entry.lockExpires = undefined;
        }

        // ensure the session object within the lock is up to date
        Object.assign(session.session, entry);
      }

      // now we either have an external exclusive lock, or a native lock;
      // either way, an SQL 'INSERT ... ON CONFLICT UPDATE ...' query should
      // be okay to run now:
      await this.adapter.persistSessionData(session.sessionId, entry, 'merge');

      // finally let's release the lock if a release was requested
      release && await session.release();
    }
  }

  public async purge(session: SessionLock | string): Promise<void> {
    await this.adapterReady;

    let lock: SessionLock | undefined;
    let check: boolean = false;
    let sessionId: string;

    if (typeof session === 'string') {
      // bare session ID provided
      sessionId = session;

      if (this.locks) {
        // if we're configured for external locking, we need to acquire
        // an exclusive lock now
        lock = await this.locks.acquire(sessionId);
      } else {
        // otherwise we need to check for a native exclusive lock when deleting
        check = true;
      }
    } else {
      sessionId = session.sessionId;
      lock = session;

      if (session instanceof SQLSessionLock) {
        // clear the native lock's internal lock ID so that it doesn't
        // attempt to update the session row when it's released
        session.session.lockId = session.session.lockExpires = undefined;
      }
    }

    while (!await this.adapter.deleteSession(sessionId, check)) {
      // this should only happen if we're configured for native locks
      // and get passed a bare session ID; it means somebody else
      // has an exclusive lock on the session row
      await sleep(50);
    }

    // release the lock, whether it's native or external
    lock && await lock.release();
  }

  private async readAndLock(sessionId: string, lockMode: 'exclusive'): Promise<SQLSessionInterface>;
  private async readAndLock(sessionId: string, lockMode: 'shared'): Promise<SQLSessionInterface | undefined>;
  private async readAndLock(sessionId: string, lockMode: SQLLockMode): Promise<SQLSessionInterface | undefined> {
    const lockId = lockMode === 'exclusive' ? v4() : undefined;

    const ctx = await this.adapter.createContext();
    await this.adapter.beginTransaction(ctx);

    while (true) {
      // try to fetch & lock an existing session object
      const existing = await this.adapter.getSession(sessionId, lockMode, ctx);

      if (existing) {
        // if the existing session has a lock ID, somebody else has an exclusive lock,
        // so we need to wait a bit and try again
        if (existing.lockId) {
          await this.adapter.commit(ctx);
          await sleep(50);
          await this.adapter.beginTransaction(ctx);
          continue;
        }

        // at this point an existing session has been found and locked at the database
        // level; if we only wanted a shared lock, this is all we need to do,
        // but if we want an exclusive lock, we need to write the lock ID:
        if (lockId) {
          existing.lockId = lockId;
          await this.adapter.persistSessionData(sessionId, { lockId }, 'update', ctx);
        }

        // this will release all database-level locks on the session row, but that's okay,
        // for a shared lock the data has already been read, and an exclusive
        // lock is demarcated by the lock ID
        await this.adapter.commit(ctx);
        await this.adapter.destroyContext(ctx);
        return existing;
      } else if (!lockId) {
        // no existing session was found, and we were only trying for a shared lock,
        // so we can safely say
        await this.adapter.commit(ctx);
        return undefined;
      }

      // no existing session found, and we want one because we need
      // an exclusive lock - let's try and create one...
      const session: SQLSessionInterface = {
        id: sessionId,
        lockId,
      };

      try {
        await this.adapter.persistSessionData(sessionId, { lockId }, 'insert', ctx);
        await this.adapter.commit(ctx);
        await this.adapter.destroyContext(ctx);
        return session;
      } catch (e: any) {
        await this.adapter.rollback(ctx);

        if (this.adapter.isUniqueConstraintViolationException(e)) {
          // if this happens it means someone created & locked a session between
          // the adapter.getSession() and the following adapter.persistSessionData() -
          // basically a race condition - in that case, let's just restart
          // the transaction and try again
          await sleep(50);
          await this.adapter.beginTransaction(ctx);
          continue;
        }

        // otherwise something bad happened, let's abort
        await this.adapter.destroyContext(ctx);
        throw e;
      }
    }
  }

  private async release(session: SQLSessionInterface): Promise<void> {
    // this should be atomic at the db level, no need to wrap in a transaction
    if (session.lockId) {
      await this.adapter.eraseLockData(session.id, session.lockId);
      session.lockId = session.lockExpires = undefined;
    }
  }
}
