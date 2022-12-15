import { EventEmitter } from 'events';
import type { Socket } from 'net';
import { Receiver } from './receiver';
import { Transmitter } from './transmitter';
import type { IPCValue } from './utils';
import { decodeMessage, encodeMessage } from './utils';

export class Connection extends EventEmitter {
  private readonly sock: Socket;
  private readonly tx: Transmitter;
  private readonly rx: Receiver;

  public constructor(sock: Socket) {
    super();
    this.sock = sock;

    this.tx = new Transmitter();
    this.tx.pipe(this.sock);

    this.rx = new Receiver();
    this.rx.on('data', (msg) => this.emit('message', decodeMessage(msg)));
    this.sock.pipe(this.rx);
  }

  public async send(...message: IPCValue[]): Promise<void> {
    return new Promise((resolve, reject) => {
      this.tx.write(encodeMessage(message), (err) => {
        err ? reject(err) : resolve();
      });
    })
  }

  public async close(): Promise<void> {
    return new Promise((resolve) => this.sock.end(resolve));
  }
}

export interface Connection extends EventEmitter {
  emit(event: 'message', message: IPCValue[]): boolean;
  on(event: 'message', handler: (message: IPCValue[]) => void): this;
  once(event: 'message', handler: (message: IPCValue[]) => void): this;
  off(event: 'message', handler: (message: IPCValue[]) => void): this;
}
