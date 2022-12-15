import { chmod, mkdir } from 'fs/promises';
import { join } from 'path';
import type { LockManagerInterface } from '../lockManagerInterface';
import { SessionLock } from '../sessionLock';

export class FileLockManager implements LockManagerInterface {
  private readonly lockfile: Promise<typeof import('proper-lockfile')>;
  private readonly storageDir: string;
  private storageInitialised: boolean = false;

  public constructor(storageDir: string) {
    this.lockfile = import('proper-lockfile').catch(() => {
      throw new Error('FileLockManager requires the package "proper-lockfile", please install it');
    });

    this.storageDir = storageDir;
  }

  public async acquire(sessionId: string): Promise<SessionLock> {
    await this.initStorage();

    const lockfile = await this.lockfile;
    const release = await lockfile.lock(this.formatPath(sessionId), {
      realpath: false,
      retries: {
        forever: true,
        minTimeout: 100,
        factor: 1,
      },
    });

    return new SessionLock(sessionId, release);
  }

  private formatPath(sessionId: string): string {
    return join(this.storageDir, sessionId);
  }

  private async initStorage(): Promise<void> {
    if (this.storageInitialised) {
      return;
    }

    this.storageInitialised = true;
    await mkdir(this.storageDir, { recursive: true });
    await chmod(this.storageDir, 0o700);
  }
}
