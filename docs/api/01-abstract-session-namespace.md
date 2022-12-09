# The `AbstractSessionNamespace` class

The `AbstractSessionNamespace` class is a common base class for
the `Session` and `SessionNamespace` classes.

## Type parameters

 - `Values`  
   A map of `string` keys to JSON-serializable values which will be accessible in this namespace.

## Methods

### `isReadable()`

```typescript
isReadable(): boolean
```

This method returns `true` if the namespace is readable, that
is, `session.start()` has been called.

### `isWritable()`

```typescript
isWritable(): boolean
```

This method returns `true` if the namespace is writable, that
is, `session.start()` has been called and `session.close()` has not.

### `get()`

```typescript
get<K extends keyof Values>(key: K): Values[K] | undefined
get<K extends keyof Values>(key: K, factory: Values[K] | (() => Values[K])): Values[K]
```

This method returns the data stored under the key `K`. If the second argument is provided
and the key is not set in the namespace, the key is created using the second argument
as its value; if the second argument is a function, its return value is used instead.

### `set()`

```typescript
set<K extends keyof Values>(key: K, value: Values[K], expires?: ExpirationOptions | Date | string | number): void
```

This method stores the provided `value` under the key `K`, optionally setting its expiration.
Note that passing `undefined` as expiration explicitly will clear any previously set
expiration for the key `K`. To leave previous expiration untouched omit the argument entirely.

### `unset()`

```typescript
unset<K extends keyof Values>(key: K): void
```

This method will delete any data associated with the key `K` from the namespace.

### `setExpiration()`

```typescript
setExpiration(expiration: ExpirationOptions | Date | string | number | undefined): void
setExpiration<K extends keyof Values>(key: K, expiration: ExpirationOptions | Date | string | number | undefined): void
```

Calling this method with a single argument will set or clear expiration for the entire namespace.
Calling the method with two arguments will set or clear expiration for the specified key `K`.
