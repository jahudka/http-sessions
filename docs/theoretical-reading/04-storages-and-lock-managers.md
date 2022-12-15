# Storages and lock managers

Previous: [Expiration](03-expiration.md)

Sessions typically need to be persisted in a storage layer in order
to make them available across multiple application workers and to
preserve session states across application restarts. There are a couple
of built-in storage mechanisms in HTTP Sessions and you can easily
implement your own. Storages implement the `StorageInterface` interface.

Storages are responsible for proper management of any acquired session locks.
The locks themselves are acquired by means of a separate `LockManagerInterface`
implementation, which the `StorageInterface` implementation will usually
use internally. Typically, storage implementations will also provide their own
native lock manager implementation; nevertheless, it is usually possible
to combine storage implementations with different lock managers, which
might in some cases be beneficial.

## `DummyStorage`

The `DummyStorage` class doesn't store anything, doesn't ensure exclusivity
of acquired locks and generally just doesn't do much, but it can be useful
in tests.

## `MemoizedStorage` and `MemoizedLockManager`

The `MemoizedStorage` class is an implementation which wraps another storage
implementation and caches the session data in memory. It can be used to improve
performance of other storage mechanisms, or in combination with the `DummyStorage`
class in a local development environment (this combination will result in sessions
being stored only in memory, so no persistence across application restarts and no
multi-worker capability, but that should be totally okay in some local development
scenarios).

The `MemoizedStorage` class internally acquires an exclusive lock through the
wrapped storage instance on any session ID it touches and keeps that exclusive lock
until the session expires or is destroyed. Outside access to the storage is
brokered using an internal `MemoizedLockManager` instance, which only keeps locks
in memory.

## `FileStorage` and `FileLockManager`

The `FileStorage` class stores sessions in JSON or binary files within a configured
storage directory. It should provide decent enough performance for smaller
applications, especially if the storage directory is located on a `tmpfs`filesystem.
The `FileLockManager` class uses `proper-lockfile` internally to manage locks on
the session files; if you want to use it, you must install the `proper-lockfile`
package in your project.

## `DaemonStorage` and `DaemonLockManager`

The `DaemonStorage` and `DaemonLockManager` classes allow one to separate the
session backend from the application workers. They're a "poor man's Memcached",
of sorts - if you want fast multi-worker sessions without the hassle of setting
up and configuring Memcached or Redis or something similar, these implementations
might come in handy.

To use them, you must run the HTTP Sessions daemon separately from your application:

```shell
# For use with DaemonStorage:
npx http-sessions-daemon <listen on> [<storage dir>]

# For use with DaemonLockManager:
npx http-sessions-daemon --lock <listen on>
```

The `<listen on>` argument is either a port number (which will only be bound on
the loopback interface), or the path to a UNIX socket. In storage mode, you can
also specify the path to a storage directory to preserve session data across
daemon restarts. Relative paths are resolved from the current working directory.
The daemon also integrates with [`nodesockd`], although it should always be started
in single-worker mode.

In your application you can then construct an instance of `DaemonStorage` or
`DaemonLockManager`, passing in the same port number or socket path as the first
constructor argument (watch out for path resolution with UNIX sockets though,
within the application it's up to you to resolve the full path).

### Important: `DaemonStorage` and `DaemonLockManager` are experimental!

These implementations, like much of HTTP Sessions, are under heavy development
right now and therefore somewhat unstable. Don't use them in production! If your
requests suddenly start hanging, restart both your application and the daemon!
You've been warned.

[`nodesockd`]: https://github.com/cdn77/node-socket-daemon
