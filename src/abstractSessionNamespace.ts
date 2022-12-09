import type { ExpirationOptions, Key, NamespaceData, ValueMap } from './types';
import { setExpirationMetadata } from './utils';

export abstract class AbstractSessionNamespace<Values extends ValueMap> {
  public abstract isReadable(): boolean;
  public abstract isWritable(): boolean;
  protected abstract get data(): NamespaceData<Values>;

  public get<K extends Key<Values>>(key: K): Values[K] | undefined;
  public get<K extends Key<Values>>(key: K, factory: Values[K] | (() => Values[K])): Values[K];
  public get<K extends Key<Values>>(
    key: K,
    factory?: Values[K] | (() => Values[K]),
  ): Values[K] | undefined {
    this.assertReadable();

    if (!this.data.values[key]) {
      this.data.values[key] = {
        value: typeof factory === 'function' ? factory() : factory!,
      };
    }

    return this.data.values[key].value;
  }

  public set<K extends Key<Values>>(
    key: K,
    value: Values[K],
    expires?: ExpirationOptions | Date | string | number,
  ): void {
    this.assertWritable();

    if (this.data.values[key]) {
      this.data.values[key].value = value;
    } else {
      this.data.values[key] = { value };
    }

    if (arguments.length > 2) {
      this.setExpiration(key, expires);
    }
  }

  public unset<K extends Key<Values>>(key: K): void {
    this.assertWritable();
    delete this.data.values[key];
  }

  public setExpiration(
    expiration: ExpirationOptions | Date | string | number | undefined,
  ): void;
  public setExpiration<K extends Key<Values>>(
    key: K,
    expiration: ExpirationOptions | Date | string | number | undefined,
  ): void;
  public setExpiration(
    expirationOrKey: ExpirationOptions | Date | string | number | undefined,
    maybeExpiration?: ExpirationOptions | Date | string | number,
  ): void {
    this.assertWritable();

    const [key, expiration]
      = arguments.length > 1
      ? [expirationOrKey as Key<Values>, maybeExpiration]
      : [undefined, expirationOrKey]

    if (key) {
      if (this.data.values[key]) {
        setExpirationMetadata(this.data.values[key], expiration);
      }
    } else {
      setExpirationMetadata(this.data, expiration);
    }
  }

  protected assertReadable(): void {
    if (!this.isReadable()) {
      throw new Error('Session has not been started');
    }
  }

  protected assertWritable(): void {
    if (!this.isWritable()) {
      throw new Error('Session has been closed');
    }
  }
}
