# Expiration

Previous: [Namespaces and storing data](02-namespaces-and-storing-data.md)

> ## Session v. Session
> 
> The term "session" and "session cookie" means different things
> depending on the context one uses them in. Most backend developers
> I know use the term "session" to describe some kind of persistent
> storage associated with a given user and / or browser for a period
> of time, and the term "session cookie" to describe an HTTP cookie
> often employed to facilitate the association between the browser
> and the persistent data.
> 
> But in the context of cookies themselves the term "session cookie"
> is used to describe cookies which are set to expire when the user
> closes the browser window, thus ending a "browser session". In order to
> disambiguate between the two, this project establishes the following
> convention:
> 
> - The term "session" will always mean "persistent storage associated
>   with a given user and / or browser for a given period of time".
> - The term "session cookie" will always mean "HTTP cookie employed
>   to facilitate the association between the browser and the persistent
>   data".
> - Any cookies or data set to expire when the user closes the browser
>   window will be called _transient_ cookies, _transient_ data and so on.

## What can be given an expiration date?

- The `Session` object, and thus the entire session. The HTTP cookie
  will have expiration set based on the expiration of the session.
- Any session namespaces, and thus all values within them.
- Any individual values in the session or any of its namespaces.

Expirations are always set locally on the desired object and they are
**not** propagated to any containing objects, meaning that if you
have a value called `foo` in a namespace called `bar` and you set
the expiration of `foo` to 10 years and `bar` to 1 year, `bar` will
expire in 1 year and `foo` will be lost along with it.

## How can expiration be specified?

Expiration can either be specified as a `string`, which will be simply
converted to `new Date(expiration)`; or directly as a `Date` object;
or as a `number`, which will be interpreted as "seconds from now".
Expiration is always resolved to a fixed timestamp at the moment it is
set. You can also use an `ExpirationOptions` object; this allows you
to set up _sliding expiration_:
- Initially, expiration will be set to `options.expires` seconds from now.
- Each time the session is loaded from storage, any non-expired data
  with a sliding expiration will be set to expire `options.expires` seconds
  from that moment.
- You can also set a "latest expiration date" using `options.until`, which
  will limit the sliding expiration to the specified time.

Expiration, as well as the latest expiration date for sliding expiration, can
be also set to `undefined`, which means no expiration / unlimited, or to `0`,
which means _transient_ expiration ("expire when the browser window closes").
For sliding expiration this means that the item will expire either at the
specified expiration offset if not accessed sooner, or when browser window
closes, _whichever comes first_. This can be useful to remember e.g. that
a user has validated their credentials a few minutes ago and that the app
doesn't need to ask for them again for some non-critical operations which
would otherwise require the user to re-validate their credentials.

Remember, the expiration _setting_ is not propagated between the session
and its namespaces or any of the stored data - if you set the session expiration
to e.g. one week and then store some data without specifying expiration for it,
the data itself will have _no_ expiration, meaning it will expire only when
the session itself expires. It follows that if you _do_ set a specific expiration
for some data and then set a longer expiration for the session itself, the data
will still expire based on the explicit setting, rather than when the session
expires.

Next: [Storages](04-storages.md)
