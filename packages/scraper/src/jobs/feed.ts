import logger from "enterprise-core/dist/logger";
import { NewsResult } from "enterprise-core/dist/types";
import feedParserPromised from "feedparser-promised";
import { checkLink } from "../externals/scraperTools";

export const feed = async (feedLink: string): Promise<Readonly<NewsResult>> => {
  logger.info("scraping feed", { url: feedLink });
  const startTime = Date.now();
  // noinspection JSValidateTypes
  return (
    feedParserPromised
      .parse(feedLink)
      .then((items) =>
        Promise.all(
          items.map((value) => {
            return checkLink(value.link, value.title).then((link) => {
              return {
                title: value.title,
                link,
                // FIXME does this seem right?, current date as fallback?
                date: value.pubdate || value.date || new Date(),
              };
            });
          }),
        ),
      )
      .then((value) => {
        const duration = Date.now() - startTime;
        logger.info("scraped feed", { url: feedLink, duration: duration + "ms" });
        return {
          link: feedLink,
          rawNews: value,
        };
      })
      // eslint-disable-next-line prefer-promise-reject-errors
      .catch((error) => Promise.reject({ feed: feedLink, error }))
  );
};
