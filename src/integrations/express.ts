import type { CookieOptions, Request, RequestHandler } from 'express';
import type { Session } from '../session';

export type ExpressSessionOptions = {
  sidCookieName?: string;
  transientCookieName?: string;
  cookieOptions?: ExpressSessionCookieOptions;
};

export type ExpressSessionCookieOptions
  = Omit<CookieOptions, 'expires' | 'maxAge' | 'encode' | 'signed'>;

const cookieDefaults: ExpressSessionCookieOptions = {
  path: '/',
  httpOnly: true,
  sameSite: 'lax',
};

export function expressHttpSessions(
  session: Session,
  options: ExpressSessionOptions = {},
): RequestHandler {
  const sidCookie = options.sidCookieName ?? 'SID';
  const transCookie = options.transientCookieName ?? 'ST';
  const cookieOptions = { ...cookieDefaults, ...(options.cookieOptions || {}) };

  return async (req, res, next) => {
    const cookies = req.cookies || extractCookies(req);

    await session.init(cookies[sidCookie], !!cookies[transCookie], async () => {
      patchResponse(
        session,
        res,
        sidCookie,
        transCookie,
        cookieOptions,
        !!(cookies[sidCookie] || cookies[transCookie]),
      );

      next();
    });
  };
}

function extractCookies(req: Request): Record<string, string> {
  const cookies: Record<string, string> = {};
  const pairs = (req.headers.cookie ?? '').trim().split(/\s*;\s*/g);

  for (const pair of pairs) {
    const m = pair.match(/^([^=]+)=(.*)$/);

    if (m) {
      cookies[m[1]] = decodeURIComponent(m[2].replace(/^"(.*)"$/, '$1'));
    }
  }

  return cookies;
}

function patchResponse(
  session: Session,
  response: any,
  sidCookie: string,
  transCookie: string,
  options?: ExpressSessionCookieOptions,
  clear?: boolean,
): void {
  const end = response.end;
  const _send = response._send;
  let closing: Promise<void> | undefined = undefined;

  const close = () => {
    return closing ??= closeSessionAndSetCookies(response, session, sidCookie, transCookie, options, clear);
  };

  response.end = (...args: any) => {
    close().then(() => end.call(response, ...args));
    return response;
  };

  response._send = (...args: any) => {
    close().then(() => _send.call(response, ...args));
    return true;
  };
}

async function closeSessionAndSetCookies(
  response: any,
  session: Session,
  sidCookie: string,
  transCookie: string,
  options: ExpressSessionCookieOptions = {},
  clear: boolean = false,
): Promise<void> {
  await session.close();

  const id = session.getId();
  const expires = session.getExpiration();

  if (id) {
    if (session.isActive()) {
      response._headerSent = false;
      response._header = null;

      response.cookie(transCookie, '1', options);
      response.cookie(sidCookie, id, {
        ...options,
        expires: expires ? new Date(expires) : undefined,
      });
      response._implicitHeader();
    }
  } else if (clear) {
    response._headerSent = false;
    response._header = null;

    response.clearCookie(sidCookie, options);
    response.clearCookie(transCookie, options);
    response._implicitHeader();
  }
}
