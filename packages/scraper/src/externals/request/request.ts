import axios, { AxiosInstance, AxiosResponse } from "axios";
import { CookieJar } from "tough-cookie";
import { wrapper as axiosCookieJarSupport } from "axios-cookiejar-support";
import { CheerioAPI, load } from "cheerio";
import { getQueueKey, queueWork } from "../queueManager";
import { delay } from "enterprise-core/dist/tools";
import logger from "enterprise-core/dist/logger";
import { BasicRequestConfig, RequestConfig, Response } from "./types";
import { handleCloudflare } from "./cloudflare";
import { RequestError } from "./error";

function transformAxiosResponse(response: AxiosResponse): Response {
  return {
    config: response.config as RequestConfig<any>,
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

    if (config.disableRetry) {
      return queueWork(key, () => this.performRequest<P, T, R>(config));
    } else {
      return queueWork(key, () => this.requestWithRetry<P, T, R>(config));
    }
  }

  private async performRequest<P = any, T = any, R extends RequestConfig<T> = RequestConfig<T>>(
    config: R,
  ): Promise<Response<P, T>> {
    return handleCloudflare(config, async (requestConfig) => {
      let response: AxiosResponse;
      try {
        response = await this.#instance.request<string, AxiosResponse, T>(requestConfig);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const transformed = error.response ? transformAxiosResponse(error.response) : undefined;
          throw new RequestError(error.message, requestConfig, transformed);
        } else {
          throw error;
        }
      }

      return transformAxiosResponse(response);
    });
  }

  private async requestWithRetry<P = any, T = any, R extends RequestConfig<T> = RequestConfig<T>>(
    config: R,
  ): Promise<Response<P, T>> {
    for (let tryAgain = 0; tryAgain < 4; tryAgain++) {
      try {
        const response = await this.performRequest<P, T, R>(config);

        if (response.status === 429) {
          throw Error("Too many requests");
        }

        return response;
      } catch (error) {
        // retry at most 3 times for 429 - Too many Requests error
        if (error instanceof RequestError && error.response?.status === 429 && tryAgain < 3) {
          const retryAfterValue = (error.response?.headers || {})["retry-after"];
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

export const request = new Requestor();
export default request;
