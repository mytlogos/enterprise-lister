import { EpisodeContent, Hook, Toc, TocEpisode, TocPart } from "../types";
import {
  EpisodeNews,
  News,
  SearchResult,
  TocSearchMedium,
  VoidablePromise,
  Optional,
  Link,
} from "enterprise-core/dist/types";
import { equalsIgnore, ignore, MediaType, relativeToAbsoluteTime, sanitizeString } from "enterprise-core/dist/tools";
import logger from "enterprise-core/dist/logger";
import * as url from "url";
import { queueCheerioRequest, queueRequest } from "../queueManager";
import * as request from "request-promise-native";
import { checkTocContent } from "../scraperTools";
import { ScraperError, UrlError } from "../errors";
import * as cheerio from "cheerio";
import { getText } from "./directTools";

const jar = request.jar();
const defaultRequest = request.defaults({
  jar,
});

const BASE_URI = "https://www.webnovel.com/";

const initPromise = queueRequest(
  BASE_URI,
  {
    method: "HEAD",
    uri: BASE_URI,
  },
  defaultRequest,
).then(ignore);

function toReleaseLink(bookId: string, chapterId: string): Link {
  return `${BASE_URI}book/${bookId}/${chapterId}/`;
}

function toTocLink(bookId: string): Link {
  return `${BASE_URI}book/${bookId}/`;
}

async function scrapeNews(): Promise<{ news?: News[]; episodes?: EpisodeNews[] } | undefined> {
  const uri = BASE_URI;
  const $ = await queueCheerioRequest(uri);
  const newsRows = $("#LatUpdate tbody > tr");

  const news: EpisodeNews[] = [];
  const titlePattern = /(\d+) .+/i;

  for (let i = 0; i < newsRows.length; i++) {
    const newsRow = newsRows.eq(i);
    const tableData = newsRow.children("td");

    const mediumElement = tableData.eq(1);
    const mediumTocLinkElement = mediumElement.children("a").first();
    const mediumTocTotalLink = new url.URL(mediumTocLinkElement.attr("href") as string, uri).href;
    const mediumTocLinkGroup = /https?:\/\/(www\.)?webnovel\.com\/book\/(.+_)?(\d+)/.exec(mediumTocTotalLink);

    if (!mediumTocLinkGroup) {
      logger.info(`unknown toc link format on webnovel: ${mediumTocTotalLink}`);
      continue;
    }
    const mediumTocLink = toTocLink(mediumTocLinkGroup[3]);
    const mediumTitle = sanitizeString(getText(mediumElement));

    const titleElement = tableData.eq(2).children("a").first();
    const episodeTitle = sanitizeString(getText(titleElement));

    const textTime = getText(tableData.eq(5)).trim();
    const time = relativeToAbsoluteTime(textTime);

    if (!time) {
      logger.warn(`could not parse time of webnovel news: '${textTime}'`);
      continue;
    }

    const totalLink = new url.URL(titleElement.attr("href") as string, uri).href;
    const linkGroup = /(https:\/\/www\.webnovel\.com\/book\/([^/]+_)?(\d+)\/([^/]+_)?(\d+)).*/.exec(totalLink);
    if (!linkGroup) {
      logger.info(`unknown news url format on webnovel: ${totalLink}`);
      continue;
    }
    const link = toReleaseLink(linkGroup[3], linkGroup[5]);
    const groups = titlePattern.exec(episodeTitle);

    if (!groups || !groups[1]) {
      logger.info(`unknown news format on webnovel: ${episodeTitle}`);
      continue;
    }
    const index = Number(groups[1]);
    news.push({
      mediumTitle,
      mediumTocLink,
      mediumType: MediaType.TEXT,
      episodeTitle,
      episodeIndex: index,
      episodeTotalIndex: index,
      date: time,
      link,
      locked: true,
    });
  }
  return { episodes: news };
}

async function scrapeToc(urlString: string): Promise<Toc[]> {
  // wait for a normal request, to get the right cookies
  await initPromise;

  const bookIdResult = /https?:\/\/(www\.)?webnovel\.com\/book\/([^/]+_)?(\d+)/.exec(urlString);

  if (!bookIdResult) {
    throw new UrlError("WebNovel toc link has no bookIdResult: " + urlString, urlString);
  }

  const bookId = bookIdResult[3];

  return scrapeTocPage(bookId);
}

async function scrapeTocPage(bookId: string, mediumId?: number): Promise<Toc[]> {
  const csrfCookie = jar.getCookies(BASE_URI).find((value) => value.key === "_csrfToken");

  if (!csrfCookie) {
    logger.warn("csrf cookie not found for webnovel");
    return [];
  }
  const csrfValue = csrfCookie.value;
  const tocLink = `${BASE_URI}apiajax/chapter/GetChapterList?bookId=${bookId}&_csrfToken=${csrfValue}`;
  const tocJson: TocResponse = await loadJson(tocLink);

  if (tocJson.code !== 0) {
    logger.warn("WebNovel toc request was not successful for: " + bookId);
    return [];
  }

  if (!tocJson.data || !tocJson.data.volumeItems || !tocJson.data.volumeItems.length) {
    logger.warn("no toc content on webnovel for " + bookId);
    return [];
  }
  const idPattern = /^\d+$/;

  const content: TocPart[] = tocJson.data.volumeItems
    // one medium has a volume with negative indices only, this should not be a valid episode
    // a volume which consists of only episodes with negative indices should be filtered out
    .filter((volume) => {
      volume.chapterItems = volume.chapterItems.filter((episode) => episode.index >= 0);
      return volume.chapterItems.length;
    })
    .map((volume: any): TocPart => {
      if (!volume.name) {
        volume.name = "Volume " + volume.index;
      }
      const name = volume.name;

      const chapters: TocEpisode[] = volume.chapterItems.map((item: ChapterItem): TocEpisode => {
        let date = new Date(item.createTime);

        if (Number.isNaN(date.getDate())) {
          date = relativeToAbsoluteTime(item.createTime) || new Date();
        }

        if (!date) {
          throw new ScraperError(`invalid date: '${item.createTime}'`);
        }

        if (!idPattern.test(item.id)) {
          throw new ScraperError("invalid chapterId: " + item.id);
        }

        const chapterContent: TocEpisode = {
          url: toReleaseLink(bookId, item.id),
          title: item.name,
          combiIndex: item.index,
          totalIndex: item.index,
          releaseDate: date,
          locked: item.isVip !== 0,
        };
        checkTocContent(chapterContent);
        return chapterContent;
      });
      const partContent = {
        episodes: chapters,
        title: name,
        combiIndex: volume.index,
        totalIndex: volume.index,
      };
      checkTocContent(partContent, true);
      return partContent;
    });
  const toc: Toc = {
    link: toTocLink(bookId),
    synonyms: [tocJson.data.bookInfo.bookSubName],
    mediumId,
    content,
    partsOnly: true,
    title: tocJson.data.bookInfo.bookName,
    mediumType: MediaType.TEXT,
  };

  return [toc];
}

function loadBody(urlString: string): Promise<cheerio.CheerioAPI> {
  return initPromise.then(() => queueCheerioRequest(urlString, undefined, defaultRequest));
}

function loadJson(urlString: string, retry = 0): Promise<any> {
  return initPromise
    .then(() => queueRequest(urlString, undefined, defaultRequest))
    .then((body) => {
      try {
        return JSON.parse(body);
      } catch (error) {
        // sometimes the response body is incomplete for whatever reason
        // so retry once to get it right, else forget it
        if (retry >= 2) {
          throw error;
        }
        return loadJson(urlString, retry + 1);
      }
    });
}

async function scrapeContent(urlString: string): Promise<EpisodeContent[]> {
  let $: cheerio.CheerioAPI;
  try {
    $ = await loadBody(urlString);
  } catch (e) {
    logger.warn("could not access: " + urlString);
    return [];
  }

  const contentElement = $(".chapter_content");

  const titleElement = $(".cha-hd-mn-text a").first();
  const novelTitle = sanitizeString(getText(titleElement).replace(/\/\s*$/, ""));
  titleElement.remove();

  const episodeTitle = sanitizeString(getText($(".cha-hd-mn-text")));
  const content = contentElement.find(".cha-words").first().html();

  const chapterGroups = /^\s*Chapter\s*(\d+(\.\d+)?)/.exec(episodeTitle);

  let index;
  if (chapterGroups) {
    index = Number(chapterGroups[1]);
  }
  if (index != null && Number.isNaN(index)) {
    index = undefined;
  }

  if (!novelTitle || !episodeTitle) {
    logger.warn("episode link with no novel or episode title: " + urlString);
    return [];
  }

  const episodeContent: EpisodeContent = {
    content: [],
    episodeTitle,
    mediumTitle: novelTitle,
    index,
  };

  // either normal premium locked or app locked
  if ($("._lock").length || !contentElement.children().length) {
    episodeContent.locked = true;
    return [episodeContent];
  } else if (!content) {
    logger.warn("episode link with no content: " + urlString);
    return [];
  }
  // FIXME never returns any content
  return [episodeContent];
}

interface ChapterItem {
  /**
   * if it is more than a week ago: M, dd,yyyy
   * else in relative time
   */
  createTime: string;
  id: string;
  index: number;
  /**
   * is 1 for everything?
   */
  isAuth: number;
  /**
   * 0 means not locked,
   * 2 means locked with stones
   */
  isVip: number;
  /**
   * 0: everyone can access them from browser
   * > 0: app locked chapters, probably
   */
  chapterLevel: number;
  name: string;
  /**
   * normally 0 when not logged in
   */
  userLevel: number;
}

interface VolumeItem {
  chapterCount: number;
  index: number;
  name: string;
  chapterItems: ChapterItem[];
}

interface BookInfo {
  bookId: string;
  bookName: string;
  bookSubName: string;
  newChapterId: string;
  newChapterName: string;
  newChapterTime: string;
  totalChapterNum: number;
  newChapterIndex: number;
}

interface TocData {
  bookInfo: BookInfo;
  volumeItems: VolumeItem[];
}

interface TocResponse {
  code: number;
  data: TocData;
  msg: string;
}

async function searchToc(searchMedium: TocSearchMedium): VoidablePromise<Toc> {
  logger.info("start searching webnovel " + searchMedium.mediumId);
  const urlString = BASE_URI + "/search?keywords=" + encodeURIComponent(searchMedium.title);
  const body = await loadBody(urlString);
  const titles = body("body > div.page  ul[class*=result] > li > h3 > a");

  let bookId: Optional<string>;
  for (let i = 0; i < titles.length; i++) {
    const titleElement = titles.eq(i);
    const possibleTitles = [searchMedium.title, ...searchMedium.synonyms];

    const title = sanitizeString(getText(titleElement));
    if (possibleTitles.some((value) => equalsIgnore(title, value))) {
      bookId = titleElement.attr("data-bookid");
      break;
    }
  }
  if (!bookId) {
    return;
  }

  const idPattern = /^\d+$/;

  if (!idPattern.test(bookId)) {
    throw new ScraperError("invalid bookId");
  }
  const [toc] = await scrapeTocPage(bookId, searchMedium.mediumId);
  logger.info("scraping toc on webnovel successfully " + searchMedium.mediumId);
  return toc;
}

async function search(text: string): Promise<SearchResult[]> {
  const uri = BASE_URI;
  const urlString = BASE_URI + "/search?keywords=" + encodeURIComponent(text);
  const body = await loadBody(urlString);
  const results = body("body > div.page  ul[class*=result] > li");

  const searchResult: SearchResult[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results.eq(i);

    if (result.hasClass("_no_results")) {
      continue;
    }

    const titleElement = result.find("h3 > a");
    const coverElement = result.find("img");
    const title = sanitizeString(getText(titleElement));
    const coverUrl = new url.URL(coverElement.attr("src") as string, uri).href;
    const link = new url.URL(titleElement.attr("href") as string, uri).href;

    const mediumTocLinkGroup = /https?:\/\/(www\.)?webnovel\.com\/book\/(.+_)?(\d+)/.exec(link);

    if (!mediumTocLinkGroup) {
      logger.info(`unknown toc link format on webnovel: ${link}`);
      continue;
    }
    const mediumTocLink = toTocLink(mediumTocLinkGroup[3]);

    searchResult.push({ title, link: mediumTocLink, coverUrl, medium: MediaType.TEXT });
  }
  return searchResult;
}

scrapeNews.link = BASE_URI;
searchToc.link = BASE_URI;
searchToc.medium = MediaType.TEXT;
search.medium = MediaType.TEXT;

export function getHook(): Hook {
  return {
    name: "webnovel",
    medium: MediaType.TEXT,
    domainReg: /^https:\/\/(www\.)?webnovel\.com/,
    // tslint:disable-next-line:max-line-length
    tocPattern:
      /^https:\/\/((paste\.tech-port\.de)|(priv\.atebin\.com)|(paste\.fizi\.ca)|(privatebin\.secured\.fi))\/$/,
    newsAdapter: scrapeNews,
    contentDownloadAdapter: scrapeContent,
    tocAdapter: scrapeToc,
    tocSearchAdapter: searchToc,
    searchAdapter: search,
  };
}
