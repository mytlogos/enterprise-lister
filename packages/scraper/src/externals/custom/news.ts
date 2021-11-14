import { Cheerio, Element } from "cheerio";
import { sanitizeString, relativeToAbsoluteTime } from "enterprise-core/dist/tools";
import { EpisodeNews } from "enterprise-core/dist/types";
import * as url from "url";
import { queueCheerioRequest } from "../queueManager";
import { NewsScraper } from "../types";
import {
  AttributeSelector,
  HookConfig,
  JsonRegex,
  RegexSelector,
  RegexTransfer,
  Selector,
  SimpleSelector,
  SimpleTransfer,
  TransferType,
} from "./types";

function toRegex(value: RegExp | JsonRegex): RegExp {
  if (value instanceof RegExp) {
    return value;
  }
  return new RegExp(value.pattern, value.flags);
}

function extractFromRegex(value: string, regex: RegExp, ...replace: string[]) {
  const match = regex.exec(value);

  if (!match) {
    return;
  }

  for (let index = 0; index < match.length; index++) {
    const groupValue = match[index] || "";
    const replaceRegex = new RegExp("\\$" + index);

    for (let rIndex = 0; rIndex < replace.length; rIndex++) {
      replace[rIndex] = replace[rIndex].replace(replaceRegex, groupValue);
    }
  }
  return replace;
}

function coerceType(value: string, type: TransferType): string | number | Date {
  if (!value) {
    throw Error("Empty value");
  }
  if (type === "date") {
    const lowerDate = value.toLowerCase();

    if (lowerDate.includes("now") || lowerDate.includes("ago")) {
      const date = relativeToAbsoluteTime(value);

      if (!date) {
        throw Error(`Could not coerce value '${value}' into a date`);
      }
      return date;
    } else {
      return new Date(value);
    }
  }
  if (type === "decimal") {
    const decimal = Number(value);

    if (Number.isNaN(decimal)) {
      throw Error(`Could not coerce value '${value}' into a decimal`);
    }
    return decimal;
  }
  if (type === "integer") {
    const integer = Number(value);

    if (!Number.isInteger(integer)) {
      throw Error(`Could not coerce value '${value}' into a integer`);
    }
    return integer;
  }

  if (type === "string") {
    return value;
  }
  throw Error("unknown type " + type);
}

function getAttributeValue(element: Cheerio<Element>, attribute: AttributeSelector, base: string) {
  let attrValue = element.attr(attribute.attribute);

  if (attrValue === undefined) {
    throw Error("Attribute Value is undefined");
  }

  if (attribute.resolve === true) {
    attrValue = new url.URL(attrValue, base).href;
  } else if (attribute.resolve) {
    attrValue = new url.URL(attrValue, attribute.resolve).href;
  }

  if ("regex" in attribute) {
    const extractions = extractFromRegex(attrValue, toRegex(attribute.regex), attribute.replace);

    if (!extractions) {
      throw Error(`Could not transform value: ${attrValue} to ${attribute.replace}`);
    }
    attrValue = extractions[0];
  }
  return attrValue;
}

function applyBasicSelector(
  element: Cheerio<Element>,
  selector: SimpleSelector,
  base: string,
  result: Partial<EpisodeNews> = {},
) {
  const transfers: Array<SimpleTransfer<EpisodeNews>> = selector.transfers || [];

  let text: string | undefined = undefined;

  for (const transfer of transfers) {
    let value: string;

    if (transfer.extract) {
      value = getAttributeValue(element, transfer.extract, base);
    } else {
      if (text == undefined) {
        text = sanitizeString(element.text().trim());
      }
      value = text;
    }

    try {
      // @ts-expect-error
      result[transfer.targetKey] = coerceType(value, transfer.type);
    } catch (error) {
      if (!transfer.optional) {
        throw error;
      }
    }
  }
  return result;
}

function applyRegexSelector(
  element: Cheerio<Element>,
  selector: RegexSelector,
  base: string,
  result: Partial<EpisodeNews> = {},
) {
  const transfers: Array<RegexTransfer<EpisodeNews>> = selector.transfers || [];

  let match: RegExpExecArray | null | undefined = undefined;

  for (const transfer of transfers) {
    let value: string;

    if (typeof transfer.extract === "object") {
      value = getAttributeValue(element, transfer.extract, base);
    } else {
      if (match === undefined) {
        const text = sanitizeString(element.text().trim());
        match = toRegex(selector.regex).exec(text);

        if (!match) {
          throw Error(`Could not match regex to text '${text}'`);
        }
      }

      value = transfer.extract;

      for (let index = 0; index < match.length; index++) {
        const groupValue = match[index] || "";
        const replaceRegex = new RegExp("\\$" + index + "(\\D|$)");
        value = value.replace(replaceRegex, groupValue);
      }
    }

    try {
      // @ts-expect-error
      result[transfer.targetKey] = coerceType(value, transfer.type);
    } catch (error) {
      if (!transfer.optional) {
        throw error;
      }
    }
  }
  return result;
}

function applySelector(element: Cheerio<Element>, selector: Selector, base: string) {
  if ("regex" in selector) {
    return applyRegexSelector(element, selector, base);
  } else {
    return applyBasicSelector(element, selector, base);
  }
}

function extract(element: Cheerio<Element>, selector: Selector, baseUri: string): Array<Partial<EpisodeNews>> {
  const found = element.find(selector.selector);
  console.log(`Matched selector ${selector.selector} found ${found.length} matches`);
  let results: Array<Partial<EpisodeNews>> = [];

  if (selector.multiple && found.length > 1) {
    for (let index = 0; index < found.length; index++) {
      results.push(applySelector(found.eq(index), selector, baseUri));
    }
  } else if (found.length === 1) {
    results.push(applySelector(found, selector, baseUri));
  } else {
    throw Error("Invalid Selector: no exact match found for: " + selector.selector);
  }
  if (selector.children?.length) {
    const nextBuckets: Array<Array<Array<Partial<EpisodeNews>>>> = Array.from({ length: results.length }, () => []);

    // merge children with 'parent' results with children overriding parents
    for (const child of selector.children) {
      // length of 'found' and 'results' must be the same
      for (let index = 0; index < found.length; index++) {
        const extractResults = extract(found.eq(index), child, baseUri);
        nextBuckets[index].push(extractResults);
      }
    }

    const nextResults: Array<Partial<EpisodeNews>> = [];

    for (let index = 0; index < results.length; index++) {
      const currentPartial = results[index];
      const nexts = nextBuckets[index];

      let multipleBucket: Array<Partial<EpisodeNews>> | undefined = undefined;

      for (const bucket of nexts) {
        if (bucket.length > 1) {
          if (multipleBucket != undefined) {
            throw Error("Multiple Child Selectors of the same parent with multiple=true are not allowed");
          }
          multipleBucket = bucket;
        } else {
          const [partial] = bucket;
          Object.assign(currentPartial, partial);
        }
      }

      if (multipleBucket) {
        for (const partial of multipleBucket) {
          nextResults.push(Object.assign(partial, currentPartial));
        }
      } else {
        nextResults.push(currentPartial);
      }
    }
    results = nextResults;
  }
  return results;
}

function validateEpisodeNews(episodes: Array<Partial<EpisodeNews>>): EpisodeNews[] {
  for (const episode of episodes) {
    if (
      typeof episode.mediumTitle !== "string" ||
      typeof episode.mediumType !== "number" ||
      typeof episode.episodeTitle !== "string" ||
      typeof episode.episodeIndex !== "number" ||
      typeof episode.episodeTotalIndex !== "number" ||
      typeof episode.link !== "string" ||
      !(episode.date instanceof Date) ||
      (episode.mediumTocLink && typeof episode.mediumTocLink !== "string") ||
      (episode.partIndex && typeof episode.partIndex !== "number") ||
      (episode.partTotalIndex && typeof episode.partTotalIndex !== "number") ||
      (episode.partPartialIndex && typeof episode.partPartialIndex !== "number") ||
      (episode.episodePartialIndex && typeof episode.episodePartialIndex !== "number") ||
      (episode.locked && typeof episode.locked !== "boolean")
    ) {
      throw Error("Invalid result: " + JSON.stringify(episode, undefined, 4));
    }
  }
  return episodes.map((value) => {
    return {
      mediumTocLink: value.mediumTocLink,
      mediumTitle: value.mediumTitle,
      mediumType: value.mediumType,
      partIndex: value.partIndex,
      partTotalIndex: value.partTotalIndex,
      partPartialIndex: value.partPartialIndex,
      episodeTotalIndex: value.episodeTotalIndex,
      episodePartialIndex: value.episodePartialIndex,
      episodeIndex: value.episodeIndex,
      episodeTitle: value.episodeTitle,
      link: value.link,
      date: value.date,
    };
  }) as EpisodeNews[];
}

export function createNewsScraper(config: HookConfig): NewsScraper | undefined {
  if (!config.news) {
    return;
  }
  const newsConfig = config.news;

  const scraper: NewsScraper = async () => {
    const $ = await queueCheerioRequest(newsConfig.newsUrl);
    const baseUri = newsConfig.base || config.base;
    const result = extract($("body"), newsConfig.container, baseUri).map((value) => {
      value.mediumType = config.medium;

      if (value.date == undefined) {
        value.date = new Date();
      }
      return value;
    });

    return {
      episodes: validateEpisodeNews(result),
    };
  };

  scraper.link = config.base;
  return scraper;
}
