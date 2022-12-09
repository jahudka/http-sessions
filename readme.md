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

## [Full documentation](docs/index.md)

## Usage

```typescript
import { Session, InMemoryStorage } from 'http-sessions';
import { expressHttpSessions } from 'http-sessions/integrations/express';
import * as express from 'express';

const app = express();
const session = new Session(new InMemoryStorage(), {
  defaultExpiration: 86400,
});

app.use(expressHttpSessions(session));

app.get('/status', async (req, res) => {
  if (!session.exists()) {
    res.type('text').send('not logged in');
    return;
  }

  await session.start();
  await session.close(); // session is now read-only
  const user = session.get('user');
  res.type('text').send(user ? `logged in user: ${user.name}` : 'not logged in');
});

app.post('/login', async (req, res) => {
  await session.start();
  
  const user = await login(req.body.email, req.body.password);
  session.set('user', user);
  
  // **always** do this when the user logs in to help prevent session fixation attacks:
  await session.regenerateId();
  
  res.redirect('/status');
});

app.post('/logout', async (req, res) => {
  await session.destroy();
  res.redirect('/status');
});
```
