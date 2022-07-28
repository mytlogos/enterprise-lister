import { Cheerio, Element } from "cheerio";
import { Toc, TocScraper } from "../types";
import { defaultContext, extract, makeRequest, merge } from "./common";
import { HookConfig, TocConfig } from "./types";
import { validate } from "jsonschema";
import { JSONSchema7 } from "json-schema";
import { CustomHookError } from "./errors";
import { getStoreValue, StoreKey } from "enterprise-core/dist/asyncStorage";

const tocSchema: JSONSchema7 = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://example.com/product.schema.json",
  title: "Toc",
  description: "A scraped ToC Object",
  type: "object",
  properties: {
    title: { type: "string" },
    content: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          combiIndex: { type: "number" },
          totalIndex: { type: "integer" },
          partialIndex: { type: "integer" },
          url: { type: "string" },
          // releaseDate?: Date;
          noTime: { type: "boolean" },
          locked: { type: "boolean" },
          tocId: { type: "integer" },
        },
        required: ["title", "combiIndex", "totalIndex", "url"],
      },
    },
    mediumId: { type: "integer" },
    synonyms: { type: "array", items: { type: "string" } },
    mediumType: { type: "integer" },
    partsOnly: { type: "boolean" },
    end: { type: "boolean" },
    link: { type: "string" },
    langCOO: { type: "string" },
    langTL: { type: "string" },
    statusCOO: { type: "integer" },
    statusTl: { type: "integer" },
    authors: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          link: { type: "string" },
        },
      },
    },
    artists: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          link: { type: "string" },
        },
      },
    },
  },
  required: ["title", "content", "mediumType"],
};

function validateItems(items: Array<Partial<Toc>>): Toc[] {
  for (const item of items) {
    validate(item, tocSchema, {
      throwAll: true,
      skipAttributes: ["releaseDate"],
    });
  }
  return items.map((value) => {
    return {
      link: value.link,
      content: value.content,
      title: value.title,
      end: value.end,
      statusTl: value.statusTl,
      mediumType: value.mediumType,
      authors: value.authors,
    };
  }) as Toc[];
}

export function createTocScraper(config: HookConfig): TocScraper | undefined {
  const scraperConfig = config.toc;

  if (!scraperConfig) {
    return;
  }

  const scraper: TocScraper = async (url) => {
    const context = defaultContext();
    let lastUrl = url;

    async function scrape(tocConfig: TocConfig) {
      const $ = await makeRequest(lastUrl, context, tocConfig.request);

      lastUrl = getStoreValue(StoreKey.LAST_REQUEST_URL);
      const baseUri = tocConfig.base || config.base;

      try {
        if (Array.isArray(tocConfig.selector)) {
          return tocConfig.selector.flatMap((selector) =>
            extract($.root() as Cheerio<Element>, selector, baseUri, context),
          );
        } else {
          return extract($.root() as Cheerio<Element>, tocConfig.selector, baseUri, context);
        }
      } catch (error) {
        if (error instanceof CustomHookError) {
          error.data.context = context;
          error.data.html = true;
          error.data.config = config;
          error.data.body = $.html();
        }
        throw error;
      }
    }

    const result = [];

    if (Array.isArray(scraperConfig)) {
      for (const tocConfig of scraperConfig) {
        result.push(...(await scrape(tocConfig)));
      }
    } else {
      result.push(...(await scrape(scraperConfig)));
    }
    const mergedResult = result.reduce((previous, current) => merge(previous, current));
    mergedResult.mediumType = config.medium;
    mergedResult.link = url;
    return validateItems([mergedResult]);
  };

  return scraper;
}
