import { chmod, mkdir, open, readdir, readFile, unlink, writeFile } from 'fs/promises';
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
      const expires = data.readDoubleLE(0);
      return expires < 0 || expires >= Date.now() ? this.deserialize(data.slice(8)) : undefined;
    });
  }

  public async writeFile(name: string, data: T, expires?: number): Promise<void> {
    await this.initStorage();
    const header = Buffer.allocUnsafe(8);
    header.writeDoubleLE(expires || -1, 0);
    await writeFile(this.formatPath(name), Buffer.concat([header, this.serialize(data)]));
  }

  public async removeFile(name: string): Promise<void> {
    await this.ignoreMissingFile(async () => {
      await unlink(this.formatPath(name));
    });
  }

  public async collectGarbage(isLocked: (name: string) => boolean): Promise<void> {
    await this.initStorage();
    const header = Buffer.allocUnsafe(8);

    for (const file of await readdir(this.storageDir, { withFileTypes: true })) {
      if (file.isFile() && !isLocked(file.name)) {
        const path = this.formatPath(file.name);
        const fp = await open(path);
        await fp.read(header, 0, 8, 0);
        await fp.close();
        const expires = header.readDoubleLE(0);

        if (expires < Date.now()) {
          await unlink(path);
        }
      }
    }
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
