class ScraperError extends Error {
    constructor() {
        super();
    }
}

// tslint:disable-next-line:max-classes-per-file
export class UrlError extends Error {
    public name = "UrlError";

    constructor(message: string) {
        super(message);
    }
}

// tslint:disable-next-line:max-classes-per-file
export class MissingResourceError extends Error {
    public name = "MissingResourceError";

    constructor(message: string) {
        super(message);
    }
}
