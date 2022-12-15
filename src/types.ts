import type { SessionLock } from './storages';

export type ToPromise<T> = T extends Promise<any> ? T : Promise<T>;

export type Key<V> = Exclude<keyof V, number | symbol>;

export type Value =
  | Value[]
  | { [key: string]: Value }
  | string | number | boolean | null | undefined;

export type ValueMap<T extends Value = Value> = {
  [key: string]: T;
};

export type ExpirationOptions = {
  expires: number;
  sliding?: boolean;
  until?: Date | string | number;
};

export type ExpirationMeta = {
  expires?: number;
  window?: number;
  until?: number;
};

export type ValueData<T extends Value = Value> = ExpirationMeta & {
  value: T;
};

export type NamespaceData<Values extends ValueMap = ValueMap> = ExpirationMeta & {
  values: {
    [K in Key<Values>]: ValueData<Values[K]>;
  };
};

export type SessionData<
  Namespaces extends ValueMap<ValueMap> = ValueMap<ValueMap>,
  Values extends ValueMap = ValueMap,
> = NamespaceData<Values> & {
  namespaces: {
    [K in Key<Namespaces>]: NamespaceData<Namespaces[K]>;
  };
};

export type SessionState<
  Namespaces extends ValueMap<ValueMap> = ValueMap<ValueMap>,
  Values extends ValueMap = ValueMap,
> = {
  id?: string;
  mode: 'inactive' | 'readonly' | 'read-write';
  lock?: SessionLock;
  expireTransient?: boolean;
  data?: SessionData<Namespaces, Values>;
};

export type SessionOptions = {
  autoStart?: boolean;
  defaultExpiration?: ExpirationOptions | number;
};
