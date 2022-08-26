import axios, { AxiosInstance, AxiosResponse } from "axios";
import { fromJSON, CookieJar } from "tough-cookie";
import { wrapper as axiosCookieJarSupport } from "axios-cookiejar-support";
import { CheerioAPI, load } from "cheerio";
import { getQueueKey, queueWork } from "../queueRequest";
import { delay } from "enterprise-core/dist/tools";
import logger from "enterprise-core/dist/logger";
import { BasicRequestConfig, RequestConfig, Response } from "./types";
import { handleCloudflare } from "./cloudflare";
import { CloudflareHandlerError, RequestError } from "./error";
import puppeteer from "puppeteer";
import { ClientRequest } from "http";

function transformAxiosResponse(response: AxiosResponse): Response {
  const axiosRequest: ClientRequest = response.request;
  const url = `${axiosRequest.protocol}//${axiosRequest.host}${axiosRequest.path}`;
  return {
    config: response.config as RequestConfig<any>,
    data: response.data,
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    request: {
      headers: axiosRequest.getHeaders(),
      method: axiosRequest.method,
      uri: new URL(url),
      url,
    },

    toCheerio(): CheerioAPI {
      return load(this.data);
    },
    toJson(): any {
      return JSON.parse(this.data);
    },
  };
}

let puppeteerBrowser: Promise<puppeteer.Browser> | undefined;

/**
 * Configurable Wrapper for network http communication.
 * Currently wraps Axios.
 * Wraps the AxiosResponse and AxiosError in custom classes.
 *
 * Inbuilt throttling for a domain.
 * (Currently the domain www.google.de and google.de are differently, as they `are` different domains).
 *
 * Requests are abortable.
 * By default retries a request, if it failed with statusCode=429 (too many requests).
 * Tries at most 3 times. Expects the "Retry-After" Header and tries to respect it.
 *
 * Tries to handle cloudflare pages, falling back to puppeteer if it did not work.
 *
 * TODO: enable specifying the queue key, instead of being url/domain dependant.
 * TODO: use axios interceptors more?
 */
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
      this.#instance.defaults.jar = this.jar;
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
    }).catch((error) => {
      if (error instanceof CloudflareHandlerError && config.method === "GET") {
        return this.usePuppeteer(config);
      }
      // rethrow error if should not be handled by puppeteer
      throw error;
    });
  }

  private async usePuppeteer<P = any, T = any, R extends RequestConfig<T> = RequestConfig<T>>(
    config: R,
  ): Promise<Response<P, T>> {
    // using puppeteer in chromium requires disabling the sandbox
    puppeteerBrowser ??= puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const browser = await puppeteerBrowser;
    const page = await browser.newPage();

    // enable request interception to reduce network load
    // also disables cache
    page.setRequestInterception(true);
    page.on("request", (pageRequest) => {
      const resourceType = pageRequest.resourceType();

      // we do not need media and styles
      if (["stylesheet", "image", "media", "font"].includes(resourceType)) {
        pageRequest.abort();
      } else {
        pageRequest.continue();
      }
    });

    const possibleResponses: puppeteer.HTTPResponse[] = [];

    page.on("response", (response) => {
      const resourceType = response.request().resourceType();

      if (resourceType === "document") {
        possibleResponses.push(response);
      }
    });

    // wait until 0 network connections are mady for 500ms
    await page.goto(config.url, { waitUntil: "networkidle0" });

    let response: Response<P, T>;

    if (possibleResponses.length > 1) {
      throw new RequestError("multiple responses to choose from", config);
    } else {
      const puppeteerResponse = possibleResponses[0];
      const body = await puppeteerResponse.text();
      const puppeteerRequest = puppeteerResponse.request();

      response = {
        config,
        // @ts-expect-error
        data: body,
        headers: puppeteerResponse.headers(),
        status: puppeteerResponse.status(),
        statusText: puppeteerResponse.statusText(),
        request: {
          headers: puppeteerRequest.headers(),
          url: puppeteerRequest.url(),
          uri: new URL(puppeteerRequest.url()),
          method: puppeteerRequest.method(),
        },

        toCheerio(): CheerioAPI {
          return load(body);
        },

        toJson(): any {
          return puppeteerResponse.json();
        },
      };
    }

    const cookies = await page.cookies();
    const jar = this.jar;

    // clear cookies from store, so we do not have any possibly conflicting cookies
    await jar.removeAllCookies();

    cookies.forEach(async (cookie) => {
      const toughCookie = fromJSON({
        key: cookie.name,
        value: cookie.value,
        expires: cookie.expires,
        // puppeteer returns leading '.' in domain
        domain: cookie.domain.replace(/^./, ""),
        path: cookie.path,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
      });

      if (toughCookie) {
        const url = response.request.uri.protocol + "//" + cookie.domain.replace(/^./, "");
        await jar.setCookie(toughCookie, url);
      }
    });

    await page.close();
    return response;
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
          const retryAfterValue = error.response?.headers?.["retry-after"];
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
