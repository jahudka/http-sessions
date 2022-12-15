import type { Socket } from 'net';
import { AbstractSessionDaemon } from './abstractSessionDaemon';
import { StorageClientHandler } from './storageClientHandler';

export class SessionStorageDaemon extends AbstractSessionDaemon {
  private readonly storageDir?: string;

  public constructor(listenOn: number | string, storageDir?: string) {
    super(listenOn);
    this.storageDir = storageDir;
  }

  protected handleConnection(conn: Socket): void {
    new StorageClientHandler(conn, this.storageDir);
  }
}
