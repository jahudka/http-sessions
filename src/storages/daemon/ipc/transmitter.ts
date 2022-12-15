import type { TransformCallback } from 'stream';
import { Transform } from 'stream';

export class Transmitter extends Transform {
  public _transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback) {
    const length = Buffer.allocUnsafe(4);
    length.writeUint32BE(chunk.byteLength, 0);
    this.push(Buffer.concat([length, chunk], chunk.byteLength + 4));
    callback();
  }
}
