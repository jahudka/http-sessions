# The `SessionNamespace` class

## Type parameters

- `Values`
  A map of `string` keys to JSON-serializable values which will be accessible
  within this namespace

## Constructor

```typescript
type NamespaceValues = {
  // someKey: number, ...
};

new SessionNamespace<NamespaceValues>(session: Session<any, NamespaceValues>, name: string)
```

You shouldn't call the constructor directly; instead, you should obtain `SessionNamespace` instances
using [`Session.getNamespace()`](02-session.md#getnamespace).


## Inherited methods

From [`AbstractSessionNamespace`](01-abstract-session-namespace.md):
- [`isReadable()`](01-abstract-session-namespace.md#isreadable)
- [`isWriable()`](01-abstract-session-namespace.md#iswritable)
- [`get()`](01-abstract-session-namespace.md#get)
- [`set()`](01-abstract-session-namespace.md#set)
- [`unset()`](01-abstract-session-namespace.md#unset)
- [`setExpiration()`](01-abstract-session-namespace.md#setexpiration)

## Own methods

### `destroy()`

```typescript
destroy(): void
```

Deletes all data associated with this namespace. Note that this will also clear
the namespace expiration, if it was previously set. Unlike [`Session.destroy()`](02-session.md#destroy),
this method is synchronous, so you don't need to `await` it.
