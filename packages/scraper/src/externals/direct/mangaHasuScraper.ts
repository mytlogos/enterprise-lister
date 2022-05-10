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
import { SearchResult as TocSearchResult, searchToc, extractLinkable } from "./directTools";
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
    logger.warn("Could not normalize Link: " + link);
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
  const $ = await tryRequest(baseUri + "latest-releases.html");
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
    const mediumTitle = sanitizeString(mediumElement.text());
    const title = sanitizeString(titleElement.text());

    // ignore oneshots, they are not 'interesting' enough, e.g. too short
    if (title === "Oneshot") {
      continue;
    }

    const groups = titlePattern.exec(title);

    if (!groups) {
      logger.warn(`Unknown News Format on mangahasu: '${title}' for '${mediumTitle}'`);
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
        logger.warn("unknown news title format on mangahasu: " + episodeTitle);
        continue;
      }

      if (episodeTitle) {
        episodeTitle = `Ch. ${episodeIndices.combi} - ` + episodeTitle;
      } else {
        episodeTitle = `Ch. ${episodeIndices.combi}`;
      }
    } else {
      logger.info(`unknown news format on mangahasu: ${title}`);
      continue;
    }
    let partIndices;
    let partTitle;

    if (groups[2]) {
      partIndices = extractIndices(groups, 2, 3, 5);

      if (!partIndices) {
        logger.warn("unknown news title format on mangahasu: " + episodeTitle);
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
  if ($("head > title").text() === "Page not found!") {
    throw new MissingResourceError("Missing Toc on NovelFull", chapterLink);
  }
  const mediumTitleElement = $(".breadcrumb li:nth-child(2) a");
  const titleElement = $(".breadcrumb span");

  const episodeTitle = sanitizeString(titleElement.text());
  const mediumTitle = sanitizeString(mediumTitleElement.text());

  if (!episodeTitle || !mediumTitle) {
    logger.warn(`chapter format changed on mangahasu, did not find any titles for content extraction: ${chapterLink}`);
    return [];
  }
  const chapReg = /Chapter\s*(\d+(\.\d+)?)(:\s*(.+))?/i;
  const exec = chapReg.exec(episodeTitle);

  if (!exec || !mediumTitle) {
    logger.warn(`chapter format changed on mangahasu, did not find any titles for content extraction: ${chapterLink}`);
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
      logger.warn("image link format changed on mangahasu: " + chapterLink);
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
  if ($("head > title").text() === "Page not found!") {
    throw new MissingResourceError("Missing Toc on NovelFull", urlString);
  }
  const contentElement = $(".wrapper_content");
  const mangaTitle = sanitizeString(contentElement.find(".info-title h1").first().text());
  // TODO process metadata and get more (like author)

  const chapters = contentElement.find(".list-chapter tbody > tr");

  if (!chapters.length) {
    logger.warn("toc link with no chapters: " + urlString);
    return [];
  }
  if (!mangaTitle) {
    logger.warn("toc link with no novel title: " + urlString);
    return [];
  }
  const uri = BASE_URI;

  const partContents: TocPart[] = [];
  const indexPartMap: Map<number, TocPart> = new Map();
  const chapterContents: TocEpisode[] = [];
  let releaseState: ReleaseState = ReleaseState.Unknown;
  const releaseStateElement = $('a[href^="/advanced-search.html?status="]');

  const releaseStateString = releaseStateElement.text().toLowerCase();
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

    const timeString = chapterElement.find(".date-updated").text().trim();
    const time = new Date(timeString);

    if (!timeString || Number.isNaN(time.getTime())) {
      logger.warn("no time in title in mangahasu toc: " + urlString);
      return [];
    }
    const chapterTitleElement = chapterElement.find(".name");
    const chapterTitle = sanitizeString(chapterTitleElement.text());

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
        logger.warn("changed episode format on mangaHasu toc: got no index " + urlString);
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
      logger.warn(
        "volume - chapter format changed on mangahasu: recognized neither of them: " +
          chapterTitle +
          " on " +
          urlString,
      );
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
    const text = sanitizeString(titleElement.text());

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

    const text = sanitizeString(titleElement.text());
    const link = normalizeLink(new url.URL(linkElement.attr("href") as string, BASE_URI).href);
    const author = sanitizeString(authorElement.text());
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
