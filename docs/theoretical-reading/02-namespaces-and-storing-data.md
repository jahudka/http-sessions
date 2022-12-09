# Namespaces and storing data

Previous: [The Session object](01-the-session-object.md)

## Namespaces

The `Session` object can directly store values, which can be useful
for general, globally-available data like the user ID; but you can
also use _session namespaces_ to separate related bundles of data
which don't need to be globally available. A `SessionNamespace`
has the same API for accessing values as the `Session` object;
it also shares the same API for setting expiration for both
individual values and the entire namespace, much like the `Session`
object can set expiration for individual global values as well as
the entire session. A namespace can also be destroyed without
destroying the entire session.

A `SessionNamespace` instance can be obtained using `session.getNamespace()`
and it can be passed around throughout your application same as the full
`Session` object; it internally accesses the namespace data through a
reference to the `Session` object and therefore has access to the same
`AsyncLocalStorage`-powered context as the full session. Multiple calls to
`session.getNamespace('foo')` will always return the same `SessionNamespace`
instance.

## Types of data that can be stored in the session

Session data needs to be serialised when it is persisted into storage
and later deserialised when the session is loaded. In order to ensure
that you always get the same thing when you retrieve data stored in
the session, any data stored in the session must be JSON-serializable,
that is, it must either be a scalar value, or an object with string
keys and JSON-serializable values, or an array of JSON-serializable
values. So you shouldn't store, e.g., entities from an ORM directly -
rather, you should create a plain object containing the relevant
data from the entity and store that.

Next: [Expiration](03-expiration.md)
