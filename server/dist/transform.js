"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const stream_1 = tslib_1.__importDefault(require("stream"));
const tools_1 = require("./tools");
const string_decoder_1 = require("string_decoder");
class BufferToStringStream extends stream_1.default.Transform {
    constructor() {
        super({ decodeStrings: false, encoding: "utf-8" });
        this.decoder = new string_decoder_1.StringDecoder("utf-8");
    }
    _transform(chunk, encoding, callback) {
        let data;
        if (Buffer.isBuffer(chunk)) {
            data = this.decoder.write(chunk);
        }
        else if (tools_1.isString(chunk)) {
            data = chunk;
        }
        else {
            throw Error("This transform stream works only with buffer or string");
        }
        callback(null, data);
    }
}
exports.BufferToStringStream = BufferToStringStream;
class ObjectToStringStream extends stream_1.default.Transform {
    constructor() {
        super({
            decodeStrings: false,
            encoding: "utf-8",
            writableObjectMode: true,
            readableObjectMode: false,
            allowHalfOpen: false
        });
    }
    _transform(chunk, encoding, callback) {
        this.push(JSON.stringify(chunk));
        callback(null, JSON.stringify(chunk));
    }
}
exports.ObjectToStringStream = ObjectToStringStream;
//# sourceMappingURL=transform.js.map