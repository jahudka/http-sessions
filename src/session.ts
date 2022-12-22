import { AsyncLocalStorage } from 'async_hooks';
import { v4 } from 'uuid';
import { AbstractSessionNamespace } from './abstractSessionNamespace';
import { SessionNamespace } from './sessionNamespace';
import type { StorageInterface } from './storages';
import type {
  Key,
  NamespaceData,
  SessionData,
  SessionOptions,
  SessionState, ToPromise,
  ValueMap,
} from './types';
import { cleanupExpiredData } from './utils';

export class Session<
  Namespaces extends ValueMap<ValueMap> = ValueMap<ValueMap>,
  Values extends ValueMap = ValueMap,
> extends AbstractSessionNamespace<Values> {
  private readonly storage: StorageInterface;
  private readonly options: SessionOptions;
  private readonly context: AsyncLocalStorage<SessionState<Namespaces, Values>>;
  private readonly namespaces: Record<string, SessionNamespace<any>> = {};

  public constructor(storage: StorageInterface, options: SessionOptions = {}) {
    super();
    this.storage = storage;
    this.options = options;
    this.context = new AsyncLocalStorage();
  }

  public init<R>(cb: () => R): ToPromise<R>;
  public init<R>(id: string | undefined, cb: () => R): ToPromise<R>;
  public init<R>(id: string | undefined, expireTransient: boolean, cb: () => R): ToPromise<R>;
  public init(a0: any, b0?: any, c0?: any): Promise<any> {
    if (this.isInitialised()) {
      throw new Error('Session is already initialised');
    }

    const [rawId, expireTransient, cb]: [string | undefined, boolean, () => any] =
      c0 ? [a0, b0, c0] :
      b0 ? [a0, false, b0] :
      [undefined, false, a0];
    const id = rawId && /^[a-z0-9-._]+$/i.test(rawId) ? rawId : undefined;

    return this.context.run({
      mode: 'inactive',
      id,
      expireTransient,
    }, async () => {
      if (this.options.autoStart) {
        await this.start();
      }

      return cb();
    });
  }

  public isInitialised(): boolean {
    return this.context.getStore() !== undefined;
  }

  public exists(): boolean {
    return this.state.id !== undefined;
  }

  public isActive(): boolean {
    return this.state.mode !== 'inactive';
  }

  public isReadable(): boolean {
    return this.isActive();
  }

  public isWritable(): boolean {
    return this.state.mode === 'read-write';
  }

  public async start(readonly: boolean = false): Promise<void> {
    if (this.state.mode === 'read-write') {
      return;
    }

    this.state.mode = readonly ? 'readonly' : 'read-write';

    if (this.state.id) {
      if (!readonly) {
        this.state.lock = await this.storage.lock(this.state.id);
      }

      try {
        const rawData = await this.storage.read(this.state.lock || this.state.id);
        this.state.data = rawData && cleanupExpiredData(rawData as any, this.state.expireTransient) as any;

        if (!this.state.data) {
          // session expired
          if (rawData) {
            await this.storage.purge(this.state.lock || this.state.id);
          } else if (this.state.lock) {
            await this.state.lock.release();
          }

          delete this.state.id;
          delete this.state.lock;
        }
      } catch (e: any) {
        this.state.mode = 'inactive';
        this.state.lock && await this.state.lock.release();
        delete this.state.id;
        delete this.state.lock;
        delete this.state.data;
        throw e;
      }
    }

    if (!readonly && this.data.expires === undefined && this.options.defaultExpiration !== undefined) {
      this.setExpiration(this.options.defaultExpiration);
    }
  }

  public async release(): Promise<void> {
    if (this.state.mode !== 'read-write') {
      return;
    }

    this.state.mode = 'readonly';

    if (this.state.lock) {
      await this.state.lock.release();
      delete this.state.lock;
    }
  }

  public async close(): Promise<void> {
    if (this.state.mode !== 'read-write') {
      return;
    }

    this.state.mode = 'readonly';

    if (this.state.lock) {
      await this.storage.write(this.state.lock, this.data, this.data.expires || undefined, true);
      delete this.state.lock;
    } else if (!this.state.id) {
      this.state.id = v4();
      await this.storage.write(this.state.id, this.data, this.data.expires || undefined);
    }
  }

  public async destroy(): Promise<void> {
    const lockOrId = this.state.lock || this.state.id;
    this.state.mode = 'inactive';
    delete this.state.id;
    delete this.state.lock;
    delete this.state.data;
    delete this.state.expireTransient;

    if (lockOrId) {
      await this.storage.purge(lockOrId);
    }
  }

  public getId(): string | undefined {
    return this.state.id;
  }

  public getExpiration(): number | undefined {
    return this.state.data?.expires;
  }

  public async regenerateId(): Promise<void> {
    this.assertWritable();
    const previous = this.state.lock!;

    this.state.id = v4();
    this.state.lock = await this.storage.lock(this.state.id);
    await this.storage.purge(previous);
  }

  public getNamespace<K extends Key<Namespaces>>(name: K): SessionNamespace<Namespaces[K]> {
    if (!this.namespaces[name]) {
      this.namespaces[name] = new SessionNamespace(this, name);
    }

    return this.namespaces[name];
  }

  public getNamespaceData<K extends Key<Namespaces>>(name: K): NamespaceData<Namespaces[K]> {
    if (!this.data.namespaces[name]) {
      this.data.namespaces[name] = {
        values: {} as any,
      };
    }

    return this.data.namespaces[name];
  }

  public destroyNamespaceData<K extends Key<Namespaces>>(name: K): void {
    if (this.state.data) {
      delete this.data.namespaces[name];
    }
  }

  protected get data(): SessionData<Namespaces, Values> {
    if (!this.state.data) {
      this.state.data = {
        namespaces: {} as any,
        values: {} as any,
      };
    }

    return this.state.data;
  }

  private get state(): SessionState<Namespaces, Values> {
    const state = this.context.getStore();

    if (!state) {
      throw new Error('Session has not been initialised in this context');
    }

    return state;
  }
}
