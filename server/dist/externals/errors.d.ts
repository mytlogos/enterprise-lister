export declare class UrlError extends Error {
    readonly name = "UrlError";
    readonly url: string;
    constructor(message: string, url: string);
}
export declare class MissingResourceError extends Error {
    readonly name = "MissingResourceError";
    readonly resource: string;
    constructor(message: string, resource: string);
}
