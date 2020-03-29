class ScraperError extends Error {
    constructor() {
        super();
    }
}

// tslint:disable-next-line:max-classes-per-file
export class UrlError extends Error {
    constructor(message: string) {
        super(message);
    }
}

// tslint:disable-next-line:max-classes-per-file
export class MissingResourceError extends Error {
    constructor(message: string) {
        super(message);
    }
}
