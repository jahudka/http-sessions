import type { Socket } from 'net';
import type { LockManagerInterface } from '../lockManagerInterface';
import { AbstractSessionDaemon } from './abstractSessionDaemon';
import { LockClientHandler } from './lockClientHandler';

export class SessionLockDaemon extends AbstractSessionDaemon {
  private readonly manager?: LockManagerInterface;

  public constructor(listenOn: number | string, manager?: LockManagerInterface) {
    super(listenOn);
    this.manager = manager;
  }

  protected handleConnection(conn: Socket): void {
    new LockClientHandler(conn, this.manager);
  }
}
