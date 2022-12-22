import { deserialize, serialize } from 'v8';
import type { ValueMap } from '../../types';
import { AbstractStorage } from '../abstractStorage';
import type { LockManagerInterface } from '../lockManagerInterface';
import { FileLockManager } from './fileLockManager';
import { FileManager } from './fileManager';

export class FileStorage extends AbstractStorage {
  private readonly manager: FileManager<ValueMap>;

  public constructor(storageDir: string, lockManager?: LockManagerInterface);
  public constructor(storageDir: string, binary: boolean, lockManager?: LockManagerInterface);
  public constructor(storageDir: string, b0?: any, c0?: any) {
    const [binary, lockManager]: [boolean, LockManagerInterface | undefined]
      = typeof b0 === 'boolean' ? [b0, c0] : [false, b0];

    super(lockManager ?? new FileLockManager(storageDir));

    this.manager = new FileManager<ValueMap>(
      storageDir,
      binary ? serialize : serializeJSON,
      binary ? deserialize : deserializeJSON,
    );
  }

  protected async readSessionData(id: string): Promise<ValueMap | undefined> {
    return this.manager.readFile(id);
  }

  protected async writeSessionData(id: string, data: ValueMap, expires?: number): Promise<void> {
    await this.manager.writeFile(id, data, expires);
  }

  protected async purgeSessionData(id: string): Promise<void> {
    await this.manager.removeFile(id);
  }
}

function serializeJSON(data: ValueMap): Buffer {
  return Buffer.from(JSON.stringify(data));
}

function deserializeJSON(data: Buffer): ValueMap {
  return JSON.parse(data.toString('utf-8'));
}
