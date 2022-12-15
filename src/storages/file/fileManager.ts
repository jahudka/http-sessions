import { chmod, mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { join } from 'path';

export class FileManager<T = Buffer> {
  private readonly storageDir: string;
  private readonly serialize: (data: T) => Buffer;
  private readonly deserialize: (data: Buffer) => T;
  private storageInitialised: boolean = false;

  public constructor(
    storageDir: string,
    serialize?: (data: T) => Buffer,
    deserialize?: (data: Buffer) => T
  ) {
    this.storageDir = storageDir;
    this.serialize = serialize ?? ((data: any) => data);
    this.deserialize = deserialize ?? ((data: Buffer) => data as any);
  }

  public async readFile(name: string): Promise<T | undefined> {
    await this.initStorage();

    return this.ignoreMissingFile(async () => {
      const data = await readFile(this.formatPath(name));
      return data ? this.deserialize(data) : undefined;
    });
  }

  public async writeFile(name: string, data: T): Promise<void> {
    await this.initStorage();
    await writeFile(this.formatPath(name), this.serialize(data));
  }

  public async removeFile(name: string): Promise<void> {
    await this.ignoreMissingFile(async () => {
      await unlink(this.formatPath(name));
    });
  }

  private async ignoreMissingFile<R>(cb: () => Promise<R>): Promise<R | undefined> {
    try {
      return await cb();
    } catch (e: any) {
      if (e.code === 'ENOENT') {
        return undefined;
      }

      throw e;
    }
  }

  private formatPath(id: string): string {
    return join(this.storageDir, id);
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
