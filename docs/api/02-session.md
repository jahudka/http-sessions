# The `Session` class

## Type parameters

 - `Namespaces`  
   A map of `string` keys to maps of namespace data
 - `Values`
   A map of `string` keys to JSON-serializable values which will be accessible
   on the session instance

## Constructor

```typescript
type NamespaceMap = {
  // someNamespace: {
  //   someKey: number, ...
  // }, ...
};

type SessionValues = {
  // someKey: number, ...
};

new Session<NamespaceMap, SessionValues>(storage: StorageInterface, options?: SessionOptions)
```

| Argument                    | Type                          | Description                                                    |
|-----------------------------|-------------------------------|----------------------------------------------------------------|
| `storage`                   | `StorageInterface`            | see [Storages] for more info                                   |
| `options`                   | `SessionOptions`              | optional                                                       |
| `options.autoStart`         | `boolean`                     | optional; set to `true` to start the session for every request |
| `options.defaultExpiration` | `ExpirationOptions`, `number` | optional; default expiration for the entire session            |

## Inherited methods

From [`AbstractSessionNamespace`](01-abstract-session-namespace.md):
 - [`isReadable()`](01-abstract-session-namespace.md#isreadable)
 - [`isWriable()`](01-abstract-session-namespace.md#iswritable)
 - [`get()`](01-abstract-session-namespace.md#get)
 - [`set()`](01-abstract-session-namespace.md#set)
 - [`unset()`](01-abstract-session-namespace.md#unset)
 - [`setExpiration()`](01-abstract-session-namespace.md#setexpiration)

## Own methods

### `init()`

```typescript
init<R>(cb: () => R): Promise<R>
init<R>(id: string | undefined, cb: () => R): Promise<R>
init<R>(id: string | undefined, expireTransient: boolean, cb: () => R): Promise<R>
```

This method initialises the session and runs the provided callback inside the session context.
It must be called at the start of each request and any session access must happen within
the callback or an asynchronous call made within the callback.

### `isInitialised()`

```typescript
isInitialised(): boolean
```

This method returns `true` if the current execution context has been correctly initialised
using the [`init()`](#init) method.

### `exists()`

```typescript
exists(): boolean
```

This method returns `true` if a session ID exists. You can use it to conditionally start
a session only if a session cookie is present.

### `isActive()`

```typescript
isActive(): boolean
```

This method returns `true` if the session is active, i.e. it has been started, but not
yet destroyed.

### `start()`

```typescript
start(readonly: boolean = false): Promise<void>
```

This method starts a session, if it wasn't previously started. If a session ID exists
at this point, the session data is loaded from storage and unless `readonly` is `true`,
the session is locked until closed. If no expiration has been previously set for the
session and a default expiration was defined using the `Session` constructor options,
the session expiration is set to the specified default.

### `release()`

```typescript
release(): Promise<void>
```

This method releases a previously acquired session lock, if one exists, without writing
any session data to the storage. It can be useful when you started a session in read-write
mode and you want to drop to readonly mode knowing that you haven't made any changes
which would need to be persisted; also it can be handy as a last resort when handling
uncaught errors in a catch-all error handler, so that the session doesn't get corrupted
and doesn't stay locked (which would cause a deadlock).

### `close()`

```typescript
close(): Promise<void>
```

This method closes the current session, if it has been previously started. If no session ID
is defined at this point, a new unique session ID is allocated. The session data is persisted
into storage and the session lock is released. After calling this method, the session data
will be read-only.

### `destroy()`

```typescript
destroy(): Promise<void>
```

This method destroys the current session, deleting all the session data. If a session ID
is defined at this point, the session data will be purged from storage and the session lock
will be released, if it has been previously acquired. Note that you don't need to start
the session prior to destroying it. A new session with a new unique session ID can be started
by calling [`start()`](#start) any time after a call to `destroy()` resolves.

### `getId()`

```typescript
getId(): string | undefined
```

Returns the current session ID, if one exists.

### `getExpiration()`

```typescript
getExpiration(): number | undefined
```

Returns the session expiration as a number of milliseconds since the UNIX epoch.
Returns `0` if the session is set to expire when the browser window closes.
Returns `undefined` if the session is set to never expire.

### `regenerateId()`

```typescript
regenerateId(): Promise<void>
```

Generates a new unique ID for the current session. The session must be previously
started. You should call this method every time a user logs in or out to prevent
session fixation.

### `getNamespace()`

```typescript
getNamespace<K extends keyof Namespaces>(name: K): SessionNamespace<Namespaces[K]>
```

Returns an instance of [`SessionNamespace`](03-session-namespace.md) representing data
in the specified namespace `K`. Note that this method can be safely called outside
an initialised session execution context, and the returned `SessionNamespace` instance
can then be used _within_ such a context as you'd intuitively expect; meaning that
you can safely inject instances of specific namespaces into services which don't need
access to the entire session.


[Storages]: ../theoretical-reading/04-storages.md
