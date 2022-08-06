import { storage } from "enterprise-core/dist/database/storages/storage";
import { ValidationError } from "enterprise-core/dist/error";
import logger from "enterprise-core/dist/logger";
import { maxValue } from "enterprise-core/dist/tools";
import { TocSearchMedium, Optional } from "enterprise-core/dist/types";
import { getHook } from "../externals/hookManager";
import { TocResult, TocSearchScraper, Toc } from "../externals/types";

export async function searchForTocJob(name: string, item: TocSearchMedium): Promise<TocResult> {
  logger.info("searching for toc", { name, search: JSON.stringify(item) });

  const hook = getHook(name);

  if (!hook.tocSearchAdapter) {
    throw new ValidationError("expected hook with tocSearchAdapter");
  }
  return searchForToc(item, hook.tocSearchAdapter);
}

export async function searchForToc(item: TocSearchMedium, searcher: TocSearchScraper): Promise<TocResult> {
  const link = searcher.link;
  if (!link) {
    throw new ValidationError(`TocSearcher of mediumType: ${item.medium} has no link`);
  }

  const pageInfoKey = "search" + item.mediumId;
  const result = await storage.getPageInfo(link, pageInfoKey);
  const dates = result.values.map((value) => new Date(value)).filter((value) => !Number.isNaN(value.getDate()));
  const maxDate = maxValue(dates);

  if (maxDate && maxDate.toDateString() === new Date().toDateString()) {
    // don't search on the same page the same medium twice in a day
    return { tocs: [] };
  }
  let newToc: Optional<Toc>;
  try {
    newToc = await searcher(item);
  } finally {
    await storage.updatePageInfo(link, pageInfoKey, [new Date().toDateString()], result.values);
  }
  const tocs = [];

  if (newToc) {
    newToc.mediumId = item.mediumId;
    tocs.push(newToc);
  }
  return { tocs };
}
