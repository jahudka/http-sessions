import { Socket } from 'net';
import { SessionLock } from '../sessionLock';
import type { IPCValue } from './ipc';
import { Connection } from './ipc';
import { isDaemonResponse } from './types';

const Uint32_max_value = 2 ** 32 - 1;

export abstract class AbstractDaemonClient {
  private readonly connectTo: number | string;
  private readonly messages: Map<number, [(result: any) => void, (error: any) => void]>;
  private readonly locks: Map<SessionLock, number>;
  private conn?: Promise<Connection>;
  private msgId: number = 0;

  public constructor(connectTo: number | string) {
    this.connectTo = connectTo;
    this.messages = new Map();
    this.locks = new Map();
  }

  protected async call(method: string, ...args: any[]): Promise<any> {
    const conn = await this.connect();
    const msgId = this.msgId++;
    const result = new Promise((resolve, reject) => this.messages.set(msgId, [resolve, reject]));

    if (this.msgId >= Uint32_max_value) {
      this.msgId = 0;
    }

    await conn.send(msgId, method, ...args);
    return result.finally(() => this.messages.delete(msgId));
  }

  protected getLockId(lock: SessionLock): number {
    const id = this.locks.get(lock);

    if (id === undefined) {
      throw new Error('Invalid lock');
    }

    return id;
  }

  protected saveLock(sessionId: string, lockId: number): SessionLock {
    const lock = new SessionLock(sessionId, async () => {
      await this.call('release', lockId);
      this.locks.delete(lock);
    });

    this.locks.set(lock, lockId);
    return lock;
  }

  private async connect(): Promise<Connection> {
    return this.conn ??= new Promise((resolve, reject) => {
      const sock = new Socket();

      const ready = () => {
        cleanup();
        const conn = new Connection(sock);
        conn.on('message', this.handleResponse.bind(this));
        resolve(conn);
      };

      const error = (err: any) => {
        cleanup();
        this.conn = undefined;
        reject(err);
      };

      const cleanup = () => {
        sock.off('ready', ready);
        sock.off('error', error);
      };

      sock.on('ready', ready);
      sock.on('error', error);

      if (typeof this.connectTo === 'number') {
        sock.connect(this.connectTo, '127.0.0.1');
      } else {
        sock.connect(this.connectTo);
      }
    });
  }

  private handleResponse(message: IPCValue[]): void {
    if (isDaemonResponse(message)) {
      const [msgId, err, result] = message;
      const [resolve, reject] = this.messages.get(msgId) ?? [() => {}, () => {}];

      if (err !== undefined && err !== null) {
        reject(new Error(err));
      } else {
        resolve(result);
      }
    }
  }

  /*private handleError(err: any): void {
    this.conn = undefined;

    for (const [, reject] of this.messages.values()) {
      reject(err);
    }
  }*/
}
