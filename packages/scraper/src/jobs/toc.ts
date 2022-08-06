import logger from "enterprise-core/dist/logger";
import { hasProp } from "enterprise-core/dist/tools";
import { Optional } from "enterprise-core/dist/types";
import { ScraperError, UrlError, MissingResourceError } from "../externals/errors";
import { tocScraperEntries } from "../externals/hookManager";
import { TocRequest, TocResult, Toc, TocScraper } from "../externals/types";
import { isTocPart } from "../tools";

export const toc = async (value: TocRequest): Promise<TocResult> => {
  const result = await oneTimeToc(value);
  if (!result.tocs.length) {
    throw new ScraperError(`could not find toc for: url=${value.url} mediumId=${value.mediumId || ""}`);
  }
  // TODO implement toc scraping which requires page analyzing
  return {
    tocs: result.tocs,
    uuid: value.uuid,
  };
};

export const oneTimeToc = async ({ url: link, uuid, mediumId, lastRequest }: TocRequest): Promise<TocResult> => {
  logger.info("scraping one time toc", { url: link });
  const path = new URL(link).pathname;

  if (!path) {
    throw new UrlError(`malformed url: '${link}'`, link);
  }
  let allTocPromise: Optional<Promise<Toc[]>>;

  for (const entry of tocScraperEntries()) {
    const regExp = entry[0];

    if (regExp.test(link)) {
      const scraper: TocScraper = entry[1];
      allTocPromise = scraper(link);
      break;
    }
  }

  if (!allTocPromise) {
    // TODO use the default scraper here, after creating it
    logger.warn("no scraper found", { url: link });
    return { tocs: [], uuid };
  }

  let allTocs: Toc[];
  try {
    allTocs = await allTocPromise;
  } catch (e) {
    if (e && hasProp(e, "statusCode") && e.statusCode === 404) {
      throw new MissingResourceError("missing toc resource: " + link, link);
    } else {
      throw e;
    }
  }

  if (!allTocs.length) {
    logger.warn("no tocs found", { url: link });
    return { tocs: [], uuid };
  }
  if (mediumId && allTocs.length === 1) {
    allTocs[0].mediumId = mediumId;
  }
  logger.info("toc scraped successfully", { url: link });
  const today = new Date().toDateString();
  if (lastRequest && lastRequest.toDateString() === today) {
    for (const tocResult of allTocs) {
      for (const tocContent of tocResult.content) {
        if (isTocPart(tocContent)) {
          for (const episode of tocContent.episodes) {
            if (episode.noTime && episode.releaseDate && episode.releaseDate.toDateString() === today) {
              episode.releaseDate = lastRequest;
            }
          }
        } else {
          const episode = tocContent;
          if (episode.noTime && episode.releaseDate && episode.releaseDate.toDateString() === today) {
            episode.releaseDate = lastRequest;
          }
        }
      }
    }
  }
  return { tocs: allTocs, uuid };
};
