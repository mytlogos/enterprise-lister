"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ScraperError extends Error {
    constructor() {
        super();
    }
}
// tslint:disable-next-line:max-classes-per-file
class UrlError extends Error {
    constructor(message, url) {
        super(message);
        this.name = "UrlError";
        this.url = url;
    }
}
exports.UrlError = UrlError;
// tslint:disable-next-line:max-classes-per-file
class MissingResourceError extends Error {
    constructor(message, resource) {
        super(message);
        this.name = "MissingResourceError";
        this.resource = resource;
    }
}
exports.MissingResourceError = MissingResourceError;
//# sourceMappingURL=errors.js.map