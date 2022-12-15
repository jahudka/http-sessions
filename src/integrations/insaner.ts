import type { CookieOptions, HttpServer } from 'insaner';
import type { Session } from '../session';

export type InsanerSessionOptions = {
  sidCookieName?: string;
  transientCookieName?: string;
  cookieOptions?: InsanerCookieOptions;
};

export type InsanerCookieOptions = Omit<CookieOptions, 'expires' | 'maxAge'>;

const cookieDefaults: InsanerCookieOptions = {
  path: '/',
  httpOnly: true,
  sameSite: 'lax',
};

export function installInsanerSessions(
  server: HttpServer,
  session: Session,
  options: InsanerSessionOptions = {},
): void {
  const sidCookie = options.sidCookieName ?? 'SID';
  const transCookie = options.transientCookieName ?? 'ST';
  const cookieOptions = { ...cookieDefaults, ...(options.cookieOptions ?? {}) };

  server.registerMiddleware((request, next) => session.init(
    request.cookies[sidCookie],
    !!request.cookies[transCookie],
    next,
  ));

  server.on('response', async (response, request) => {
    await session.close();

    const id = session.getId();
    const expires = session.getExpiration();

    if (id) {
      if (session.isActive()) {
        response.setCookie(transCookie, '1', cookieOptions);
        response.setCookie(sidCookie, id, {
          ...cookieOptions,
          expires,
        });
      }
    } else if (request.cookies[sidCookie] || request.cookies[transCookie]) {
      response.setCookie(sidCookie, '', { ...cookieOptions, expires: 0 });
      response.setCookie(transCookie, '', { ...cookieOptions, expires: 0 });
    }
  });
}
