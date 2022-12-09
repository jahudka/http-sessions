# The `StorageInterface` interface

The `StorageInterface` interface must be implemented by session data storages.

## Methods

### `allocateAndLockId()`

```typescript
allocateAndLockId(previous?: string): Promise<string>
```

This method should obtain a new unique session ID
and acquire an exclusive lock on it. If a previous
session ID is provided, any data associated with it
should be moved to the new ID and if there is a lock
acquired for the previous ID, it should be released.

### `lockAndRead()`

```typescript
lockAndRead(id: string): Promise<Record<string, any> | undefined>
```

This method should acquire an exclusive lock on the session ID
and then load and return the associated session data.

### `writeAndUnlock()`

```typescript
writeAndUnlock(id: string, data: ValueMap, expires?: number): Promise<void> | void
```

This method should persist the session data, optionally scheduling
the data to be purged upon expiration, and release the exclusive lock
on the session ID.

### `purge()`

```typescript
purge(id: string): Promise<void> | void
```

This method should purge any data related to the provided session ID
and release the exclusive lock on the session ID, if one exists.
