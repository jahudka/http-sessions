enum DataType {
  Undefined = 0,
  Null = 1,
  True = 2,
  False = 3,
  Number = 4,
  String = 5,
  Buffer = 6,
}

const type = {
  undefined: Buffer.of(DataType.Undefined),
  null: Buffer.of(DataType.Null),
  true: Buffer.of(DataType.True),
  false: Buffer.of(DataType.False),
  number: Buffer.of(DataType.Number),
  string: Buffer.of(DataType.String),
  buffer: Buffer.of(DataType.Buffer),
};

export type IPCValue = Buffer | string | number | boolean | null | undefined;

function encodeValue(value: IPCValue): [Buffer, Buffer | undefined] {
  if (value === undefined) {
    return [type.undefined, undefined];
  } else if (value === null) {
    return [type.null, undefined];
  } else if (typeof value === 'boolean') {
    return [value ? type.true : type.false, undefined];
  } else if (typeof value === 'number') {
    const buffer = Buffer.allocUnsafe(4);
    buffer.writeFloatBE(value);
    return [type.number, buffer];
  } else if (typeof value === 'string') {
    const buffer = Buffer.from(value);
    const length = Buffer.allocUnsafe(4);
    length.writeUint32BE(buffer.byteLength);
    return [type.string, Buffer.concat([length, buffer])];
  } else if (Buffer.isBuffer(value)) {
    const length = Buffer.allocUnsafe(4);
    length.writeUint32BE(value.byteLength);
    return [type.buffer, Buffer.concat([length, value])];
  } else {
    throw new TypeError('Cannot encode value');
  }
}

export function encodeMessage(message: IPCValue[]): Buffer {
  const count = Buffer.allocUnsafe(1);
  count.writeUint8(message.length);
  const header = [count];
  const data = [];
  let bytes = 1;

  for (const arg of message) {
    const [type, value] = encodeValue(arg);
    header.push(type);
    bytes += type.byteLength;

    if (value) {
      data.push(value);
      bytes += value.byteLength;
    }
  }

  return Buffer.concat(header.concat(data), bytes + 4);
}

export function decodeMessage(message: Buffer): IPCValue[] {
  const values: IPCValue[] = [];
  const count = message.readUint8(0);
  let offset = count + 1;

  for (let i = 0; i < count; ++i) {
    const type = message.readUint8(i + 1);
    let len: number;

    switch (type) {
      case DataType.Undefined:
        values.push(undefined);
        break;
      case DataType.Null:
        values.push(null);
        break;
      case DataType.True:
        values.push(true);
        break;
      case DataType.False:
        values.push(false);
        break;
      case DataType.Number:
        values.push(message.readFloatBE(offset));
        offset += 4;
        break;
      case DataType.String:
        len = message.readUint32BE(offset);
        offset += 4;
        values.push(message.slice(offset, offset + len).toString('utf-8'));
        offset += len;
        break;
      case DataType.Buffer:
        len = message.readUint32BE(offset);
        offset += 4;
        values.push(message.slice(offset, offset + len));
        offset += len;
        break;
      default:
        throw new TypeError('Cannot decode message');
    }
  }

  return values;
}
