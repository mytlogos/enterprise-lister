/// <reference types="node" />
import stream from "stream";
export declare class BufferToStringStream extends stream.Transform {
    private readonly decoder;
    constructor();
    _transform(chunk: any, encoding: string, callback: (error?: (Error | null), data?: any) => void): void;
}
