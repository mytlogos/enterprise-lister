import { Cheerio, Element } from "cheerio";
import { JSONSchema7 } from "json-schema";
import { validate } from "jsonschema";
import { storeHookName } from "../scraperTools";
import { ContentDownloader, EpisodeContent } from "../types";
import { defaultContext, extract, makeRequest } from "./common";
import { CustomHookError } from "./errors";
import { DownloadConfig, HookConfig } from "./types";

const tocSchema: JSONSchema7 = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://example.com/product.schema.json",
  title: "Toc",
  description: "A scraped ToC Object",
  type: "object",
  properties: {
    episodeTitle: { type: "string" },
    mediumTitle: { type: "string" },
    content: {
      type: "array",
      items: { type: "string" },
    },
    index: { type: "number" },
    locked: { type: "boolean" },
  },
  required: ["episodeTitle", "mediumTitle", "content"],
};

function validateItems(items: Array<Partial<EpisodeContent>>): EpisodeContent[] {
  for (const item of items) {
    validate(item, tocSchema, {
      throwAll: true,
    });
  }
  return items.map((value) => {
    return {
      episodeTitle: value.episodeTitle,
      mediumTitle: value.mediumTitle,
      index: value.index,
      locked: value.locked,
      content: value.content,
    };
  }) as EpisodeContent[];
}

export function createDownloadScraper(config: HookConfig): ContentDownloader | undefined {
  const scraperConfig = config.download;

  if (!scraperConfig) {
    return;
  }

  const scraper: ContentDownloader = async (url) => {
    storeHookName(config.name);

    const context = defaultContext();

    async function scrape(downloadConfig: DownloadConfig) {
      const $ = await makeRequest(url, context, downloadConfig.request);
      const baseUri = downloadConfig.base || config.base;

      try {
        if (Array.isArray(downloadConfig.selector)) {
          return downloadConfig.selector.flatMap((selector) =>
            extract($.root() as Cheerio<Element>, selector, baseUri, context),
          );
        } else {
          return extract($.root() as Cheerio<Element>, downloadConfig.selector, baseUri, context);
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
      for (const downloadConfig of scraperConfig) {
        result.push(...(await scrape(downloadConfig)));
      }
    } else {
      result.push(...(await scrape(scraperConfig)));
    }
    // TODO: the type string[] cannot be mapped currently?
    result.forEach((value) => {
      if (value.content && typeof value.content === "string") {
        value.content = [value.content];
      }
    });
    return validateItems(result);
  };

  return scraper;
}
