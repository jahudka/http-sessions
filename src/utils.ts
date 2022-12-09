import type { ExpirationMeta, ExpirationOptions, SessionData } from './types';

export function normalizeExpiration(
  value: Date | string | number | undefined,
): number | undefined;
export function normalizeExpiration(
  value: ExpirationOptions | Date | string | number,
): ExpirationOptions | number;
export function normalizeExpiration(
  value: ExpirationOptions | Date | string | number | undefined,
): ExpirationOptions | number | undefined;
export function normalizeExpiration(
  value: ExpirationOptions | Date | string | number | undefined,
): ExpirationOptions | number | undefined {
  if (typeof value === 'string') {
    return Date.parse(value);
  } else if (typeof value === 'number') {
    return value > 0 ? Date.now() + value * 1000 : 0;
  } else if (value instanceof Date) {
    return value.getTime();
  } else {
    return value;
  }
}

/**
 * Expiration is set using one of the following:
 *  - `Date` instance: fixed point in time, no sliding
 *  - `string`: converted to `new Date()`
 *  - `number`: if > 0 => seconds from now, otherwise expires when browser window closes
 *  - `ExpirationOptions`:
 *    - `expires`: `number`; seconds from now
 *    - `sliding`: `boolean`; if true, expiration will be postponed to `now + expires` every
 *      time the session is loaded from storage, either indefinitely, or up to `until` if set
 *    - `until`: `Date | string | number`; limit for sliding expiration
 */
export function setExpirationMetadata(
  entry: ExpirationMeta | undefined,
  expiration: ExpirationOptions | Date | string | number | undefined,
): void {
  if (!entry) {
    return;
  } else if (expiration === undefined) {
    entry.expires = entry.window = entry.until = undefined;
    return;
  }

  expiration = normalizeExpiration(expiration);

  if (typeof expiration === 'number') {
    entry.expires = expiration;
    entry.window = entry.until = undefined;
  } else {
    entry.expires = Date.now() + expiration.expires * 1000;

    if (expiration.sliding) {
      entry.window = expiration.expires * 1000;
      entry.until = normalizeExpiration(expiration.until);
    } else {
      entry.window = entry.until = undefined;
    }
  }
}

function isExpired(
  meta: ExpirationMeta,
  now: number,
  expireTransient: boolean = false,
): boolean {
  if (meta.expires === undefined) {
    return false;
  }

  if (meta.expires !== 0 && meta.until !== 0 ? meta.expires <= now : expireTransient) {
    return true;
  } else if (meta.window) {
    meta.expires = meta.until ? Math.min(meta.until, now + meta.window) : (now + meta.window);
  }

  return false;
}

function cleanupExpiredValues(values: Record<string, ExpirationMeta>, now: number, expireTransient: boolean = false): void {
  for (const [key, meta] of Object.entries(values)) {
    if (isExpired(meta, now, expireTransient)) {
      delete values[key];
    }
  }
}

export function cleanupExpiredData<T extends SessionData>(
  data: T,
  expireTransient: boolean = false,
): T | undefined {
  const now = Date.now();

  if (isExpired(data, now, expireTransient)) {
    return undefined;
  }

  cleanupExpiredValues(data.values, now, expireTransient);
  cleanupExpiredValues(data.namespaces, now, expireTransient);

  for (const ns of Object.values(data.namespaces)) {
    cleanupExpiredValues(ns.values, now, expireTransient);
  }

  return data;
}
