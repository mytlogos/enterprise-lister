import { EpisodeContent, Hook, Toc, TocEpisode, TocPart, NewsScrapeResult } from "../types";
import { EpisodeContentData, EpisodeNews, ReleaseState, Optional } from "enterprise-core/dist/types";
import * as url from "url";
import { queueCheerioRequest, queueRequest } from "../queueRequest";
import logger from "enterprise-core/dist/logger";
import { extractIndices, hasProp, MediaType, sanitizeString } from "enterprise-core/dist/tools";
import * as request from "request";
import { checkTocContent } from "../scraperTools";
import { episodeStorage } from "enterprise-core/dist/database/storages/storage";
import { MissingResourceError, ScraperError, UrlError } from "../errors";
import { extractLinkable, getText, LogType, scraperLog } from "./directTools";

const BASE_URI = "https://mangadex.org/";
const jar = request.jar();
jar.setCookie("mangadex_filter_langs=1; expires=Sun, 16 Jul 2119 18:59:17 GMT; domain=mangadex.org;", BASE_URI, {
  secure: false,
});

function loadJson(urlString: string): Promise<any> {
  return queueRequest(urlString).then((body) => JSON.parse(body));
}

interface ChapterResponse {
  id: number;
  timestamp: number;
  hash: string;
  volume: string;
  chapter: string;
  title: string;
  lang_name: string;
  lang_code: string;
  manga_id: number;
  group_id: number;
  group_id_2: number;
  group_id_3: number;
  comments: null | string;
  server: string;
  page_array: string[];
  long_strip: number;
  status: string;
}

interface ChapterTocResponse {
  manga: MangaChapter;
  chapter: Record<string, ChapterChapterItem>;
  status: string;
}

interface MangaChapter {
  cover_url: string;
  description: string;
  title: string;
  artist: string;
  author: string;
  status: number;
  genre: number[];
  last_chapter: string;
  lang_name: string;
  lang_flag: string;
  hentai: number;
  links: { mu: string; mal: string };
}

interface ChapterChapterItem {
  volume: string;
  chapter: string;
  title: string;
  lang_code: string;
  group_id: string;
  group_name: string;
  group_id_2: number;
  group_name_2: null | string;
  group_id_3: number;
  group_name_3: null | string;
  timestamp: number;
}

async function contentDownloadAdapter(chapterLink: string): Promise<EpisodeContent[]> {
  const linkReg = /^https:\/\/mangadex\.org\/chapter\/(\d+)/;
  const exec = linkReg.exec(chapterLink);
  if (!exec) {
    scraperLog("warn", LogType.LINK_FORMAT, "mangadex", { url: chapterLink });
    return [];
  }
  const chapterId = exec[1];
  const urlString = `https://mangadex.org/api/?id=${chapterId}&server=null&type=chapter`;
  const jsonPromise: Promise<any> = loadJson(urlString);
  const contentData: EpisodeContentData = await episodeStorage.getEpisodeContentData(chapterLink);

  if (!contentData.mediumTitle || !contentData.episodeTitle || contentData.index == null) {
    logger.warn(
      "incoherent data, did not find any release with given url link, which has a title, index and mediumTitle",
      {
        scraper: "mangadex",
        url: chapterLink,
        contentLink: urlString,
      },
    );
    return [];
  }
  let jsonResponse: ChapterResponse;
  try {
    jsonResponse = await jsonPromise;
  } catch (e) {
    if (hasProp(e, "statusCode") && e.statusCode && e.statusCode === 409) {
      return [
        {
          content: [],
          episodeTitle: contentData.episodeTitle,
          index: contentData.index,
          mediumTitle: contentData.mediumTitle,
        },
      ];
    } else {
      throw e;
    }
  }

  if (jsonResponse.status !== "OK" || !jsonResponse.hash || !jsonResponse.page_array.length) {
    scraperLog("warn", LogType.API_CHANGED, "mangadex", { url: urlString });
    return [];
  }
  const imageUrls = [];
  for (const imageKey of jsonResponse.page_array) {
    let server: string = jsonResponse.server;
    if (!server.startsWith("http")) {
      server = BASE_URI + server.substring(1);
    }
    imageUrls.push(`${server}${jsonResponse.hash + ""}/${imageKey + ""}`);
  }
  const episodeContent: EpisodeContent = {
    content: imageUrls,
    episodeTitle: contentData.episodeTitle,
    index: contentData.index,
    mediumTitle: contentData.mediumTitle,
  };
  return [episodeContent];
}

async function scrapeNews(): Promise<NewsScrapeResult> {
  // TODO: 19.07.2019 set the cookie 'mangadex_filter_langs:"1"'
  //  with expiration date somewhere in 100 years to lessen load

  const uri = BASE_URI;
  const requestLink = uri + "updates";
  const $ = await queueCheerioRequest(requestLink, { jar, uri: requestLink });
  const newsRows = $(".table tbody tr");

  const episodeNews: EpisodeNews[] = [];
  let currentMedium = "";
  let currentMediumLink = "";

  const titlePattern = /(vol\.\s*((\d+)(\.(\d+))?))?\s*ch\.\s*((\d+)(\.(\d+))?)(\s*-\s*(.+))?/i;

  for (let i = 0; i < newsRows.length; i++) {
    const newsRow = newsRows.eq(i);

    if (!newsRow.has(".flag").length) {
      const mediumLinkElement = newsRow.find("a.manga_title");
      currentMediumLink = new url.URL(mediumLinkElement.attr("href") as string, uri).href;
      currentMedium = sanitizeString(getText(mediumLinkElement));
      continue;
    }

    if (!currentMedium) {
      throw new ScraperError("episode without medium");
    }
    const children = newsRow.children("td");

    // ignore manga which are not english
    if (!children.eq(2).children(".flag-gb").length) {
      continue;
    }
    const titleElement = children.eq(1);
    const link = new url.URL(titleElement.children("a").attr("href") as string, uri).href;
    const title = sanitizeString(getText(titleElement));

    // ignore oneshots, they are not 'interesting' enough, e.g. too short
    if (title === "Oneshot") {
      continue;
    }

    const timeStampElement = children.eq(6).children("time").first();
    const date = new Date(timeStampElement.attr("datetime") as string);

    const groups = titlePattern.exec(title);

    if (!groups) {
      scraperLog("warn", LogType.TITLE_FORMAT, "mangadex", {
        url: requestLink,
        unknown_title: title,
        medium_title: currentMedium,
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
        scraperLog("warn", LogType.INDEX_FORMAT, "mangadex", { url: requestLink, unknown_index: title });
        continue;
      }

      if (episodeTitle) {
        episodeTitle = `Ch. ${episodeIndices.combi} - ` + episodeTitle;
      } else {
        episodeTitle = `Ch. ${episodeIndices.combi}`;
      }
    } else {
      scraperLog("warn", LogType.INDEX_FORMAT, "mangadex", { url: requestLink, unknown_index: title });
      continue;
    }
    let partIndices;
    let partTitle;

    if (groups[2]) {
      partIndices = extractIndices(groups, 2, 3, 5);

      if (!partIndices) {
        scraperLog("warn", LogType.INDEX_FORMAT, "mangadex", { url: requestLink, unknown_index: title });
        continue;
      }

      partTitle = `Vol. ${partIndices.combi}`;
      // TODO: unused part title, should this be removed or used?
    }
    episodeNews.push({
      mediumTitle: currentMedium,
      mediumTocLink: currentMediumLink,
      mediumType: MediaType.IMAGE,
      episodeTitle,
      episodeIndex: episodeIndices.combi,
      episodeTotalIndex: episodeIndices.total,
      episodePartialIndex: episodeIndices.fraction,
      partIndex: partIndices ? partIndices.combi : undefined,
      partTotalIndex: partIndices ? partIndices.total : undefined,
      partPartialIndex: partIndices ? partIndices.fraction : undefined,
      link,
      date,
    });
  }
  return { episodes: episodeNews };
}

async function scrapeToc(urlString: string): Promise<Toc[]> {
  const urlRegex = /^https?:\/\/mangadex\.org\/title\/\d+\/[^/]+\/?$/;

  if (!urlRegex.test(urlString)) {
    throw new UrlError("invalid toc url for MangaDex: " + urlString, urlString);
  }
  const uri = BASE_URI;

  const indexPartMap: Map<number, TocPart> = new Map();

  const toc: Toc = {
    link: urlString,
    content: [],
    title: "",
    mediumType: MediaType.IMAGE,
  };

  // TODO process these metadata and get more (like author)
  // const alternateMangaTitles = metaRows.eq(0).find("li");
  // const mangaStatus = metaRows.eq(8).find(".col-lg-9.col-xl-10").first();

  const endReg = /^END$/i;
  const volChapReg = /^\s*Vol\.?\s*((\d+)(\.(\d+))?)\s*Ch\.?\s*((\d+)(\.(\d+))?)\s*((-\s*)?(.+))?/i;
  const chapReg = /^\s*Ch\.?\s*((\d+)(\.(\d+))?)\s*((-\s*)?(.+))?/i;

  if (await scrapeTocPage(toc, endReg, volChapReg, chapReg, indexPartMap, uri, urlString)) {
    return [];
  }

  toc.content = toc.content.filter((value) => value);
  return [toc];
}

async function scrapeTocPage(
  toc: Toc,
  endReg: RegExp,
  volChapReg: RegExp,
  chapReg: RegExp,
  indexPartMap: Map<number, TocPart>,
  uri: string,
  urlString: string,
): Promise<boolean> {
  const $ = await queueCheerioRequest(urlString);
  const contentElement = $("#content");

  if (getText(contentElement.find(".alert-danger")).match(/Manga .+? (not available)|(does not exist)/i)) {
    throw new MissingResourceError("Missing ToC on MangaDex", urlString);
  }
  const mangaTitle = sanitizeString(getText(contentElement.find("h6.card-header").first()));

  // const metaRows = contentElement.find(".col-xl-9.col-lg-8.col-md-7 > .row");
  if (!mangaTitle) {
    scraperLog("warn", LogType.MEDIUM_TITLE_FORMAT, "mangadex", { url: urlString });
    return true;
  }

  toc.title = mangaTitle;
  let releaseStateElement = null;
  const tocInfoElements = $("div.m-0");
  for (let i = 0; i < tocInfoElements.length; i++) {
    const infoElement = tocInfoElements.eq(i);
    const children = infoElement.children();

    if (getText(children.eq(0)).toLocaleLowerCase().includes("status:")) {
      releaseStateElement = children.eq(1);
      break;
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
  toc.statusTl = releaseState;

  toc.authors = extractLinkable($, 'a[href^="/search?author"]', uri);
  toc.artists = extractLinkable($, 'a[href^="/search?artist"]', uri);

  const chapters = contentElement.find(".chapter-container .chapter-row");

  if (!chapters.length) {
    scraperLog("warn", LogType.NO_EPISODES, "mangadex", { url: urlString });
    return true;
  }

  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters.eq(i);

    if (!chapter.has(".flag-gb").length) {
      continue;
    }
    const columns = chapter.children();
    const timeString = columns.eq(3).attr("title") as string;
    const time = new Date(timeString);

    if (!timeString || Number.isNaN(time.getTime())) {
      scraperLog("warn", LogType.TIME_FORMAT, "mangadex", { url: urlString, unknown_time: timeString });
      return true;
    }
    const chapterTitleElement = columns.eq(1);
    const endBadgeElement = chapterTitleElement.find(".badge").first().remove();

    if (endBadgeElement.length && endReg.test(sanitizeString(getText(endBadgeElement)))) {
      toc.end = true;
    }
    const chapterTitle = sanitizeString(getText(chapterTitleElement));
    const volChapGroups = volChapReg.exec(chapterTitle);
    const chapGroups = chapReg.exec(chapterTitle);

    if (volChapGroups) {
      const volIndices = extractIndices(volChapGroups, 1, 2, 4);

      if (!volIndices) {
        throw new ScraperError(`changed format on mangadex, got no indices for: '${chapterTitle}'`);
      }

      const chapIndices = extractIndices(volChapGroups, 5, 6, 8);

      const link = new url.URL(chapterTitleElement.find("a").first().attr("href") as string, uri).href;

      let part: Optional<TocPart> = indexPartMap.get(volIndices.combi);

      if (!chapIndices) {
        scraperLog("warn", LogType.INDEX_FORMAT, "mangadex", { url: urlString, unknown_index: chapterTitle });
        return true;
      }
      const title = `Chapter ${chapIndices.combi}${volChapGroups[9] ? " - " + volChapGroups[11] : ""}`;

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
        toc.content.push(part);
      }
      const chapterContent: TocEpisode = {
        title,
        combiIndex: chapIndices.combi,
        totalIndex: chapIndices.total,
        partialIndex: chapIndices.fraction,
        url: link,
        releaseDate: time,
        noTime: true,
      };
      checkTocContent(chapterContent);
      part.episodes.push(chapterContent);
    } else if (chapGroups) {
      const chapIndices = extractIndices(chapGroups, 1, 2, 4);

      if (!chapIndices) {
        throw new ScraperError(`changed format on mangadex, got no indices for: '${chapterTitle}'`);
      }
      const link = new url.URL(chapterTitleElement.find("a").first().attr("href") as string, uri).href;

      const title = `Chapter ${chapIndices.combi}${chapGroups[5] ? " - " + chapGroups[7] : ""}`;

      const chapterContent: TocEpisode = {
        title,
        combiIndex: chapIndices.combi,
        totalIndex: chapIndices.total,
        partialIndex: chapIndices.fraction,
        url: link,
        releaseDate: time,
        noTime: true,
      };
      checkTocContent(chapterContent);
      toc.content.push(chapterContent);
    } else {
      scraperLog("warn", LogType.TITLE_FORMAT, "mangadex", { url: urlString, unknown_title: chapterTitle });
      continue;
    }
  }
  const nextPaging = $(".page-item:last-child:not(.disabled)");

  if (nextPaging.length) {
    const link = nextPaging.find("a").attr("href") as string;
    const nextPage = new url.URL(link, uri).href;
    return scrapeTocPage(toc, endReg, volChapReg, chapReg, indexPartMap, uri, nextPage);
  }
  return false;
}

scrapeNews.link = BASE_URI;

export function getHook(): Hook {
  return {
    name: "mangadex",
    medium: MediaType.IMAGE,
    domainReg: /^https?:\/\/mangadex\.org/,
    contentDownloadAdapter,
    newsAdapter: scrapeNews,
    tocAdapter: scrapeToc,
  };
}
