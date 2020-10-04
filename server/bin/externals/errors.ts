export class ScraperError extends Error {
    public constructor() {
        super();
    }
}

// tslint:disable-next-line:max-classes-per-file
export class UrlError extends Error {
    public readonly name = "UrlError";
    public readonly url: string;

    public constructor(message: string, url: string) {
        super(message);
        this.url = url;
    }
}

// tslint:disable-next-line:max-classes-per-file
export class MissingResourceError extends Error {
    public readonly name = "MissingResourceError";
    public readonly resource: string;

    public constructor(message: string, resource: string) {
        super(message);
        this.resource = resource;
    }
}
