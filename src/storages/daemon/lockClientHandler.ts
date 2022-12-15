import type { Socket } from 'net';
import type { LockManagerInterface } from '../lockManagerInterface';
import { MemoizedLockManager } from '../memory';
import { AbstractClientHandler } from './abstractClientHandler';
import type { IPCValue } from './ipc';
import type { LockDaemonMessage,LockId } from './types';
import { isLockDaemonMessage } from './types';

export class LockClientHandler extends AbstractClientHandler<LockDaemonMessage> {
  private readonly manager: LockManagerInterface;

  public constructor(conn: Socket, manager?: LockManagerInterface) {
    super(conn);
    this.manager = manager ?? new MemoizedLockManager();
  }

  protected isMessageValid(message: IPCValue[]): message is LockDaemonMessage {
    return isLockDaemonMessage(message);
  }

  protected async executeMethod(message: LockDaemonMessage): Promise<any> {
    switch (message[1]) {
      case 'acquire': return this.acquire(message[2]);
      case 'release': return this.release(message[2]);
    }

    return undefined;
  }

  private async acquire(id: string): Promise<LockId> {
    const lock = await this.manager.acquire(id);
    return this.saveLock(lock);
  }

  private async release(lockId: LockId): Promise<void> {
    try {
      await this.getLock(lockId).release();
    } catch (e) {
      // noop
    }
  }
}
