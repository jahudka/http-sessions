# The `LockManagerInterface` interface

The `LockManagerInterface` interface defines methods through which
session ID locking is achieved.

## Methods

### `acquire()`

```typescript
acquire(sessionId: string): Promise<SessionLock>;
```

This method should attempt to acquire an exclusive lock on the given session ID.
It should resolve with a `SessionLock` instance representing and controlling
the lock. If the lock cannot be obtained immediately, the method should wait
until the lock can be obtained.
