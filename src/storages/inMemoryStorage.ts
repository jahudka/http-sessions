import { randomBytes } from 'crypto';
import { deserialize,serialize } from 'v8';
import type { ValueMap } from '../types';
import type { StorageInterface } from './storageInterface';

type Entry = {
  data: Buffer;
  tmr?: NodeJS.Timeout;
};

type LockState = {
  released: Promise<void>;
  release: () => void;
};

class Lock {
  private current?: LockState;

  public async acquire(): Promise<void> {
    const current = this.current;
    this.current = this.create();
    current && await current.released;
  }

  public release(): void {
    this.current?.release();
  }

  private create(): LockState {
    let release: any = undefined;
    const released = new Promise<void>((r) => release = r);
    return { released, release };
  }
}

export class InMemoryStorage implements StorageInterface {
  private readonly sidLength: number;
  private readonly sessions: Map<string, Entry> = new Map();
  private readonly locks: Map<string, Lock> = new Map();

  public constructor(sidLength: number = 32) {
    this.sidLength = sidLength;
  }

  public async allocateAndLockId(previous?: string): Promise<string> {
    let id: string;

    do {
      id = randomBytes(Math.ceil(this.sidLength / 2)).toString('hex').slice(0, this.sidLength);
    } while (this.sessions.has(id));

    await this.getLock(id).acquire();

    if (previous) {
      const session = this.sessions.get(previous);

      if (session) {
        this.sessions.set(id, session);
        this.sessions.delete(previous);
        this.getLock(previous).release();
      }
    }

    return id;
  }


  public async lockAndRead(id: string): Promise<ValueMap> {
    await this.getLock(id).acquire();
    const entry = this.sessions.get(id);
    return entry ? deserialize(entry.data) : undefined;
  }

  public writeAndUnlock(id: string, data: ValueMap, expires?: number): void {
    const entry: Entry = {
      data: serialize(data),
    };

    if (expires) {
      entry.tmr = setTimeout(() => this.purge(id), expires - Date.now());
    }

    this.sessions.set(id, entry);
    this.getLock(id).release();
  }

  public purge(id: string): void {
    const entry = this.sessions.get(id);
    entry && entry.tmr && clearTimeout(entry.tmr);
    this.sessions.delete(id);
    this.getLock(id).release();
  }

  private getLock(id: string): Lock {
    const existing = this.locks.get(id);

    if (existing) {
      return existing;
    }

    const lock = new Lock();
    this.locks.set(id, lock);
    return lock;
  }
}
