export type MessageId = number;
export type LockId = number;
export type SessionId = string;

export type StorageDaemonMessage =
  | [MessageId, 'lock', SessionId]
  | [MessageId, 'read', SessionId | LockId]
  | [MessageId, 'write', SessionId | LockId, Buffer, number | undefined, boolean | undefined]
  | [MessageId, 'purge', SessionId | LockId]
  | [MessageId, 'release', LockId];

export function isStorageDaemonMessage(value: any): value is StorageDaemonMessage {
  return Array.isArray(value)
    && typeof value[0] === 'number'
    && typeof value[1] === 'string'
    && /^(lock|read|write|purge|release)$/.test(value[1]);
}

export type LockDaemonMessage =
  | [MessageId, 'acquire', SessionId]
  | [MessageId, 'release', LockId];

export function isLockDaemonMessage(value: any): value is LockDaemonMessage {
  return Array.isArray(value)
    && typeof value[0] === 'number'
    && typeof value[1] === 'string'
    && /^(acquire|release)$/.test(value[1]);
}

export type DaemonResponse = [MessageId, string | null, any];

export function isDaemonResponse(value: any): value is DaemonResponse {
  return Array.isArray(value) && typeof value[0] === 'number';
}
