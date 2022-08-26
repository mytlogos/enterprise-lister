import type { CheerioAPI } from "cheerio";

export interface BasicCredentials {
  username: string;
  password: string;
}

export interface ProxyConfig {
  host: string;
  port: number;
  auth?: {
    username: string;
    password: string;
  };
  protocol?: string;
}

export type Method =
  | "get"
  | "GET"
  | "delete"
  | "DELETE"
  | "head"
  | "HEAD"
  | "options"
  | "OPTIONS"
  | "post"
  | "POST"
  | "put"
  | "PUT"
  | "patch"
  | "PATCH"
  | "purge"
  | "PURGE"
  | "link"
  | "LINK"
  | "unlink"
  | "UNLINK";

export type ResponseType = "arraybuffer" | "blob" | "document" | "json" | "text" | "stream";

export type ResponseEncoding =
  | "ascii"
  | "ASCII"
  | "ansi"
  | "ANSI"
  | "binary"
  | "BINARY"
  | "base64"
  | "BASE64"
  | "base64url"
  | "BASE64URL"
  | "hex"
  | "HEX"
  | "latin1"
  | "LATIN1"
  | "ucs-2"
  | "UCS-2"
  | "ucs2"
  | "UCS2"
  | "utf-8"
  | "UTF-8"
  | "utf8"
  | "UTF8"
  | "utf16le"
  | "UTF16LE";

export interface TransitionalOptions {
  silentJSONParsing?: boolean;
  forcedJSONParsing?: boolean;
  clarifyTimeoutError?: boolean;
}

export type RequestHeaders = Record<string, string>;

export type ResponseHeaders = Record<string, string> & {
  "set-cookie"?: string[];
};

export interface RequestConfig<D> extends BasicRequestConfig<D> {
  url: string;
}

export type ParseType = "json" | "cheerio";

export interface BasicRequestConfig<D> {
  url?: string;
  method?: Method;
  baseURL?: string;
  headers?: RequestHeaders;
  params?: any;
  paramsSerializer?: (params: any) => string;
  data?: D;
  timeout?: number;
  timeoutErrorMessage?: string;
  withCredentials?: boolean;
  auth?: BasicCredentials;
  responseType?: ResponseType;
  responseEncoding?: ResponseEncoding | string;
  xsrfCookieName?: string;
  xsrfHeaderName?: string;
  onUploadProgress?: (progressEvent: any) => void;
  onDownloadProgress?: (progressEvent: any) => void;
  maxContentLength?: number;
  validateStatus?: ((status: number) => boolean) | null;
  maxBodyLength?: number;
  maxRedirects?: number;
  socketPath?: string | null;
  httpAgent?: any;
  httpsAgent?: any;
  proxy?: ProxyConfig | false;
  decompress?: boolean;
  transitional?: TransitionalOptions;
  signal?: AbortSignal;
  insecureHTTPParser?: boolean;
  disableRetry?: boolean;
}

export interface HeadersDefaults {
  common: RequestHeaders;
  delete: RequestHeaders;
  get: RequestHeaders;
  head: RequestHeaders;
  post: RequestHeaders;
  put: RequestHeaders;
  patch: RequestHeaders;
  options?: RequestHeaders;
  purge?: RequestHeaders;
  link?: RequestHeaders;
  unlink?: RequestHeaders;
}

export interface RequestDefaults<D = any> extends Omit<RequestConfig<D>, "headers"> {
  headers: HeadersDefaults;
}

export interface Response<T = any, D = any> {
  data: T;
  status: number;
  statusText: string;
  headers: ResponseHeaders;
  config: RequestConfig<D>;
  request: Request;

  toCheerio(): CheerioAPI;
  toJson<R>(): R;
}

/**
 * Describes an already finished request.
 */
export interface Request {
  /**
   * The request method.
   */
  method: string;

  /**
   * Complete url, with protocol, host, path and query.
   */
  url: string;

  uri: URL;

  /**
   * Headers of the request
   */
  headers: Record<string, undefined | number | string | string[]>;
}

export interface ResponseError<T = any, D = any> extends Error {
  config: RequestConfig<D>;
  code?: string;
  request?: any;
  response?: Response<T, D>;
  isAxiosError: boolean;
  toJSON: () => object;
}
