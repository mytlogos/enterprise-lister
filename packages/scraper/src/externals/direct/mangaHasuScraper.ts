import { EpisodeContent, Hook, Toc, TocEpisode, TocPart, NewsScrapeResult } from "../types";
import {
  EpisodeNews,
  ReleaseState,
  SearchResult,
  TocSearchMedium,
  VoidablePromise,
  Optional,
} from "enterprise-core/dist/types";
import * as url from "url";
import { queueCheerioRequest } from "../queueManager";
import logger from "enterprise-core/dist/logger";
import { equalsIgnore, extractIndices, MediaType, sanitizeString, delay, hasProp } from "enterprise-core/dist/tools";
import { checkTocContent } from "../scraperTools";
import {
  SearchResult as TocSearchResult,
  searchToc,
  extractLinkable,
  LogType,
  scraperLog,
  getText,
} from "./directTools";
import { MissingResourceError, UrlError, UnreachableError, ScraperError } from "../errors";
import { Options } from "cloudscraper";
import * as cheerio from "cheerio";

async function tryRequest(link: string, options?: Options, retry = 0): Promise<cheerio.CheerioAPI> {
  try {
    return await queueCheerioRequest(link);
  } catch (error) {
    // mangahasu likes to throw an Internal Server Error every now and then
    if (hasProp(error, "statusCode") && error.statusCode === 500) {
      // try at most 3 times
      if (retry < 3) {
        // wait a bit before trying again
        await delay(500);
        return tryRequest(link, options, retry + 1);
      } else {
        throw new UnreachableError(link);
      }
    } else {
      throw error;
    }
  }
}

function normalizeLink(link: string): string {
  const regex = /^https?:\/\/mangahasu.se\/([\w-/]+?)-(oo\w+-)?([pc]\d+.html)$/i;
  const match = regex.exec(link);

  if (!match) {
    logger.warn("Could not normalize Link", { scraper: "mangahasu", link });
    return link;
  } else {
    return `https://mangahasu.se/${match[1]}-${match[3]}`;
  }
}

const BASE_URI = "https://mangahasu.se/";

function enforceHttps(link: string): string {
  if (!link.startsWith("https://")) {
    return link.replace(/.+?:\/\//, "https://");
  } else {
    return link;
  }
}

async function scrapeNews(): Promise<NewsScrapeResult> {
  // TODO scrape more than just the first page if there is an open end
  const baseUri = BASE_URI;
  const requestUrl = baseUri + "latest-releases.html";
  const $ = await tryRequest(requestUrl);
  const newsRows = $("ul.list_manga  .info-manga");

  const news: EpisodeNews[] = [];
  const titlePattern = /(vol\s*((\d+)(\.(\d+))?))?\s*chapter\s*((\d+)(\.(\d+))?)(\s*:\s*(.+))?/i;

  for (let i = 0; i < newsRows.length; i++) {
    const newsRow = newsRows.eq(i);

    const children = newsRow.children("a");

    const mediumElement = children.eq(0);
    const titleElement = children.eq(1);
    const link = normalizeLink(new url.URL(titleElement.attr("href") as string, baseUri).href);
    const mediumTocLink = normalizeLink(new url.URL(mediumElement.attr("href") as string, baseUri).href);
    const mediumTitle = sanitizeString(getText(mediumElement));
    const title = sanitizeString(getText(titleElement));

    // ignore oneshots, they are not 'interesting' enough, e.g. too short
    if (title === "Oneshot") {
      continue;
    }

    const groups = titlePattern.exec(title);

    if (!groups) {
      scraperLog("warn", LogType.TITLE_FORMAT, "mangahasu", {
        url: requestUrl,
        unknown_title: title,
        medium_title: mediumTitle,
      });
      continue;
    }

    let episodeIndices;
    let episodeTitle = "";

    if (groups[11]) {
      episodeTitle = sanitizeString(groups[11]);
    }

    if (groups[6]) {
      episodeIndices = extractIndices(groups, 6, 7, 9);

      if (!episodeIndices) {
        scraperLog("warn", LogType.INDEX_FORMAT, "mangahasu", {
          url: requestUrl,
          unknown_title: title,
        });
        continue;
      }

      if (episodeTitle) {
        episodeTitle = `Ch. ${episodeIndices.combi} - ` + episodeTitle;
      } else {
        episodeTitle = `Ch. ${episodeIndices.combi}`;
      }
    } else {
      scraperLog("warn", LogType.TITLE_FORMAT, "mangahasu", {
        url: requestUrl,
        unknown_title: title,
      });
      continue;
    }
    let partIndices;
    let partTitle;

    if (groups[2]) {
      partIndices = extractIndices(groups, 2, 3, 5);

      if (!partIndices) {
        scraperLog("warn", LogType.INDEX_FORMAT, "mangahasu", {
          url: requestUrl,
          unknown_title: title,
        });
        continue;
      }
      partTitle = `Vol. ${partIndices.combi}`;
      // TODO: unused part title, should this be removed or used?
    }

    news.push({
      mediumTitle,
      mediumTocLink,
      mediumType: MediaType.IMAGE,
      episodeTitle,
      episodeIndex: episodeIndices.combi,
      episodeTotalIndex: episodeIndices.total,
      episodePartialIndex: episodeIndices.fraction,
      partIndex: partIndices ? partIndices.combi : undefined,
      partTotalIndex: partIndices ? partIndices.total : undefined,
      partPartialIndex: partIndices ? partIndices.fraction : undefined,
      link,
      date: new Date(),
    });
  }
  if (!news.length) {
    return {};
  }

  // if there is an open end, just pretend as if every 15 min one release happened
  for (let i = 0; i < news.length; i++) {
    const date = news[i].date;
    date.setMinutes(date.getMinutes() - i * 15);
  }
  return { episodes: news };
}

async function contentDownloadAdapter(chapterLink: string): Promise<EpisodeContent[]> {
  const $ = await tryRequest(chapterLink);
  if (getText($("head > title")) === "Page not found!") {
    throw new MissingResourceError("Missing Toc on NovelFull", chapterLink);
  }
  const mediumTitleElement = $(".breadcrumb li:nth-child(2) a");
  const titleElement = $(".breadcrumb span");

  const episodeTitle = sanitizeString(getText(titleElement));
  const mediumTitle = sanitizeString(getText(mediumTitleElement));

  if (!episodeTitle || !mediumTitle) {
    scraperLog("warn", LogType.TITLE_FORMAT, "mangahasu", { url: chapterLink });
    return [];
  }
  const chapReg = /Chapter\s*(\d+(\.\d+)?)(:\s*(.+))?/i;
  const exec = chapReg.exec(episodeTitle);

  if (!exec) {
    scraperLog("warn", LogType.TITLE_FORMAT, "mangahasu", { url: chapterLink, unknown_title: episodeTitle });
    return [];
  }
  const index = Number(exec[1]);
  const images = $(".img img");
  const imageUrls = [];
  const imageUrlReg = /\.(jpg|png)$/;

  for (let i = 0; i < images.length; i++) {
    const imageElement = images.eq(i);
    const src = imageElement.attr("src");

    if (!src || !imageUrlReg.test(src)) {
      scraperLog("warn", LogType.INVALID_LINK, "mangahasu", {
        url: chapterLink,
        link: src,
        expected: imageUrlReg.source,
      });
      return [];
    }
    imageUrls.push(enforceHttps(src));
  }
  const episodeContent: EpisodeContent = {
    content: imageUrls,
    episodeTitle,
    index,
    mediumTitle,
  };
  return [episodeContent];
}

async function scrapeToc(urlString: string): Promise<Toc[]> {
  if (!/https?:\/\/mangahasu\.se\/[^/]+\.html/.test(urlString)) {
    throw new UrlError("not a toc link for MangaHasu: " + urlString, urlString);
  }
  const $ = await tryRequest(enforceHttps(urlString));
  if (getText($("head > title")) === "Page not found!") {
    throw new MissingResourceError("Missing Toc on NovelFull", urlString);
  }
  const contentElement = $(".wrapper_content");
  const mangaTitle = sanitizeString(getText(contentElement.find(".info-title h1").first()));
  // TODO process metadata and get more (like author)

  const chapters = contentElement.find(".list-chapter tbody > tr");

  if (!chapters.length) {
    scraperLog("warn", LogType.NO_EPISODES, "mangahasu", { url: urlString });
    return [];
  }
  if (!mangaTitle) {
    scraperLog("warn", LogType.MEDIUM_TITLE_FORMAT, "mangahasu", { url: urlString });
    return [];
  }
  const uri = BASE_URI;

  const partContents: TocPart[] = [];
  const indexPartMap: Map<number, TocPart> = new Map();
  const chapterContents: TocEpisode[] = [];
  let releaseState: ReleaseState = ReleaseState.Unknown;
  const releaseStateElement = $('a[href^="/advanced-search.html?status="]');

  const releaseStateString = getText(releaseStateElement).toLowerCase();
  if (releaseStateString.includes("complete")) {
    releaseState = ReleaseState.Complete;
  } else if (releaseStateString.includes("ongoing")) {
    releaseState = ReleaseState.Ongoing;
  }
  const toc: Toc = {
    link: normalizeLink(urlString),
    content: [],
    title: mangaTitle,
    statusTl: releaseState,
    mediumType: MediaType.IMAGE,
  };

  toc.authors = extractLinkable($, 'a[href^="/advanced-search.html?author="]', uri);
  toc.artists = extractLinkable($, 'a[href^="/advanced-search.html?artist="]', uri);

  const endReg = /\[END]\s*$/i;
  const volChapReg = /Vol\.?\s*((\d+)(\.(\d+))?)\s*Chapter\s*((\d+)(\.(\d+))?)(:\s*(.+))?/i;
  const chapReg = /Chapter\s*((\d+)(\.(\d+))?)(:\s*(.+))?/i;

  for (let i = 0; i < chapters.length; i++) {
    const chapterElement = chapters.eq(i);

    const timeString = getText(chapterElement.find(".date-updated")).trim();
    const time = new Date(timeString);

    if (!timeString || Number.isNaN(time.getTime())) {
      scraperLog("warn", LogType.TIME_FORMAT, "mangahasu", { url: urlString, unknown_time: timeString });
      return [];
    }
    const chapterTitleElement = chapterElement.find(".name");
    const chapterTitle = sanitizeString(getText(chapterTitleElement));

    if (endReg.test(chapterTitle)) {
      toc.end = true;
    }
    const volChapGroups = volChapReg.exec(chapterTitle);
    const chapGroups = chapReg.exec(chapterTitle);

    if (volChapGroups) {
      const volIndices = extractIndices(volChapGroups, 1, 2, 4);

      if (!volIndices) {
        throw new ScraperError(`changed format on mangahasu, got no indices for: '${chapterTitle}'`);
      }

      const chapIndices = extractIndices(volChapGroups, 5, 6, 8);

      const link = normalizeLink(new url.URL(chapterTitleElement.find("a").first().attr("href") as string, uri).href);

      if (!chapIndices) {
        scraperLog("warn", LogType.INDEX_FORMAT, "mangahasu", { url: urlString, unknown_index: chapterTitle });
        return [];
      }
      let title = "Chapter " + chapIndices.combi;

      if (volChapGroups[10]) {
        title += " - " + volChapGroups[10];
      }
      let part: Optional<TocPart> = indexPartMap.get(volIndices.combi);

      if (!part) {
        part = {
          episodes: [],
          combiIndex: volIndices.combi,
          totalIndex: volIndices.total,
          partialIndex: volIndices.fraction,
          title: "Vol." + volIndices.combi,
        };
        checkTocContent(part, true);
        indexPartMap.set(volIndices.combi, part);
        partContents.push(part);
      }

      const episodeContent = {
        title,
        combiIndex: chapIndices.combi,
        totalIndex: chapIndices.total,
        partialIndex: chapIndices.fraction,
        url: link,
        releaseDate: time,
        noTime: true,
      } as TocEpisode;
      checkTocContent(episodeContent);
      part.episodes.push(episodeContent);
    } else if (chapGroups) {
      const chapIndices = extractIndices(chapGroups, 1, 2, 4);

      if (!chapIndices) {
        throw new ScraperError(`changed format on mangahasu, got no indices for: '${chapterTitle}'`);
      }
      const link = normalizeLink(new url.URL(chapterTitleElement.find("a").first().attr("href") as string, uri).href);

      let title = "Chapter " + chapIndices.combi;

      if (chapGroups[6]) {
        title += " - " + chapGroups[6];
      }

      chapterContents.push({
        title,
        combiIndex: chapIndices.combi,
        totalIndex: chapIndices.total,
        partialIndex: chapIndices.fraction,
        url: link,
        releaseDate: time,
        noTime: true,
      });
    } else {
      scraperLog("warn", LogType.TITLE_FORMAT, "mangahasu", { url: urlString, unknown_title: chapterTitle });
    }
  }
  partContents.forEach((value) => {
    if (value) {
      toc.content.push(value);
    }
  });

  toc.content.push(...chapterContents);
  return [toc];
}

async function tocSearchAdapter(searchMedium: TocSearchMedium): VoidablePromise<Toc> {
  return searchToc(searchMedium, scrapeToc, BASE_URI, (searchString) => scrapeSearch(searchString, searchMedium));
}

async function scrapeSearch(searchWords: string, medium: TocSearchMedium): Promise<TocSearchResult> {
  const urlString = BASE_URI + "search/autosearch";

  const body = "key=" + searchWords;
  // TODO: 26.08.2019 this does not work for any reason
  const $ = await tryRequest(urlString, {
    url: urlString,
    headers: {
      Host: "mangahasu.se",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
    body,
  });

  const links = $("a.a-item");

  if (!links.length) {
    return { done: true };
  }
  for (let i = 0; i < links.length; i++) {
    const linkElement = links.eq(i);

    const titleElement = linkElement.find(".name");
    const text = sanitizeString(getText(titleElement));

    if (equalsIgnore(text, medium.title) || medium.synonyms.some((s) => equalsIgnore(text, s))) {
      const tocLink = normalizeLink(linkElement.attr("href") as string);
      return { value: tocLink, done: true };
    }
  }

  return { done: false };
}

async function search(searchWords: string): Promise<SearchResult[]> {
  const urlString = BASE_URI + "search/autosearch";

  const body = "key=" + searchWords;
  // TODO: 26.08.2019 this does not work for any reason
  const $ = await tryRequest(urlString, {
    url: urlString,
    headers: {
      Host: "mangahasu.se",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
    body,
  });
  const searchResults: SearchResult[] = [];
  const links = $("a.a-item");

  if (!links.length) {
    return searchResults;
  }
  for (let i = 0; i < links.length; i++) {
    const linkElement = links.eq(i);

    const titleElement = linkElement.find(".name");
    const authorElement = linkElement.find(".author");
    const coverElement = linkElement.find("img");

    const text = sanitizeString(getText(titleElement));
    const link = normalizeLink(new url.URL(linkElement.attr("href") as string, BASE_URI).href);
    const author = sanitizeString(getText(authorElement));
    const coverLink = coverElement.attr("src");

    searchResults.push({ coverUrl: coverLink, author, link, title: text, medium: MediaType.IMAGE });
  }

  return searchResults;
}

scrapeNews.link = BASE_URI;
tocSearchAdapter.link = BASE_URI;
tocSearchAdapter.medium = MediaType.IMAGE;
tocSearchAdapter.blindSearch = true;
search.medium = MediaType.IMAGE;

export function getHook(): Hook {
  return {
    name: "mangahasu",
    medium: MediaType.IMAGE,
    domainReg: /^https?:\/\/mangahasu\.se/,
    newsAdapter: scrapeNews,
    contentDownloadAdapter,
    tocSearchAdapter,
    tocAdapter: scrapeToc,
    searchAdapter: search,
  };
}
