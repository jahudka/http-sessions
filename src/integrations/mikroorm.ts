import { LockMode, UniqueConstraintViolationException } from '@mikro-orm/core';
import type { EntityManager } from '@mikro-orm/knex';
import type {
  SQLAdapterInterface,
  SQLLockMode,
  SQLPersistMode,
  SQLSessionInterface,
} from '../storages';

type Ctx = {
  em: EntityManager;
};

export class MikroORMAdapter implements SQLAdapterInterface<Ctx> {
  private readonly em: EntityManager;
  private readonly entityName: string;

  public constructor(em: EntityManager, entityName: string) {
    this.em = em;
    this.entityName = entityName;
  }

  public async init(): Promise<void> {}

  public async createContext(): Promise<Ctx> {
    const em = await this.em.fork();
    return { em };
  }

  public destroyContext(ctx: Ctx): void {
    ctx.em.clear();
  }

  public async beginTransaction(ctx: Ctx): Promise<void> {
    await ctx.em.begin({ ctx: ctx.em.getTransactionContext() });
  }

  public async commit(ctx: Ctx): Promise<void> {
    await ctx.em.commit();
  }

  public async rollback(ctx: Ctx): Promise<void> {
    await ctx.em.rollback();
  }

  public async eraseLockData(id: string, lockId: string): Promise<void> {
    await this.em.nativeUpdate<SQLSessionInterface>(
      this.entityName,
      { id, lockId },
      { lockId: undefined, lockExpires: undefined },
    );
  }

  public async getSession(id: string, lock?: SQLLockMode, ctx?: Ctx): Promise<SQLSessionInterface | undefined> {
    const em = ctx ? ctx.em : this.em;
    const qb = em
      .createQueryBuilder<SQLSessionInterface>(this.entityName)
      .where({ id });

    if (lock) {
      qb.setLockMode(lock === 'exclusive' ? LockMode.PESSIMISTIC_WRITE : LockMode.PESSIMISTIC_READ);
    }

    return (await qb.getSingleResult()) || undefined;
  }

  public async persistSessionData(
    id: string,
    data: Omit<SQLSessionInterface, 'id'>,
    mode?: SQLPersistMode,
    ctx?: Ctx,
  ): Promise<void> {
    const em = ctx ? ctx.em : this.em;

    switch (mode) {
      case 'insert':
        await em.nativeInsert<SQLSessionInterface>(this.entityName, { id, ...data });
        break;
      case 'update':
        await em.nativeUpdate<SQLSessionInterface>(this.entityName, { id }, data);
        break;
      default:
        await em.createQueryBuilder<SQLSessionInterface>(this.entityName)
          .insert({ id, ...data })
          .onConflict('id')
          .merge(data)
          .execute('run');
        break;
    }
  }

  public async deleteSession(id: string, checkLock: boolean = false): Promise<boolean> {
    const criteria: SQLSessionInterface = checkLock ? { id, lockId: undefined } : { id };
    const deleted = await this.em.nativeDelete<SQLSessionInterface>(this.entityName, criteria);
    return !checkLock || deleted > 0;
  }

  public isUniqueConstraintViolationException(e: any): boolean {
    return e instanceof UniqueConstraintViolationException;
  }
}
