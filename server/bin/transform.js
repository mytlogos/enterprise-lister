import stream from "stream";
import { isString } from "./tools";
import { StringDecoder } from "string_decoder";
export class BufferToStringStream extends stream.Transform {
    constructor() {
        super({ decodeStrings: false, encoding: "utf-8", allowHalfOpen: false });
        this.decoder = new StringDecoder("utf-8");
    }
    _transform(chunk, encoding, callback) {
        let data;
        if (Buffer.isBuffer(chunk)) {
            data = this.decoder.write(chunk);
        }
        else if (isString(chunk)) {
            data = chunk;
        }
        else {
            throw Error("This transform stream works only with buffer or string");
        }
        this.push(data);
        callback(null, data);
    }
}
//# sourceMappingURL=transform.js.map