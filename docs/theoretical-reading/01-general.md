# The `Session` object

The package exposes a `Session` class which you are supposed to
instantiate. You can then pass this instance to your request handlers
and middlewares; it will internally keep track of which actual
session belongs to which execution context by means of an internal
`AsyncLocalStorage` instance.

## Starting a Session

The `Session` class has a public `init()` method which needs to be
called on each request; this method is used to pass the session ID
to the `Session` and to initialise the internal `AsyncLocalStorage`.
Usually you don't need to call this method manually as it's done
by the integrations. If you set the `autoStart` option to `true`
when creating the `Session` instance, the `init()` method will
_always_ start a session; otherwise you need to call `session.start()`
manually prior to accessing the session data in any way in your
request handlers.

## Concurrent requests and session locking

To prevent race conditions when handling concurrent requests with the
same session ID, starting a session with a defined session ID will
acquire an exclusive lock on that ID. This could create a bottleneck,
especially with `autoStart: true`. Sessions are automatically closed
and their data persisted into storage when a response is sent, and
the exclusive lock is released then; but for many requests this will
be far later than actually needed: often your handlers will only need
_read-only_ access to the session data as it was at the time the session
was started (e.g. to check if a user has previously logged in). You can
start a session in read-only mode directly by passing `true` as the first
argument to `session.start()`; this should be the fastest option under
most circumstances. Alternatively, closing a session will persist the
session data into storage and release the exclusive lock, but it will keep
the session data in memory and make the session read-only for the remainder
of the request.

## Virtual sessions

When no session ID is present in a request cookie and a session is started,
the session is considered "virtual" until it is closed: it has no session ID.
If you destroy such a session before it is closed, the session storage
will not be touched at all, meaning that you can use the session to store
data which will be available later during the handling of the same request.
This can be leveraged e.g. in dual-authentication apps, where regular users
authenticate once using e.g. password authentication and other clients
(e.g. scripts connecting to your API) need to provide authentication credentials
for each request (e.g. using a token in the `Authorization` header) -
obviously using cookies for such clients and persisting the session data
doesn't make sense - but if you take care to destroy sessions for such
clients prior to sending a response, you can build a common authentication
and permission checking mechanism using sessions for both cases.

Next: [Namespaces and storing data](02-namespaces-and-storing-data.md)
