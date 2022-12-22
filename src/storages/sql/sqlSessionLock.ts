import { SessionLock } from '../sessionLock';
import type { SQLSessionInterface } from './sqlSessionInterface';

export class SQLSessionLock extends SessionLock {
  public readonly session: SQLSessionInterface;

  public constructor(session: SQLSessionInterface, release: () => (Promise<void> | void)) {
    super(session.id, release);
    this.session = session;
  }
}
