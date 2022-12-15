import { deserialize, serialize } from 'v8';
import type { ValueMap } from '../../types';
import type { SessionLock } from '../sessionLock';
import type { StorageInterface } from '../storageInterface';
import { AbstractDaemonClient } from './abstractDaemonClient';

export class DaemonStorage extends AbstractDaemonClient implements StorageInterface {
  public async lock(id: string): Promise<SessionLock> {
    const lockId = await this.call('lock', id);
    return this.saveLock(id, lockId);
  }

  public async read(session: SessionLock | string): Promise<ValueMap | undefined> {
    const data = await this.call('read', typeof session === 'string' ? session : this.getLockId(session));
    return data && deserialize(data);
  }

  public async write(session: SessionLock | string, data: ValueMap, expires?: number, release?: boolean): Promise<void> {
    await this.call('write', typeof session === 'string' ? session : this.getLockId(session), serialize(data), expires, release);
    release && typeof session !== 'string' && await session.release();
  }

  public async purge(session: SessionLock | string): Promise<void> {
    await this.call('purge', typeof session === 'string' ? session : this.getLockId(session));
    typeof session !== 'string' && await session.release();
  }
}
