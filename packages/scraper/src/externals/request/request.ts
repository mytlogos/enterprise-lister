import axios, { AxiosInstance, AxiosResponse } from "axios";
import { fromJSON, CookieJar } from "tough-cookie";
import { wrapper as axiosCookieJarSupport } from "axios-cookiejar-support";
import { CheerioAPI, load } from "cheerio";
import { getQueueKey, queueWork } from "../queueRequest";
import { abortable, deferableTimeout, delay } from "enterprise-core/dist/tools";
import logger from "enterprise-core/dist/logger";
import { Cache } from "enterprise-core/dist/cache";
import { BasicRequestConfig, RequestConfig, Response } from "./types";
import { handleCloudflare } from "./cloudflare";
import { CloudflareHandlerError, RequestError } from "./error";
import { ClientRequest } from "http";
import puppeteer from "puppeteer-extra";
import { HTTPRequest, HTTPResponse, Protocol, Browser, Page } from "puppeteer";
import puppeteerStealthPlugin from "puppeteer-extra-plugin-stealth";
import { getStoreValue, StoreKey } from "enterprise-core/dist/asyncStorage";
puppeteer.use(puppeteerStealthPlugin());

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

// remove pages after 10 minutes of inactivity
const pages = new Cache<string, Promise<Page>>({ stdTTL: 60 * 10, useClones: false, size: 20 });
const pageUsed = new Set<string>();

pages.on("expired", (_key, value: Page) => {
  if (!value.isClosed()) {
    value.close();
  }
});

// Modified from https://www.bannerbear.com/blog/ways-to-speed-up-puppeteer-screenshots/
const minimalArgs = [
  "--autoplay-policy=user-gesture-required",
  "--disable-background-networking",
  "--disable-background-timer-throttling",
  "--disable-backgrounding-occluded-windows",
  "--disable-breakpad",
  "--disable-client-side-phishing-detection",
  "--disable-component-update",
  "--disable-default-apps",
  "--disable-dev-shm-usage",
  "--disable-domain-reliability",
  "--disable-extensions",
  "--disable-features=AudioServiceOutOfProcess",
  "--disable-hang-monitor",
  "--disable-ipc-flooding-protection",
  "--disable-notifications",
  "--disable-offer-store-unmasked-wallet-cards",
  "--disable-popup-blocking",
  "--disable-print-preview",
  "--disable-prompt-on-repost",
  "--disable-renderer-backgrounding",
  "--disable-setuid-sandbox",
  "--disable-speech-api",
  "--disable-sync",
  "--hide-scrollbars",
  "--ignore-gpu-blacklist",
  "--metrics-recording-only",
  "--mute-audio",
  "--no-default-browser-check",
  "--no-first-run",
  "--no-pings",
  "--no-sandbox",
  "--no-zygote",
  "--password-store=basic",
  "--use-mock-keychain",
  "--disable-gpu",
  "--single-process",
];

class BrowserGetter {
  #timeoutId: undefined | NodeJS.Timeout;
  #puppeteerBrowser: Promise<Browser> | undefined;

  /**
   * Get the current browser instance.
   * After 15 minutes without calling this function,
   * the browser will be closed
   * and a new browser will be launched on the next call.
   *
   * @returns a puppeteer browser promise
   */
  public get() {
    // clear timeout
    if (this.#timeoutId != null) {
      clearTimeout(this.#timeoutId);
    }
    // set new timeout
    this.#timeoutId = setTimeout(() => {
      const browserPromise = this.#puppeteerBrowser;
      this.#timeoutId = undefined;
      this.#puppeteerBrowser = undefined;

      browserPromise?.then((browser) => browser.close()).catch(logger.error);
    }, 1000 * 60 * 15);

    // using puppeteer in chromium requires disabling the sandbox
    // disable-gpu for headless environments, e.g. docker
    this.#puppeteerBrowser ??= puppeteer.launch({
      args: minimalArgs,
    });
    return this.#puppeteerBrowser;
  }
}
const browserGetter = new BrowserGetter();

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
        response = await this.#instance.request<string, AxiosResponse, T>({
          ...requestConfig,
          signal: getStoreValue(StoreKey.ABORT),
        });
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
      if (error instanceof CloudflareHandlerError && error.response?.config.method === "get") {
        return this.usePuppeteer(config);
      }
      // rethrow error if should not be handled by puppeteer
      throw error;
    });
  }

  private async usePuppeteer<P = any, T = any, R extends RequestConfig<T> = RequestConfig<T>>(
    config: R,
  ): Promise<Response<P, T>> {
    const signal = getStoreValue(StoreKey.ABORT);
    signal?.throwIfAborted();

    const browser = await browserGetter.get();
    signal?.throwIfAborted();

    const key = getQueueKey(config.url);
    if (!key) {
      throw Error("no queue key for url: " + config.url);
    }

    const page = await pages.get(key, async () => {
      const newPage = await browser.newPage();

      // enable request interception to reduce network load
      // also disables cache
      newPage.setRequestInterception(true);
      newPage.on("request", (pageRequest: HTTPRequest) => {
        const resourceType = pageRequest.resourceType();

        // we do not need media and styles
        if (["stylesheet", "image", "media", "font"].includes(resourceType)) {
          pageRequest.abort();
        } else {
          pageRequest.continue();
        }
      });

      return newPage;
    });
    if (pageUsed.has(key)) {
      throw Error(`Page for key '${key}' is already being used`);
    }
    pageUsed.add(key);

    if (signal) {
      signal.addEventListener(
        "abort",
        () => {
          pages.del(key);
          page.close();
        },
        { once: true },
      );
    }

    const possibleResponses: HTTPResponse[] = [];
    const deferrablePromise = deferableTimeout(1000, 5);

    const responseListener = (response: HTTPResponse) => {
      const resourceType = response.request().resourceType();

      if (resourceType === "document") {
        possibleResponses.push(response);
      }

      if (!deferrablePromise.resolved) {
        deferrablePromise.defer();
      }
    };
    const requestListener = (pageRequest: HTTPRequest) => {
      if (!deferrablePromise.resolved) {
        deferrablePromise.defer();
      }
    };

    page.on("response", responseListener);
    page.on("request", requestListener);

    let content: string;

    try {
      signal?.throwIfAborted();
      await abortable(page.goto(config.url), signal);

      signal?.throwIfAborted();
      // wait until 0 network connections are mady for 1000ms
      await abortable(deferrablePromise.promise, signal);
      content = await page.content();
    } finally {
      pageUsed.delete(key);
      page.off("response", responseListener);
      page.off("request", requestListener);
    }

    let response: Response<P, T>;

    if (possibleResponses.length < 1) {
      throw new RequestError("no responses to choose from", config);
    } else {
      let puppeteerResponse = possibleResponses.find((r) => r.url() === config.url);
      puppeteerResponse ??= possibleResponses[possibleResponses.length - 1];

      signal?.throwIfAborted();
      const puppeteerRequest = puppeteerResponse.request();

      response = {
        config,
        data: content as P,
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
          return load(content);
        },

        toJson(): any {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          return puppeteerResponse!.json();
        },
      };
    }

    signal?.throwIfAborted();
    const cookies = await page.cookies();
    const jar = this.jar;

    // clear cookies from store, so we do not have any possibly conflicting cookies
    await jar.removeAllCookies();

    cookies.forEach(async (cookie: Protocol.Network.Cookie) => {
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

    signal?.throwIfAborted();
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

export const request = new Requestor(undefined, true);
export default request;
