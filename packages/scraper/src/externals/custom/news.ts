import { EpisodeNews } from "enterprise-core/dist/types";
import { NewsScraper } from "../types";
import { defaultContext, extract } from "./common";
import { HookConfig } from "./types";
import { CustomHookError } from "./errors";
import { ValidationError } from "enterprise-core/dist/error";
import request from "../request";
import { storeHookName } from "../scraperTools";

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
      throw new ValidationError("Invalid result: " + JSON.stringify(episode, undefined, 4));
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
    storeHookName(config.name);
    const $ = await request.getCheerio({ url: newsConfig.newsUrl });
    const baseUri = newsConfig.base || config.base;
    const context = defaultContext();

    let result;

    try {
      if (Array.isArray(newsConfig.selector)) {
        result = newsConfig.selector.flatMap((selector) => extract($("html"), selector, baseUri, context));
      } else {
        result = extract($("html"), newsConfig.selector, baseUri, context);
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
    result = result.map((value) => {
      value.mediumType = config.medium;

      if (value.date == null) {
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
