# Insaner HTTP server integration

## Usage

```typescript
import { Session, MemoizedStorage } from 'http-sessions';
import { installInsanerSessions } from 'http-sessions/integrations/insaner';
import { HttpServer } from 'insaner';

const session = new Session(new MemoizedStorage());
const server = new HttpServer();

installInsanerSessions(server, session, {
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
  },
});
```

## Available options

| Option                   | Type                               | Default value | Description                                                                                                                                                                    |
|--------------------------|------------------------------------|---------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `sidCookieName`          | `string`                           | `SID`         | The name of the cookie in which the session ID is stored                                                                                                                       |
| `transientCookieName`    | `string`                           | `ST`          | The name of the cookie used to signal that the browser window has been closed                                                                                                  |
| `cookieOptions`          | `object`                           | _(none)_      | Cookie options                                                                                                                                                                 |
| `cookieOptions.httpOnly` | `boolean`                          | `true`        | Set to `false` to allow the session cookies to be accessed from client-side JS. **This is dangerous! Don't ever do this unless you are VERY sure you know what you're doing!** |
| `cookieOptions.path`     | `string`                           | `/`           | Set the base path under which the session cookies will be accessible.                                                                                                          |
| `cookieOptions.domain`   | `string`                           | `/`           | Set the cookie domain. Note that _any_ subdomain of the specified domain will also have access to the session cookies; this can be used, but also abused, so take care.        |
| `cookieOptions.secure`   | `boolean`                          | `false`       | Set to `true` when serving your app exclusively over HTTPS.                                                                                                                    |
| `cookieOptions.sameSite` | `boolean`, `lax`, `strict`, `none` | `lax`         | Set the same-site policy for the session cookies.                                                                                                                              |
