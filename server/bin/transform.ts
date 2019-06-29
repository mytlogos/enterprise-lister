import stream from "stream";
import {isString} from "./tools";
import {NodeStringDecoder, StringDecoder} from "string_decoder";

export class BufferToStringStream extends stream.Transform {
    private readonly decoder: NodeStringDecoder;


    constructor() {
        super({decodeStrings: false, encoding: "utf-8", allowHalfOpen: false});
        this.decoder = new StringDecoder("utf-8");
    }

    public _transform(chunk: any, encoding: string, callback: (error?: (Error | null), data?: any) => void): void {
        let data: string;
        if (Buffer.isBuffer(chunk)) {
            data = this.decoder.write(chunk);
        } else if (isString(chunk)) {
            data = chunk;
        } else {
            throw Error("This transform stream works only with buffer or string");
        }
        this.push(data);
        callback(null, data);
    }
}
