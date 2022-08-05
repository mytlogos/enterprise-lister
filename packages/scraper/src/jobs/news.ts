import {
  mediumInWaitStorage,
  mediumStorage,
  episodeStorage,
  partStorage,
} from "enterprise-core/dist/database/storages/storage";
import { DatabaseError, MissingEntityError, ValidationError } from "enterprise-core/dist/error";
import logger from "enterprise-core/dist/logger";
import { getElseSet, MediaType, max, combiIndex } from "enterprise-core/dist/tools";
import {
  NewsResult,
  EpisodeNews,
  MediumInWait,
  Optional,
  LikeMedium,
  SimpleEpisode,
  EpisodeRelease,
  News,
} from "enterprise-core/dist/types";
import validate from "validate.js";
import { sourceType } from "../externals/direct/undergroundScraper";
import { getHook } from "../externals/hookManager";
import { NewsScraper } from "../externals/types";

export const scrapeNewsJob = async (name: string): Promise<NewsResult> => {
  const hook = getHook(name);

  if (!hook.newsAdapter) {
    throw new ValidationError(`expected hook '${name}' to have newsAdapter`);
  }

  return scrapeNews(hook.newsAdapter);
};

export const scrapeNews = async (adapter: NewsScraper): Promise<NewsResult> => {
  if (!adapter.link || !validate.isString(adapter.link)) {
    throw new ValidationError("missing link on newsScraper");
  }
  logger.info("Scraping for News", { url: adapter.link });
  const rawNews = await adapter();

  if (rawNews?.episodes?.length) {
    logger.info("Scraped Episode News", { count: rawNews.episodes.length, url: adapter.link });

    const episodeMap: Map<string, EpisodeNews[]> = rawNews.episodes.reduce((map, currentValue) => {
      const episodeNews = getElseSet(map, currentValue.mediumTitle + "%" + currentValue.mediumType, () => []);
      episodeNews.push(currentValue);
      return map;
    }, new Map<string, EpisodeNews[]>());

    const promises = [];
    for (const value of episodeMap.values()) {
      const [newsItem] = value;
      if (!newsItem || !newsItem.mediumTitle || !newsItem.mediumType) {
        continue;
      }
      promises.push(
        processMediumNews(newsItem.mediumTitle, newsItem.mediumType, newsItem.mediumTocLink, value, rawNews.update),
      );
    }
    const newMediumInWaits = (await Promise.all(promises)).filter((v) => v);
    await mediumInWaitStorage.addMediumInWait(newMediumInWaits as MediumInWait[]);
  }
  return {
    link: adapter.link,
    rawNews: rawNews?.news || [],
  };
};

export const news = async (link: string): Promise<{ link: string; result: News[] }> => {
  return {
    link,
    result: [],
  };
  // TODO implement news scraping (from home, updates pages etc. which require page analyzing, NOT feed or adapter)
};

async function processMediumNews(
  title: string,
  type: MediaType,
  tocLink: Optional<string>,
  potentialNews: EpisodeNews[],
  update = false,
): Promise<MediumInWait | undefined> {
  const likeMedium: LikeMedium = await mediumStorage.getLikeMedium({ title, type });

  if (!likeMedium || !likeMedium.medium || !likeMedium.medium.id) {
    if (tocLink) {
      return { title, medium: type, link: tocLink };
    }
    return;
  }
  const mediumId = likeMedium.medium.id;
  const latestReleases: SimpleEpisode[] = await episodeStorage.getLatestReleases(mediumId);

  const latestRelease = max(latestReleases, (previous, current) => {
    const maxPreviousRelease = max(previous.releases, "releaseDate");
    const maxCurrentRelease = max(current.releases, "releaseDate");

    return (maxPreviousRelease?.releaseDate.getTime() || 0) - (maxCurrentRelease?.releaseDate.getTime() || 0);
  });

  let standardPart = await partStorage.getStandardPart(mediumId);

  if (!standardPart) {
    standardPart = await partStorage.createStandardPart(mediumId);
  }

  if (!standardPart || !standardPart.id) {
    throw new DatabaseError(`could not create standard part for mediumId: '${mediumId}'`);
  }

  let newEpisodeNews: EpisodeNews[];

  if (latestRelease) {
    const oldReleases: EpisodeNews[] = [];
    newEpisodeNews = potentialNews.filter((value) => {
      if (value.episodeIndex > combiIndex(latestRelease)) {
        return true;
      } else {
        oldReleases.push(value);
        return false;
      }
    });
    const indexReleaseMap: Map<number, EpisodeRelease> = new Map();

    const oldEpisodeIndices = oldReleases.map((value) => {
      indexReleaseMap.set(value.episodeIndex, {
        title: value.episodeTitle,
        url: value.link,
        releaseDate: value.date,
        locked: value.locked,
        episodeId: 0,
      });
      return value.episodeIndex;
    });

    if (oldEpisodeIndices.length) {
      const episodes = await episodeStorage.getMediumEpisodePerIndex(mediumId, oldEpisodeIndices);
      const promises = episodes.map((value) => {
        const index = combiIndex(value);
        const release = indexReleaseMap.get(index);

        if (!release) {
          throw new MissingEntityError(
            `missing release, queried for episode but got no release source for: '${index}'`,
          );
        }
        if (value.releases.find((prevRelease) => prevRelease.url === release.url)) {
          return Promise.resolve();
        }
        if (!value.id) {
          return episodeStorage
            .addEpisode({
              id: 0,
              // @ts-expect-error
              partId: standardPart.id,
              partialIndex: value.partialIndex,
              totalIndex: value.totalIndex,
              releases: [release],
            })
            .then(() => undefined);
        }
        release.episodeId = value.id;
        return episodeStorage.addRelease(release).then(() => undefined);
      });
      await Promise.all(promises);
    }
    if (update) {
      const sourcedReleases = await episodeStorage.getSourcedReleases(sourceType, mediumId);
      const toUpdateReleases = oldReleases
        .map((value): EpisodeRelease => {
          return {
            title: value.episodeTitle,
            url: value.link,
            releaseDate: value.date,
            locked: value.locked,
            sourceType,
            episodeId: 0,
          };
        })
        .filter((value) => {
          const foundRelease = sourcedReleases.find((release) => release.title === value.title);

          if (!foundRelease) {
            logger.warn("wanted to update an unavailable release", { release_title: value.title });
            return false;
          }
          return foundRelease.url !== value.url;
        });
      if (toUpdateReleases.length) {
        episodeStorage.updateRelease(toUpdateReleases).catch(logger.error);
      }
    }
  } else {
    newEpisodeNews = potentialNews;
  }
  const newEpisodes = newEpisodeNews.map((value): SimpleEpisode => {
    return {
      totalIndex: value.episodeTotalIndex,
      partialIndex: value.episodePartialIndex,
      releases: [
        {
          episodeId: 0,
          releaseDate: value.date,
          url: value.link,
          locked: value.locked,
          title: value.episodeTitle,
        },
      ],
      id: 0,
      // @ts-expect-error
      partId: standardPart.id,
    };
  });

  if (newEpisodes.length) {
    await episodeStorage.addEpisode(newEpisodes);
  }
  if (tocLink) {
    await mediumStorage.addToc(mediumId, tocLink);
  }
}
