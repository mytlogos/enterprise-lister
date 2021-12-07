import { HookConfig, SearchConfig } from "./types";

import { JSONSchema7 } from "json-schema";
import { validate } from "jsonschema";
import { SearchScraper } from "../types";
import { defaultContext, extractJSON, makeRequest } from "./common";
import { SearchResult } from "enterprise-core/dist/types";
import { CustomHookError } from "./errors";

const tocSchema: JSONSchema7 = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://example.com/product.schema.json",
  title: "SearchResult",
  type: "object",
  properties: {
    link: { type: "string" },
    title: { type: "string" },
    medium: { type: "integer" },
    author: { type: "string" },
    coverUrl: { type: "string" },
  },
  required: ["link", "medium"],
};

function validateItems(items: Array<Partial<SearchResult>>): SearchResult[] {
  for (const item of items) {
    validate(item, tocSchema, {
      throwAll: true,
    });
  }
  return items.map((value) => {
    return {
      link: value.link,
      medium: value.medium,
      coverUrl: value.coverUrl,
      title: value.title,
      author: value.author,
    };
  }) as SearchResult[];
}

export function createSearchScraper(config: HookConfig): SearchScraper | undefined {
  const scraperConfig = config.search;

  if (!scraperConfig) {
    return;
  }

  const scraper: SearchScraper = async (text) => {
    const context = defaultContext();
    // @ts-expect-error
    context.variables.PARAM = [text];

    async function scrape(searchConfig: SearchConfig) {
      const value = await makeRequest(searchConfig.searchUrl, context, searchConfig.request);

      try {
        if (Array.isArray(searchConfig.selector)) {
          return searchConfig.selector.flatMap((selector) => extractJSON(value, selector, context));
        } else {
          return extractJSON(value, searchConfig.selector, context);
        }
      } catch (error) {
        if (error instanceof CustomHookError) {
          error.data.context = context;
          error.data.json = true;
          error.data.config = config;
          error.data.body = value;
        }
        throw error;
      }
    }

    const result: Array<Partial<SearchResult>> = await scrape(scraperConfig);
    result.forEach((value) => {
      value.medium = config.medium;
    });
    return validateItems(result);
  };

  scraper.medium = config.medium;
  return scraper;
}
