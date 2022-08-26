declare module "tough-cookie" {
  // adapted from tough-cookie/lib/cookie.js#cookieDefaults
  export interface JsonCookie {
    // the order in which the RFC has them:
    key: string;
    value: string;
    expires?: Date | string | number;
    maxAge?: number | "Infinity" | "-Infinity";
    domain?: string | null;
    path?: string | null;
    secure?: boolean;
    httpOnly?: boolean;
    extensions?: string[] | null;
    // set by the CookieJar:;
    hostOnly?: boolean | null;
    pathIsDefault?: boolean | null;
    creation?: Date | string | number | null;
    lastAccessed?: Date | string | number | null;
    sameSite?: string;
  }

  // Type definitions for tough-cookie 4.0
  // Project: https://github.com/salesforce/tough-cookie
  // Definitions by: Leonard Thieu <https://github.com/leonard-thieu>
  //                 LiJinyao <https://github.com/LiJinyao>
  //                 Michael Wei <https://github.com/no2chem>
  // Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
  // TypeScript Version: 2.2

  export const version: string;

  export const PrefixSecurityEnum: Readonly<{
    DISABLED: string;
    SILENT: string;
    STRICT: string;
  }>;

  /**
   * Parse a cookie date string into a Date.
   * Parses according to RFC6265 Section 5.1.1, not Date.parse().
   */
  export function parseDate(string: string): Date;

  /**
   * Format a Date into a RFC1123 string (the RFC6265-recommended format).
   */
  export function formatDate(date: Date): string;

  /**
   * Transforms a domain-name into a canonical domain-name.
   * The canonical domain-name is a trimmed, lowercased, stripped-of-leading-dot
   * and optionally punycode-encoded domain-name (Section 5.1.2 of RFC6265).
   * For the most part, this function is idempotent (can be run again on its output without ill effects).
   */
  export function canonicalDomain(str: string): string;

  /**
   * Answers "does this real domain match the domain in a cookie?".
   * The str is the "current" domain-name and the domStr is the "cookie" domain-name.
   * Matches according to RFC6265 Section 5.1.3, but it helps to think of it as a "suffix match".
   *
   * The canonicalize parameter will run the other two parameters through canonicalDomain or not.
   */
  export function domainMatch(str: string, domStr: string, canonicalize?: boolean): boolean;

  /**
   * Given a current request/response path, gives the Path apropriate for storing in a cookie.
   * This is basically the "directory" of a "file" in the path, but is specified by Section 5.1.4 of the RFC.
   *
   * The path parameter MUST be only the pathname part of a URI (i.e. excludes the hostname, query, fragment, etc.).
   * This is the .pathname property of node's uri.parse() output.
   */
  export function defaultPath(path: string): string;

  /**
   * Answers "does the request-path path-match a given cookie-path?" as per RFC6265 Section 5.1.4.
   * Returns a boolean.
   *
   * This is essentially a prefix-match where cookiePath is a prefix of reqPath.
   */
  export function pathMatch(reqPath: string, cookiePath: string): boolean;

  /**
   * alias for Cookie.parse(cookieString[, options])
   */
  export function parse(cookieString: string, options?: Cookie.ParseOptions): Cookie | undefined;

  /**
   * alias for Cookie.fromJSON(string)
   */
  export function fromJSON(strOrObj: string | JsonCookie): Cookie | null;

  export function getPublicSuffix(hostname: string): string | null;

  export function cookieCompare(a: Cookie, b: Cookie): number;

  export function permuteDomain(domain: string, allowSpecialUseDomain?: boolean): string[];

  export function permutePath(path: string): string[];

  export class Cookie {
    public static parse(cookieString: string, options?: Cookie.ParseOptions): Cookie | undefined;

    public static fromJSON(strOrObj: string | JsonCookie): Cookie | null;

    public constructor(properties?: Cookie.Properties);

    public key: string;
    public value: string;
    public expires: Date | "Infinity";
    public maxAge: number | "Infinity" | "-Infinity";
    public domain: string | null;
    public path: string | null;
    public secure: boolean;
    public httpOnly: boolean;
    public extensions: string[] | null;
    public creation: Date | null;
    public creationIndex: number;

    public hostOnly: boolean | null;
    public pathIsDefault: boolean | null;
    public lastAccessed: Date | null;
    public sameSite: string;

    public toString(): string;

    public cookieString(): string;

    public setExpires(exp: Date | string): void;

    public setMaxAge(number: number): void;

    public expiryTime(now?: number): number;

    public expiryDate(now?: number): Date;

    public TTL(now?: Date): number | typeof Infinity;

    public isPersistent(): boolean;

    public canonicalizedDomain(): string | null;

    public cdomain(): string | null;

    public inspect(): string;

    public toJSON(): { [key: string]: any };

    public clone(): Cookie;

    public validate(): boolean | string;
  }

  export namespace Cookie {
    interface ParseOptions {
      loose?: boolean;
    }

    interface Properties {
      key?: string;
      value?: string;
      expires?: Date;
      maxAge?: number | "Infinity" | "-Infinity";
      domain?: string;
      path?: string;
      secure?: boolean;
      httpOnly?: boolean;
      extensions?: string[];
      creation?: Date;
      creationIndex?: number;

      hostOnly?: boolean;
      pathIsDefault?: boolean;
      lastAccessed?: Date;
      sameSite?: string;
    }

    interface Serialized {
      [key: string]: any;
    }
  }

  export class CookieJar {
    public static deserialize(serialized: CookieJar.Serialized | string, store?: Store): Promise<CookieJar>;
    public static deserialize(
      serialized: CookieJar.Serialized | string,
      store: Store,
      cb: (err: Error | null, object: CookieJar) => void,
    ): void;
    public static deserialize(
      serialized: CookieJar.Serialized | string,
      cb: (err: Error | null, object: CookieJar) => void,
    ): void;

    public static deserializeSync(serialized: CookieJar.Serialized | string, store?: Store): CookieJar;

    public static fromJSON(string: string): CookieJar;

    public constructor(store?: Store, options?: CookieJar.Options);

    public setCookie(
      cookieOrString: Cookie | string,
      currentUrl: string,
      options?: CookieJar.SetCookieOptions,
    ): Promise<Cookie>;
    public setCookie(
      cookieOrString: Cookie | string,
      currentUrl: string,
      options: CookieJar.SetCookieOptions,
      cb: (err: Error | null, cookie: Cookie) => void,
    ): void;
    public setCookie(
      cookieOrString: Cookie | string,
      currentUrl: string,
      cb: (err: Error | null, cookie: Cookie) => void,
    ): void;

    public setCookieSync(
      cookieOrString: Cookie | string,
      currentUrl: string,
      options?: CookieJar.SetCookieOptions,
    ): Cookie;

    public getCookies(currentUrl: string, options?: CookieJar.GetCookiesOptions): Promise<Cookie[]>;
    public getCookies(
      currentUrl: string,
      options: CookieJar.GetCookiesOptions,
      cb: (err: Error | null, cookies: Cookie[]) => void,
    ): void;
    public getCookies(currentUrl: string, cb: (err: Error | null, cookies: Cookie[]) => void): void;

    public getCookiesSync(currentUrl: string, options?: CookieJar.GetCookiesOptions): Cookie[];

    public getCookieString(currentUrl: string, options?: CookieJar.GetCookiesOptions): Promise<string>;
    public getCookieString(
      currentUrl: string,
      options: CookieJar.GetCookiesOptions,
      cb: (err: Error | null, cookies: string) => void,
    ): void;
    public getCookieString(currentUrl: string, cb: (err: Error | null, cookies: string) => void): void;

    public getCookieStringSync(currentUrl: string, options?: CookieJar.GetCookiesOptions): string;

    public getSetCookieStrings(currentUrl: string, options?: CookieJar.GetCookiesOptions): Promise<string[]>;
    public getSetCookieStrings(
      currentUrl: string,
      options: CookieJar.GetCookiesOptions,
      cb: (err: Error | null, cookies: string[]) => void,
    ): void;
    public getSetCookieStrings(currentUrl: string, cb: (err: Error | null, cookies: string[]) => void): void;

    public getSetCookieStringsSync(currentUrl: string, options?: CookieJar.GetCookiesOptions): string[];

    public serialize(): Promise<CookieJar.Serialized>;
    public serialize(cb: (err: Error | null, serializedObject: CookieJar.Serialized) => void): void;

    public serializeSync(): CookieJar.Serialized;

    public toJSON(): CookieJar.Serialized;

    public clone(store?: Store): Promise<CookieJar>;
    public clone(store: Store, cb: (err: Error | null, newJar: CookieJar) => void): void;
    public clone(cb: (err: Error | null, newJar: CookieJar) => void): void;

    public cloneSync(store?: Store): CookieJar;

    public removeAllCookies(): Promise<void>;
    public removeAllCookies(cb: (err: Error | null) => void): void;

    public removeAllCookiesSync(): void;
  }

  export namespace CookieJar {
    interface Options {
      allowSpecialUseDomain?: boolean;
      looseMode?: boolean;
      rejectPublicSuffixes?: boolean;
      prefixSecurity?: string;
    }

    interface SetCookieOptions {
      http?: boolean;
      secure?: boolean;
      now?: Date;
      ignoreError?: boolean;
    }

    interface GetCookiesOptions {
      http?: boolean;
      secure?: boolean;
      now?: Date;
      expire?: boolean;
      allPaths?: boolean;
    }

    interface Serialized {
      version: string;
      storeType: string;
      rejectPublicSuffixes: boolean;
      cookies: Cookie.Serialized[];
    }
  }

  export abstract class Store {
    public synchronous: boolean;

    public findCookie(
      domain: string,
      path: string,
      key: string,
      cb: (err: Error | null, cookie: Cookie | null) => void,
    ): void;

    public findCookies(
      domain: string,
      path: string,
      allowSpecialUseDomain: boolean,
      cb: (err: Error | null, cookie: Cookie[]) => void,
    ): void;

    public putCookie(cookie: Cookie, cb: (err: Error | null) => void): void;

    public updateCookie(oldCookie: Cookie, newCookie: Cookie, cb: (err: Error | null) => void): void;

    public removeCookie(domain: string, path: string, key: string, cb: (err: Error | null) => void): void;

    public removeCookies(domain: string, path: string, cb: (err: Error | null) => void): void;

    public getAllCookies(cb: (err: Error | null, cookie: Cookie[]) => void): void;
  }

  export class MemoryCookieStore extends Store {}
}
