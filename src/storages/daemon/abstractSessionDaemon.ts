import type { Server, Socket } from 'net';
import { createServer } from 'net';

export abstract class AbstractSessionDaemon {
  private readonly listenOn: number | string;
  private conn?: Server;

  public constructor(listenOn: number | string) {
    this.listenOn = listenOn;
  }

  protected abstract handleConnection(conn: Socket): Promise<void> | void;

  public async run(): Promise<void> {
    if (this.conn) {
      throw new Error('Daemon is already running');
    }

    const conn = this.conn = createServer();

    conn.on('connection', this.handleConnection.bind(this));

    await new Promise<void>((resolve, reject) => {
      const ready = (): void => {
        cleanup();
        resolve();
      };

      const error = (err: any): void => {
        cleanup();
        reject(err);
      };

      const cleanup = (): void => {
        conn.off('listening', ready);
        conn.off('error', error);
      };

      conn.once('listening', ready);
      conn.once('error', error);

      if (typeof this.listenOn === 'number') {
        conn.listen(this.listenOn, '127.0.0.1');
      } else {
        conn.listen(this.listenOn);
      }
    });
  }

  public async terminate(): Promise<void> {
    const conn = this.conn;

    if (!conn) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      conn.close((err) => {
        err ? reject(err) : resolve();
      });
    });
  }
}
