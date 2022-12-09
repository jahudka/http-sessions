import { AsyncLocalStorage } from 'async_hooks';
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

    const [id, expireTransient, cb]: [string | undefined, boolean, () => any] =
      c0 ? [a0, b0, c0] :
      b0 ? [a0, false, b0] :
      [undefined, false, a0];

    return this.context.run({
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

  public isReadable(): boolean {
    return this.state.active !== undefined;
  }

  public isWritable(): boolean {
    return this.state.active === true;
  }

  public async start(): Promise<void> {
    if (this.state.active) {
      return;
    }

    this.state.active = true;

    if (this.state.id) {
      const data = await this.storage.lockAndRead(this.state.id);

      if (data) {
        this.state.data = cleanupExpiredData(
          data as SessionData<Namespaces, Values>,
          this.state.expireTransient,
        );

        if (!this.state.data) {
          await this.storage.purge(this.state.id);
          this.state.id = await this.storage.allocateAndLockId();
        }
      }
    }

    if (this.data.expires === undefined && this.options.defaultExpiration !== undefined) {
      this.setExpiration(this.options.defaultExpiration);
    }
  }

  public async close(): Promise<void> {
    if (!this.state.active) {
      return;
    }

    this.state.active = false;

    if (!this.state.id) {
      this.state.id = await this.storage.allocateAndLockId();
    }

    await this.storage.writeAndUnlock(this.state.id, this.data, this.data.expires || undefined);
  }

  public async destroy(): Promise<void> {
    delete this.state.active;
    delete this.state.data;
    delete this.state.expireTransient;

    if (this.state.id) {
      await this.storage.purge(this.state.id);
      delete this.state.id;
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
    this.state.id = await this.storage.allocateAndLockId(this.state.id);
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
