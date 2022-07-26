import { MediaType, relativeToAbsoluteTime } from "enterprise-core/dist/tools";
import { NewsScraper, TocScraper, TocSearchScraper, SearchScraper, ContentDownloader } from "../types";
import { HookConfig, JsonRegex, RequestConfig } from "./types";
import Xray, { Selector } from "x-ray";
import jsonpath from "jsonpath";
import logger from "enterprise-core/dist/logger";
import { Context } from "vm";
import { extractFromRegex } from "../custom/common";
import { CustomHookError, CustomHookErrorCodes } from "../custom/errors";
import { queueRequest } from "../queueManager";
import { SearchResult } from "enterprise-core/dist/types";

type Conditional<T, R> = T extends undefined ? undefined : R;

export interface CustomHook<T extends HookConfig = HookConfig> {
  name: string;
  medium: MediaType;
  disabled?: boolean;
  domainReg?: RegExp;
  tocPattern?: RegExp; // used for toc discover
  redirectReg?: RegExp;
  newsAdapter: Conditional<T["news"], NewsScraper>;
  tocAdapter: Conditional<T["toc"], TocScraper>;
  tocSearchAdapter: Conditional<T["news"], TocSearchScraper>;
  searchAdapter: Conditional<T["search"], SearchScraper>;
  contentDownloadAdapter: Conditional<T["download"], ContentDownloader>;
}

export function createHook<T extends HookConfig>(config: T): CustomHook<T> {
  return {
    medium: config.medium,
    name: config.name,
    domainReg: toRegex(config.domain),
    // @ts-expect-error
    newsAdapter: createNewsScraper(config),
    // @ts-expect-error
    tocAdapter: createTocScraper(config),
    // @ts-expect-error
    contentDownloadAdapter: createDownloadScraper(config),
    // @ts-expect-error
    searchAdapter: createSearchScraper(config),
  };
}

function toRegex(value: RegExp | JsonRegex): RegExp {
  if (value instanceof RegExp) {
    return value;
  }
  return new RegExp(value.pattern, value.flags);
}

function createScraper(regexes: Record<string, JsonRegex>) {
  const parsedRegex: Record<string, RegExp> = {};
  Object.entries(regexes).forEach(([key, value]) => {
    parsedRegex[key] = toRegex(value);
  });
  return Xray({
    filters: {
      trim: function (value: any) {
        return typeof value === "string" ? value.trim() : value;
      },
      toIndex(value: any, name: string, index: string) {
        if (!value) {
          return;
        }
        const regex = parsedRegex[name];
        if (!regex) {
          throw Error(`error="unknown regex" name=${name}`);
        }
        const match = regex.exec(value.trim());

        if (!match) {
          console.log("no match:", value);
          return;
        }
        // @ts-expect-error
        return match[index];
      },
      relative(value) {
        if (!value) {
          return;
        }
        return relativeToAbsoluteTime(value.trim());
      },
    },
  });
}

function createNewsScraper(config: HookConfig): NewsScraper | undefined {
  const newsConfig = config.news;
  if (!newsConfig) {
    return;
  }
  const x = createScraper(newsConfig.regexes);

  const scraper: NewsScraper = async () => {
    const results = [];
    for (const datum of newsConfig.data) {
      const selector: Selector = {
        mediumTitle: datum.mediumTitle,
        mediumTocLink: datum.mediumTocLink,
      };
      if (datum.type === "nested") {
        const releases = Object.assign({}, datum.releases, { _$: undefined });
        selector.releases = x(datum.releases._$, [releases]);
      } else {
        Object.assign(selector, datum, { _$: undefined, _request: undefined });
      }
      results.push(await x(newsConfig.newsUrl, datum._$, [selector]));
    }
    return results.reduce((previous, current) => [...previous, ...current], []);
  };
  scraper.link = config.base;
  return scraper;
}

function createTocScraper(config: HookConfig): TocScraper | undefined {
  const tocConfig = config.toc;
  if (!tocConfig) {
    return;
  }
  const x = createScraper(tocConfig.regexes);

  const scraper: TocScraper = async (link: string) => {
    const results = [];
    for (const datum of tocConfig.data) {
      const selector = {
        ...datum,
        _$: undefined,
        _request: undefined,
      };
      if (datum.content) {
        // @ts-expect-error
        selector.content = x(datum.content._$, [
          {
            ...datum.content,
            _$: undefined,
          } as unknown as Selector,
        ]);
      }
      if (datum._request) {
        const html = await makeRequest(link, {}, datum._request);
        results.push(await x(html, datum._$, [selector as unknown as Selector]));
      } else {
        results.push(await x(link, datum._$, [selector as unknown as Selector]));
      }
    }
    return merge(results);
  };
  scraper.hookName = config.name;
  return scraper;
}

function merge<T>(results: T[]): T {
  return results.reduce((previous, current) => {
    if (Array.isArray(current) && Array.isArray(previous)) {
      const smaller = previous.length < current.length ? previous : current;
      const bigger = previous.length >= current.length ? current : previous;
      const result = [];

      for (let index = 0; index < smaller.length; index++) {
        const previousElement = previous[index];
        const currentElement = current[index];
        result.push(Object.assign(previousElement, currentElement));
      }
      for (let index = smaller.length; index < bigger.length; index++) {
        result.push(bigger[index]);
      }
      return result as unknown as T;
    } else if (!Array.isArray(current) && !Array.isArray(previous)) {
      return Object.assign(previous, current);
    } else {
      throw Error("incompatible results: array and object");
    }
  });
}

function createDownloadScraper(config: HookConfig): ContentDownloader | undefined {
  const downloadConfig = config.download;
  if (!downloadConfig) {
    return;
  }

  const x = createScraper(downloadConfig.regexes);

  const scraper: ContentDownloader = async (link) => {
    const results = [];
    for (const datum of downloadConfig.data) {
      const selector = {
        ...datum,
        _$: undefined,
        _request: undefined,
        content: [datum.content],
      };
      if (datum._request) {
        const html = await makeRequest(link, {}, datum._request);
        results.push(await x(html, datum._$, [selector as unknown as Selector]));
      } else {
        results.push(await x(link, datum._$, [selector as unknown as Selector]));
      }
    }
    return merge(results);
  };
  scraper.hookName = config.name;
  return scraper;
}

function createSearchScraper(config: HookConfig): SearchScraper | undefined {
  const searchConfig = config.search;
  if (!searchConfig) {
    return;
  }
  const scraper: SearchScraper = async (text) => {
    const results = [];
    for (const datum of searchConfig.data) {
      if (datum._request) {
        const json = await makeRequest(searchConfig.searchUrl, { variables: { search: text } }, datum._request);

        const array = jsonpath.query(json, datum._$);
        results.push(
          array.map((value): SearchResult => {
            return {
              link: jsonpath.query(value, datum.link)[0],
              medium: config.medium,
              title: jsonpath.query(value, datum.title)[0],
              author: datum.author && jsonpath.query(value, datum.author)[0],
              coverUrl: datum.coverUrl && jsonpath.query(value, datum.coverUrl)[0],
            };
          }),
        );
      }
    }
    return merge(results);
  };
  scraper.medium = config.medium;
  return scraper;
}

/**
 * Template the string 'value' with the values of context.
 * A Template is something like: '{search}', it is whitespace sensitive.
 * So '{search}' != '{ search }'
 */
function templateString(value: string, context: Context): string {
  const originalValue = value;
  const braces: Array<{ type: string; index: number }> = [];
  let lastBrace: { type: string; index: number } | undefined;

  for (let index = 0; index < value.length; index++) {
    const char = value[index];

    if (char === "{") {
      if (lastBrace && lastBrace.type === char) {
        throw new CustomHookError(
          "Two consecutive opening braces are not allowed!",
          CustomHookErrorCodes.TEMPLATE_MISSING_CLOSE_BRACE,
          {
            currentIndex: index,
            lastBrace,
            template: value,
          },
        );
      } else {
        lastBrace = { type: char, index };
        braces.push(lastBrace);
      }
    } else if (char === "}") {
      if (!lastBrace || lastBrace.type === char) {
        throw new CustomHookError("Missing Opening Brace!", CustomHookErrorCodes.TEMPLATE_MISSING_OPEN_BRACE, {
          currentIndex: index,
          lastBrace,
          template: value,
        });
      } else {
        lastBrace = { type: char, index };
        braces.push(lastBrace);
      }
    }
  }

  if (braces.length % 2 !== 0) {
    throw new CustomHookError("Missing Closing Brace!", CustomHookErrorCodes.TEMPLATE_MISSING_CLOSE_BRACE, {
      currentIndex: undefined,
      lastBrace,
      template: value,
    });
  }

  const replaceables: Record<string, string> = {};

  for (let index = 0; index < braces.length; index += 2) {
    const opening = braces[index];
    const closing = braces[index + 1];

    const originalName = value.slice(opening.index + 1, closing.index);
    let variableName = originalName;

    const match = variableName.match(/(\w{1,100})\[(\d{1,5})]/);

    if (match) {
      variableName = match[1];
    }

    if (!(variableName in context.variables)) {
      throw new CustomHookError(
        `Unknown Variable '${variableName}', original: '${originalName}'!`,
        CustomHookErrorCodes.TEMPLATE_UNKNOWN_VARIABLE,
        {
          opening,
          closing,
          originalVariableName: originalName,
          variableName,
          template: value,
        },
      );
    }

    let variableValue = context.variables[variableName];

    if (match) {
      variableValue = variableValue[Number(match[2])];
    }

    if (variableValue == null) {
      throw new CustomHookError(
        `Variable '${originalName}' has no value!`,
        CustomHookErrorCodes.TEMPLATE_VARIABLE_NO_VALUE,
        {
          originalVariableName: originalName,
          variableName,
          template: value,
        },
      );
    }

    replaceables[originalName] = variableValue;
  }

  for (const [replaceName, replaceValue] of Object.entries(replaceables)) {
    value = value.replaceAll(`{${replaceName}}`, replaceValue);
  }
  logger.debug(`Templated Value '${originalValue}' into ${value}`);
  return value;
}

function makeRequest(targetUrl: string, context: Context, requestConfig?: RequestConfig): Promise<string | any> {
  // @ts-expect-error
  const options: Options = {};

  if (requestConfig) {
    if (requestConfig.regexUrl && requestConfig.transformUrl) {
      const transformedUrl = extractFromRegex(targetUrl, toRegex(requestConfig.regexUrl), requestConfig.transformUrl);

      if (!transformedUrl) {
        throw new CustomHookError("URL Transformation failed", CustomHookErrorCodes.REQUEST_URL_TRANSFORMATION_FAIL, {
          requestConfig,
          targetUrl,
        });
      }

      targetUrl = transformedUrl[0];
    }
    if (requestConfig.templateUrl) {
      targetUrl = templateString(requestConfig.templateUrl, context);
    }
    if (requestConfig.templateBody) {
      options.body = templateString(requestConfig.templateBody, context);
    }
    if (requestConfig.options) {
      Object.assign(options, requestConfig.options);
    }
  }
  options.url = targetUrl;

  logger.debug("Requesting url: " + targetUrl);
  if (requestConfig?.jsonResponse) {
    return queueRequest(targetUrl, options).then((value) => JSON.parse(value));
  } else {
    return queueRequest(targetUrl, options);
  }
}
