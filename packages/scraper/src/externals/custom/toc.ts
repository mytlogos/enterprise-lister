import { queueCheerioRequest } from "../queueManager";
import { Toc, TocScraper } from "../types";
import { extract } from "./common";
import { HookConfig } from "./types";

function validateItems(items: Array<Partial<Toc>>): Toc[] {
  for (const item of items) {
    if (
      typeof item.title !== "string" ||
      typeof item.content !== "object" ||
      typeof item.mediumType !== "number" ||
      typeof item.link !== "string" ||
      (item.mediumId && typeof item.mediumId !== "number") ||
      (item.synonyms && typeof item.synonyms !== "object") ||
      (item.partsOnly && typeof item.partsOnly !== "boolean") ||
      (item.end && typeof item.end !== "boolean") ||
      (item.langCOO && typeof item.langCOO !== "string") ||
      (item.langTL && typeof item.langTL !== "string") ||
      (item.statusCOO && typeof item.statusCOO !== "number") ||
      (item.statusTl && typeof item.statusTl !== "number") ||
      (item.authors && typeof item.authors !== "object") ||
      (item.artists && typeof item.artists !== "object")
    ) {
      throw Error("Invalid result: " + JSON.stringify(item, undefined, 4));
    }
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
    const $ = await queueCheerioRequest(url);
    const baseUri = scraperConfig.base || config.base;

    const result = extract($("body"), scraperConfig.container, baseUri).map((value) => {
      value.mediumType = config.medium;
      return value;
    });

    return validateItems(result);
  };

  return scraper;
}
