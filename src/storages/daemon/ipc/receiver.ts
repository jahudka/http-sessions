import type { TransformCallback } from 'stream';
import { Transform } from 'stream';

export class Receiver extends Transform {
  private buffer: Buffer[] = [];
  private bufferLength: number = 0;
  private messageLength?: number;

  public _transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback): void {
    this.buffer.push(chunk);
    this.bufferLength += chunk.byteLength;

    if (!this.messageLength) {
      if (this.bufferLength < 4) {
        return callback();
      }

      this.messageLength = this.buffer[0].readUint32BE(0);
    }

    if (this.bufferLength < 4 + this.messageLength) {
      return callback();
    }

    const buffer = Buffer.concat(this.buffer, this.bufferLength);
    let start = 0;

    do {
      this.push(buffer.slice(start + 4, start + 4 + this.messageLength));
      start += 4 + this.messageLength;
      this.messageLength = this.bufferLength >= start + 4 ? buffer.readUint32BE(start) : undefined;
    } while (this.messageLength !== undefined && this.bufferLength >= start + 4 + this.messageLength);

    this.buffer = this.bufferLength > start ? [buffer.slice(start)] : [];
    this.bufferLength -= start;
    callback();
  }
}
