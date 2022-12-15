import type { ValueMap } from '../types';
import { SessionLock } from './sessionLock';
import type { StorageInterface } from './storageInterface';

export class DummyStorage implements StorageInterface {
  public async lock(sessionId: string): Promise<SessionLock> {
    return new SessionLock(sessionId, () => {});
  }

  public async read(): Promise<ValueMap | undefined> {
    return undefined;
  }

  public async write(session: SessionLock | string, data: ValueMap, expires?: number, release?: boolean): Promise<void> {
    if (typeof session !== 'string' && release) {
      await session.release();
    }
  }

  public async purge(session: SessionLock | string): Promise<void> {
    typeof session !== 'string' && await session.release();
  }
}
