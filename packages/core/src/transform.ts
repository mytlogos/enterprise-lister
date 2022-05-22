import stream from "stream";
import { isString } from "./tools";
import { StringDecoder } from "string_decoder";
import { Nullable } from "./types";

export class BufferToStringStream extends stream.Transform {
  private readonly decoder: StringDecoder;

  public constructor() {
    super({ decodeStrings: false, encoding: "utf-8" });
    this.decoder = new StringDecoder("utf-8");
  }

  public _transform(chunk: any, encoding: string, callback: (error?: Nullable<Error>, data?: any) => void): void {
    let data: string;
    if (Buffer.isBuffer(chunk)) {
      data = this.decoder.write(chunk);
    } else if (isString(chunk)) {
      data = chunk;
    } else {
      throw new TypeError("This transform stream works only with buffer or string");
    }
    callback(null, data);
  }
}

// tslint:disable-next-line
export class ObjectToStringStream extends stream.Transform {
  public constructor() {
    super({
      decodeStrings: false,
      encoding: "utf-8",
      writableObjectMode: true,
      readableObjectMode: false,
      allowHalfOpen: false,
    });
  }

  public _transform(chunk: any, encoding: string, callback: (error?: Nullable<Error>, data?: any) => void): void {
    this.push(JSON.stringify(chunk));
    callback(null, JSON.stringify(chunk));
  }
}
