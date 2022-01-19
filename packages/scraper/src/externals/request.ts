import axios, { AxiosInstance, AxiosResponse } from "axios";
import { CookieJar } from "tough-cookie";
import { wrapper as axiosCookieJarSupport } from "axios-cookiejar-support";
import { CheerioAPI, load } from "cheerio";
import { getQueueKey, queueWork } from "./queueManager";
import { delay, hasProps } from "enterprise-core/dist/tools";
import logger from "enterprise-core/dist/logger";

export class Requestor {
  #instance: AxiosInstance;
  public jar: CookieJar;

  public constructor(config?: BasicRequestConfig<any>, jar?: boolean | CookieJar) {
    if (jar === true) {
      this.jar = new CookieJar();
    } else if (jar) {
      this.jar = jar;
    } else {
      this.jar = new CookieJar();
    }
    if (jar) {
      this.#instance = axiosCookieJarSupport(axios.create(config) as any);
      // @ts-expect-error
      this.#instance.defaults.jar = jar;
    } else {
      this.#instance = axios.create(config);
    }
  }

  public async request<P = any, T = any, R extends RequestConfig<T> = RequestConfig<T>>(
    config: R,
  ): Promise<Response<P, T>> {
    const key = getQueueKey(config.url);

    if (key == null) {
      return Promise.reject(new Error("invalid url: " + config.url));
    }

    let response: AxiosResponse;

    if (config.disableRetry) {
      response = await queueWork(key, () => this.#instance.request<string, AxiosResponse, T>(config));
    } else {
      response = await queueWork(key, () => this.requestWithRetry<P, T, R>(config));
    }

    return {
      config: response.config as RequestConfig<T>,
      data: response.data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      request: response.request,

      toCheerio(): CheerioAPI {
        return load(response.data, { decodeEntities: false });
      },
      toJson(): any {
        return JSON.parse(response.data);
      },
    };
  }

  private async requestWithRetry<P = any, T = any, R extends RequestConfig<T> = RequestConfig<T>>(
    config: R,
  ): Promise<Response<P, T>> {
    for (let tryAgain = 0; tryAgain < 4; tryAgain++) {
      try {
        const response = await this.#instance.request<string, AxiosResponse, T>(config);
        return response.data;
      } catch (error) {
        // retry at most 3 times for 429 - Too many Requests error
        if (hasProps(error, "statusCode", "response") && error.statusCode === 429 && tryAgain < 3) {
          const retryAfterValue = (error.response as any)?.headers["retry-after"];
          const retryAfterSeconds = Number.parseInt(retryAfterValue);

          if (Number.isInteger(retryAfterSeconds) && retryAfterSeconds > 0) {
            if (retryAfterSeconds > 3600) {
              logger.info("Encountered a retry-after Header with value greater than an hour");
            }
            await delay(retryAfterSeconds * 1000);
          } else {
            const retryAfterDate = new Date(retryAfterValue);
            const diffMillis = retryAfterDate.getTime() - Date.now();

            if (Number.isNaN(diffMillis) || diffMillis < 0) {
              logger.error(`Retry-After is invalid: ${retryAfterValue}`);
            } else {
              await delay(diffMillis);
            }
          }
          continue;
        } else {
          throw error;
        }
      }
    }
    throw Error("Should never reach here, expected to return a valid response or throw an error");
  }

  public get<P = any, T = any, R extends RequestConfig<T> = RequestConfig<T>>(config: R) {
    config.method = "get";
    return this.request<P, T, R>(config);
  }

  public async getCheerio(config: RequestConfig<any>): Promise<CheerioAPI> {
    const response = await this.get(config);
    return response.toCheerio();
  }

  public async getJson<T = any>(config: RequestConfig<any>): Promise<T> {
    const response = await this.get(config);
    return response.toJson();
  }

  public head<P = any, T = any, R extends RequestConfig<T> = RequestConfig<T>>(config: R) {
    config.method = "head";
    return this.request<P, T, R>(config);
  }

  public post<P = any, T = any, R extends RequestConfig<T> = RequestConfig<T>>(config: R) {
    config.method = "post";
    return this.request<P, T, R>(config);
  }

  public async postCheerio(config: RequestConfig<any>): Promise<CheerioAPI> {
    const response = await this.post(config);
    return response.toCheerio();
  }

  public async postJson<T = any>(config: RequestConfig<any>): Promise<T> {
    const response = await this.post(config);
    return response.toJson();
  }
}

const request = new Requestor();
export default request;

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
  request?: any;

  toCheerio(): CheerioAPI;
  toJson(): any;
}

export interface ResponseError<T = any, D = any> extends Error {
  config: RequestConfig<D>;
  code?: string;
  request?: any;
  response?: Response<T, D>;
  isAxiosError: boolean;
  toJSON: () => object;
}
