# Node HTTP Sessions

This is a TypeScript-first implementation of HTTP sessions
similar to what one would expect when coming from a modern PHP
framework. It features sliding expiration and namespaces, as well
as integrations both with various HTTP server abstractions
and storage backends.

## Installation

```shell
npm install --save http-sessions
```

## [Full documentation](docs/readme.md)

## Quick start

```typescript
import { Session, MemoizedStorage } from 'http-sessions';
import { expressHttpSessions } from 'http-sessions/integrations/express';
import * as express from 'express';

const app = express();
const session = new Session(new MemoizedStorage(), {
  defaultExpiration: 7 * 24 * 3600, // expire the session in 1 week by default
});

app.use(expressHttpSessions(session));

app.get('/status', async (req, res) => {
  if (!session.exists()) {
    res.type('text').send('not logged in');
    return;
  }

  await session.start(true); // start in readonly mode
  const user = session.get('user');
  res.type('text').send(user ? `logged in user: ${user.name}` : 'not logged in');
});

app.post('/login', async (req, res) => {
  await session.start(); // start in read-write mode

  const user = await login(req.body.email, req.body.password);
  session.set('user', user, {
    expires: 3600, // expire in 1 hour
    sliding: true, // renew the 1-hour expiration whenever the session is started
    until: 24 * 3600, // but at most for 24 hours
  });
  
  // **always** do this when the user logs in or out to help prevent session fixation attacks:
  await session.regenerateId();
  
  res.redirect('/status');
});

app.post('/logout', async (req, res) => {
  await session.destroy(); // no need to call session.start() before session.destroy()
  res.redirect('/status');
});
```
