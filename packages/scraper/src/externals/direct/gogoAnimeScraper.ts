import { EpisodeContent, Hook, Toc, TocEpisode, NewsScrapeResult } from "../types";
import { equalsIgnore, extractIndices, MediaType, sanitizeString } from "enterprise-core/dist/tools";
import { EpisodeNews, ReleaseState, SearchResult, TocSearchMedium, VoidablePromise } from "enterprise-core/dist/types";
import { queueCheerioRequest, queueRequest } from "../queueManager";
import * as cheerio from "cheerio";
import logger from "enterprise-core/dist/logger";
import * as url from "url";
import { checkTocContent } from "../scraperTools";
import { getText, LogType, scraperLog, SearchResult as TocSearchResult, searchToc } from "./directTools";
import { UrlError } from "../errors";

const BASE_URI = "https://www.gogoanime.vc/";

async function scrapeNews(): Promise<NewsScrapeResult> {
  const uri = BASE_URI;
  const $ = await queueCheerioRequest(uri);

  const newsRows = $(".items li");

  const news: EpisodeNews[] = [];
  const titlePattern = /Episode\s*((\d+)(\.(\d+))?)/i;
  const linkPattern = /(.+\/\/.+\/)(.+)-episode-\d+(-\d+)?$/;

  for (let i = 0; i < newsRows.length; i++) {
    const newsRow = newsRows.eq(i);

    const mediumElement = newsRow.find(".name a");
    const link = new url.URL(mediumElement.attr("href") as string, uri).href;
    const linkMatch = linkPattern.exec(link);

    if (!linkMatch) {
      scraperLog("warn", LogType.CONTENT_FORMAT, "gogoanime", {
        url: link,
      });
      continue;
    }
    const tocLink = linkMatch[1] + "category/" + linkMatch[2];

    const episodeTitleElement = newsRow.children(".episode");

    const mediumTitle = sanitizeString(getText(mediumElement));

    const rawTitle = sanitizeString(getText(episodeTitleElement));
    const groups = titlePattern.exec(rawTitle);

    if (!groups) {
      scraperLog("warn", LogType.TITLE_FORMAT, "gogoanime", {
        url: link,
        unknown_title: rawTitle,
      });
      continue;
    }

    const episodeTitle = sanitizeString(groups[0]);
    const episodeIndices = extractIndices(groups, 1, 2, 4);
    if (!episodeIndices) {
      scraperLog("warn", LogType.INDEX_FORMAT, "gogoanime", {
        url: link,
        unknown_index: episodeTitle,
      });
      continue;
    }
    news.push({
      link,
      mediumType: MediaType.VIDEO,
      mediumTocLink: tocLink,
      mediumTitle,
      episodeTitle,
      episodeIndex: episodeIndices.combi,
      episodeTotalIndex: episodeIndices.total,
      episodePartialIndex: episodeIndices.fraction,
      date: new Date(),
    });
  }
  if (!news.length) {
    return {};
  }

  return { episodes: news };
}

async function scrapeToc(urlString: string): Promise<Toc[]> {
  const animeAliasReg = /^https?:\/\/(www\d*\.)?gogoanime\.(vc|wiki)\/category\/(.+)/;
  const aliasExec = animeAliasReg.exec(urlString);

  if (!aliasExec) {
    throw new UrlError("invalid toc url for GogoAnime: " + urlString, urlString);
  }
  const animeAlias = aliasExec[3];

  const $ = await queueCheerioRequest(urlString);
  const contentElement = $(".content_left .main_body");

  const animeTitle = sanitizeString(getText(contentElement.find("h1")));

  if (!animeTitle) {
    scraperLog("warn", LogType.MEDIUM_TITLE_FORMAT, "gogoanime", {
      url: urlString,
    });
    return [];
  }

  const episodePages = contentElement.find("#episode_page li");
  if (episodePages.length < 1) {
    scraperLog("warn", LogType.NO_EPISODES, "gogoanime", {
      url: urlString,
    });
    return [];
  }
  const content: TocEpisode[] = [];
  const pageReg = /\d+\s*-\s*(\d+)/;
  let maxEpisodeIndex = 0;

  for (let i = 0; i < episodePages.length; i++) {
    const episodePage = episodePages.eq(i);
    const exec = pageReg.exec(getText(episodePage));

    if (!exec) {
      logger.warn("could not match toc episode Page text", {
        scraper: "gogoanime",
        url: urlString,
      });
      continue;
    }
    const pageMaxIndex = Number(exec[1]);
    maxEpisodeIndex = Math.max(pageMaxIndex, maxEpisodeIndex);
  }

  // assuming every anime starts from 1 (ignore the minority which starts from zero)
  for (let i = 1; i <= maxEpisodeIndex; i++) {
    const episodeContent = {
      title: `Episode ${i}`,
      combiIndex: i,
      totalIndex: i,
      url: `https://www.gogoanime.vc/${animeAlias}-episode-${i}`,
    };
    checkTocContent(episodeContent);
    content.push(episodeContent);
  }
  const infoElements = $("p.type");
  let releaseStateElement = null;

  for (let i = 0; i < infoElements.length; i++) {
    const element = infoElements.eq(i);

    if (getText(element).toLocaleLowerCase().includes("status")) {
      releaseStateElement = element.parent();
    }
  }
  let releaseState: ReleaseState = ReleaseState.Unknown;

  if (releaseStateElement) {
    const releaseStateString = getText(releaseStateElement).toLowerCase();
    if (releaseStateString.includes("complete")) {
      releaseState = ReleaseState.Complete;
    } else if (releaseStateString.includes("ongoing")) {
      releaseState = ReleaseState.Ongoing;
    } else if (releaseStateString.includes("hiatus")) {
      releaseState = ReleaseState.Hiatus;
    }
  }
  const toc: Toc = {
    link: `https://www.gogoanime.vc/category/${animeAlias}`,
    content,
    title: animeTitle,
    statusTl: releaseState,
    mediumType: MediaType.VIDEO,
  };

  return [toc];
}

async function scrapeSearch(searchString: string, searchMedium: TocSearchMedium): Promise<TocSearchResult> {
  const searchResults = await search(searchString);
  if (!searchResults || !searchResults.length) {
    return { done: true };
  }
  for (const searchResult of searchResults) {
    const title = searchResult.title;
    if (equalsIgnore(title, searchMedium.title) || searchMedium.synonyms.some((s) => equalsIgnore(title, s))) {
      return { value: searchResult.link, done: true };
    }
  }
  return { done: false };
}

async function searchForToc(searchMedium: TocSearchMedium): VoidablePromise<Toc> {
  return searchToc(searchMedium, scrapeToc, BASE_URI, (searchString) => scrapeSearch(searchString, searchMedium));
}

async function search(searchWords: string): Promise<SearchResult[]> {
  const urlString = `https://ajax.apimovie.xyz/site/loadAjaxSearch?keyword=${encodeURIComponent(
    searchWords,
  )}&id=-1&link_web=https%3A%2F%2Fwww.gogoanime.vc%2F`;

  const response: string = await queueRequest(urlString);
  const responseJson: { content: string } = JSON.parse(response);
  const $ = cheerio.load(responseJson.content);
  const links = $("a");

  const searchResults: SearchResult[] = [];
  const coverRegex = /background: url\("(.+)"\)/i;
  for (let i = 0; i < links.length; i++) {
    const linkElement = links.eq(i);

    const coverElement = linkElement.find("[style]");

    const text = sanitizeString(getText(linkElement));
    const link = linkElement.attr("href") as string;
    const coverStyle = coverElement.attr("style") as string;
    const exec = coverRegex.exec(coverStyle);
    if (!exec) {
      logger.warn(`on search: Style with coverLink not matchable '${coverStyle}'`, {
        scraper: "gogoanime",
      });
      continue;
    }
    searchResults.push({
      coverUrl: exec[1],
      link,
      title: text,
      medium: MediaType.VIDEO,
    });
  }

  return searchResults;
}

scrapeNews.link = BASE_URI;
searchForToc.link = BASE_URI;
searchForToc.medium = MediaType.VIDEO;
searchForToc.blindSearch = true;
search.medium = MediaType.VIDEO;

async function contentDownloader(link: string): Promise<EpisodeContent[]> {
  const episodeRegex = /https:\/\/www\d*\.gogoanime\.(vc|wiki)\/.+-episode-(\d+)/;
  const exec = episodeRegex.exec(link);
  if (!exec) {
    scraperLog("warn", LogType.INVALID_LINK, "gogoanime", {
      url: link,
    });
    return [];
  }
  const $ = await queueCheerioRequest(link);

  const outSideLink = $(".download-anime + a");
  const downloadPage = await queueCheerioRequest(outSideLink.attr("href") as string);

  const downloadLink = downloadPage(".dowload a").first().attr("href") as string;
  const mediumTitle = sanitizeString(getText($(".anime-info a")));

  return [
    {
      content: [downloadLink],
      index: 1,
      mediumTitle,
      episodeTitle: `Episode ${exec[2]}`,
    },
  ];
}

export function getHook(): Hook {
  return {
    name: "gogoanime",
    medium: MediaType.VIDEO,
    domainReg: /^https?:\/\/(www\d*\.)?gogoanime\.(vc|wiki)/,
    searchAdapter: search,
    newsAdapter: scrapeNews,
    tocAdapter: scrapeToc,
    contentDownloadAdapter: contentDownloader,
    tocSearchAdapter: searchForToc,
  };
}
