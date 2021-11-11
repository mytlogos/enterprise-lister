import { Hook, Toc, TocEpisode, NewsScrapeResult } from "../types";
import { EpisodeNews, ReleaseState, SearchResult } from "enterprise-core/dist/types";
import * as url from "url";
import { queueCheerioRequest } from "../queueManager";
import logger from "enterprise-core/dist/logger";
import { extractIndices, MediaType, sanitizeString } from "enterprise-core/dist/tools";
import * as request from "cloudscraper";
import { CloudScraper, CloudscraperOptions } from "cloudscraper";
import * as normalRequest from "request";
import { checkTocContent } from "../scraperTools";
import { UrlError } from "../errors";
import * as cheerio from "cheerio";

// @ts-expect-error
const jar = request.jar();
type RequestAPI = normalRequest.RequestAPI<CloudScraper, CloudscraperOptions, normalRequest.RequiredUriUrl>;
// @ts-expect-error
const defaultRequest: RequestAPI = request.defaults({
  jar,
});

function loadBody(urlString: string, options?: CloudscraperOptions): Promise<cheerio.CheerioAPI> {
  // @ts-expect-error
  return queueCheerioRequest(urlString, options, defaultRequest);
}

const BASE_URI = "https://kissanime.ru/";

async function scrapeNews(): Promise<NewsScrapeResult> {
  const uri = BASE_URI;
  // const $ = await loadBody("https://kissanime.ru/Home/GetNextUpdatedAnime", {method: "POST"});
  const $ = await loadBody(uri);

  const newsRows = $(".bigBarContainer .barContent a");

  const news: EpisodeNews[] = [];
  const titlePattern = /(Episode\s*((\d+)(\.(\d+))?))|(movie)/i;
  for (let i = 0; i < newsRows.length; i++) {
    const newsRow = newsRows.eq(i);

    const link = new url.URL(newsRow.attr("href") as string, uri).href;
    const span = newsRow.children("span").eq(0);
    span.remove();

    const mediumTitle = sanitizeString(newsRow.text());

    const rawTitle = sanitizeString(span.text());
    const groups = titlePattern.exec(rawTitle);

    if (!groups) {
      // TODO: 19.07.2019 log or just ignore?, kissAnime has news designated with 'episode', ona or ova only
      logger.warn(`Unknown KissAnime News Format: '${span.text()}' for '${mediumTitle}'`);
      continue;
    }

    let episodeIndices;

    let episodeTitle;

    if (groups[1]) {
      episodeTitle = sanitizeString(groups[1]);
      episodeIndices = extractIndices(groups, 2, 3, 5);

      if (!episodeIndices) {
        logger.info(`unknown news format on kissanime: ${episodeTitle}`);
        continue;
      }
    } else if (groups[6]) {
      episodeTitle = mediumTitle;
      episodeIndices = { total: 1, combi: 1 };
    } else {
      logger.info(`unknown news format on kissanime: ${rawTitle}`);
      continue;
    }
    news.push({
      link,
      mediumType: MediaType.VIDEO,
      mediumTocLink: link,
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

/*
// the latest 10 news for the given domain
    const latestNews = await Storage.getLatestNews("kissanime.ru");

    let endDate;
    // if there are no other news yet, set duration for this news batch to 10 hours
    if (!latestNews.length) {
        endDate = new Date();
        endDate.setHours(endDate.getHours() - 10);
    } else {
        for (let i = 0; i < news.length; i++) {
            const item = news[i];

            if (item.episodeTitle === latestNews[0].title) {
                let allMatch = true;
                // if there are less than 3 items left to compare the latest news with
                // a precise statement cannot be made, so just take the date of this item
                if ((i + 3) >= news.length) {
                    endDate = item.date;
                    break;
                }
                for (let j = i; j < i + 9; j++) {
                    const latestItem = latestNews[j - i];

                    if (item.episodeTitle !== latestItem.title) {
                        allMatch = false;
                        break;
                    }
                    endDate = latestItem.date;
                }
                if (!allMatch) {
                    endDate = null;
                }
            }
        }
    }
    if (endDate) {
        const duration = Date.now() - endDate.getTime();
        const itemDuration = duration / news.length;

        for (let i = 0; i < news.length; i++) {
            const date = news[i].date;
            date.setMilliseconds(date.getMilliseconds() - i * itemDuration);
        }
    } else {
        // if there is an open end, just pretend as if every 15 min one release happened
        for (let i = 0; i < news.length; i++) {
            const date = news[i].date;
            date.setMinutes(date.getMinutes() - i * 15);
        }
    }
 */

async function scrapeToc(urlString: string): Promise<Toc[]> {
  const urlRegex = /^https?:\/\/kissanime\.ru\/Anime\/[^/]+\/?$/;

  if (!urlRegex.test(urlString)) {
    throw new UrlError("invalid toc url for KissAnime: " + urlString, urlString);
  }
  const $ = await queueCheerioRequest(urlString);
  const contentElement = $("#container > #leftside");
  const animeTitle = contentElement.find(".bigBarContainer > .barContent > div > a:first-child").first().text().trim();

  const episodeElements = contentElement.find(".episodeList .listing > tbody > tr:has(td)");

  if (episodeElements.length <= 1) {
    logger.warn("toc link with no episodes: " + urlString);
    return [];
  }
  if (!animeTitle) {
    logger.warn("toc link with no title: " + urlString);
    return [];
  }
  const uri = BASE_URI;

  const content: TocEpisode[] = [];

  const chapReg = /Episode\s*((\d+)(\.(\d+))?)(\s*-\s*((\d+)(\.(\d+))?))?(\s*(.+))?/i;

  for (let i = 0; i < episodeElements.length; i++) {
    const episodeElement = episodeElements.eq(i);
    const columns = episodeElement.children();

    const date = new Date(columns.eq(1).text().trim());

    const titleElement = columns.eq(0).find("a");
    const titleString = sanitizeString(titleElement.text());
    const episodeGroups = chapReg.exec(titleString);

    if (Number.isNaN(date.getDate()) || !episodeGroups) {
      if (titleString.toLowerCase().includes("ova")) {
        continue;
      }
      logger.warn("changed episode format on kissAnime toc " + urlString);
      return [];
    }

    const link = new url.URL(titleElement.attr("href") as string, uri).href;
    const indices = extractIndices(episodeGroups, 1, 2, 4);

    if (!indices) {
      throw Error(`changed format on kissAnime, got no indices for: '${titleString}'`);
    }

    let title = "Episode " + indices.combi;

    if (episodeGroups[5]) {
      const multiIndices = extractIndices(episodeGroups, 6, 7, 9);

      if (!multiIndices) {
        throw Error(`changed format on kissAnime, got no indices for multi: '${titleString}'`);
      }
      if (indices.total < multiIndices.total) {
        for (let totalIndex = indices.total + 1; totalIndex <= multiIndices.total; totalIndex++) {
          let multiTitle = "Episode " + totalIndex;

          if (episodeGroups[11]) {
            multiTitle += " - " + episodeGroups[11];
          }

          const multiEpisodeContent = {
            title: multiTitle,
            combiIndex: totalIndex,
            totalIndex,
            partialIndex: multiIndices.fraction,
            url: link,
            releaseDate: date,
          };
          checkTocContent(multiEpisodeContent);
          content.push(multiEpisodeContent);
        }
      }
      // TODO: 19.09.2019 implement multi episodes (Episode 940 - 942 (Special)
    }
    if (episodeGroups[11]) {
      title += " - " + episodeGroups[11];
    }

    const episodeContent = {
      title,
      combiIndex: indices.combi,
      totalIndex: indices.total,
      partialIndex: indices.fraction,
      url: link,
      releaseDate: date,
    };
    checkTocContent(episodeContent);
    content.push(episodeContent);
  }
  const infoElements = $("div.bigBarContainer:nth-child(1) span.info");
  let releaseStateElement = null;

  for (let i = 0; i < infoElements.length; i++) {
    const element = infoElements.eq(i);

    if (element.text().toLocaleLowerCase().includes("status")) {
      releaseStateElement = element.parent();
    }
  }
  let releaseState: ReleaseState = ReleaseState.Unknown;

  if (releaseStateElement) {
    const releaseStateString = releaseStateElement.text().toLowerCase();
    if (releaseStateString.includes("complete")) {
      releaseState = ReleaseState.Complete;
    } else if (releaseStateString.includes("ongoing")) {
      releaseState = ReleaseState.Ongoing;
    } else if (releaseStateString.includes("hiatus")) {
      releaseState = ReleaseState.Hiatus;
    }
  }
  const toc: Toc = {
    link: urlString,
    content,
    title: animeTitle,
    statusTl: releaseState,
    mediumType: MediaType.VIDEO,
  };

  return [toc];
}

async function search(searchWords: string): Promise<SearchResult[]> {
  const urlString = BASE_URI + "Search/SearchSuggestx";

  const body = "type=Anime&keyword=" + searchWords;
  const $ = await queueCheerioRequest(urlString, {
    url: urlString,
    headers: {
      Host: "kissanime.ru",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
    body,
  });
  const searchResults: SearchResult[] = [];
  const links = $("a");

  if (!links.length) {
    return searchResults;
  }
  for (let i = 0; i < links.length; i++) {
    const linkElement = links.eq(i);

    const text = sanitizeString(linkElement.text());
    const link = new url.URL(linkElement.attr("href") as string, BASE_URI).href;

    searchResults.push({ link, title: text, medium: MediaType.IMAGE });
  }
  if (searchResults.length === 1 && searchResults[0].link === BASE_URI + "Search/SearchSuggestx") {
    // could lead to an unending loop, if the server returns always the same answer, which it should do only once
    return search(searchWords);
  }

  return searchResults;
}

scrapeNews.link = BASE_URI;
search.medium = MediaType.VIDEO;

export function getHook(): Hook {
  return {
    name: "kissanime",
    medium: MediaType.VIDEO,
    domainReg: /^https?:\/\/kissanime\.ru/,
    newsAdapter: scrapeNews,
    tocAdapter: scrapeToc,
    searchAdapter: search,
  };
}
