import { EpisodeContent, Hook, Toc, TocContent, TocEpisode } from "../types";
import {
  EpisodeNews,
  News,
  ReleaseState,
  SearchResult,
  TocSearchMedium,
  VoidablePromise,
  Nullable,
} from "enterprise-core/dist/types";
import * as url from "url";
import {
  equalsIgnore,
  extractIndices,
  MediaType,
  relativeToAbsoluteTime,
  sanitizeString,
} from "enterprise-core/dist/tools";
import logger from "enterprise-core/dist/logger";
import {
  getTextContent,
  SearchResult as TocSearchResult,
  searchToc,
  extractLinkable,
  scraperLog,
  LogType,
  getText,
} from "./directTools";
import { checkTocContent, storeHookName } from "../scraperTools";
import { MissingResourceError, UrlError } from "../errors";
import * as cheerio from "cheerio";
import request, { ResponseError } from "../request";
import { ValidationError } from "enterprise-core/dist/error";

interface NovelSearchResponse {
  success: boolean;
  data: NovelSearchData[];
}

interface NovelSearchData {
  title: string;
  url: string;
}

const BASE_URI = "https://boxnovel.com/";

async function tocSearch(medium: TocSearchMedium): VoidablePromise<Toc> {
  storeHookName("boxnovel");
  return searchToc(medium, tocAdapter, BASE_URI, (searchString) => searchAjax(searchString, medium));
}

async function search(text: string): Promise<SearchResult[]> {
  storeHookName("boxnovel");
  const urlString = BASE_URI + "wp-admin/admin-ajax.php";
  let response: NovelSearchResponse;
  const searchResults: SearchResult[] = [];
  try {
    response = await request.getJson({
      url: urlString,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
      data: "action=wp-manga-search-manga&title=" + text,
    });
  } catch (e) {
    logger.error(e);
    return searchResults;
  }

  if (response.success && response.data && response.data.length) {
    for (const datum of response.data) {
      searchResults.push({
        link: datum.url.replace("-boxnovel", ""),
        title: datum.title,
        medium: MediaType.TEXT,
      });
    }
  }
  return searchResults;
}

export async function searchAjax(searchWords: string, medium: TocSearchMedium): Promise<TocSearchResult> {
  const urlString = BASE_URI + "wp-admin/admin-ajax.php";
  let response: NovelSearchResponse;
  try {
    response = await request.getJson({
      url: urlString,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
      data: "action=wp-manga-search-manga&title=" + searchWords,
    });
  } catch (e) {
    logger.error(e);
    return { done: true };
  }

  if (response.success && response.data && response.data.length) {
    if (!response.data.length) {
      return { done: true };
    }
    for (const datum of response.data) {
      if (equalsIgnore(datum.title, medium.title) || medium.synonyms.some((s) => equalsIgnore(datum.title, s))) {
        return { value: datum.url.replace("-boxnovel", ""), done: true };
      }
    }
    return { done: false };
  } else {
    return { done: true };
  }
}

async function contentDownloadAdapter(urlString: string): Promise<EpisodeContent[]> {
  storeHookName("boxnovel");
  if (!urlString.match(/https:\/\/boxnovel\.com\/novel\/.+\/chapter-.+/)) {
    return [];
  }

  const $ = await request.getCheerio({ url: urlString });
  const mediumTitleElement = $("ol.breadcrumb li:nth-child(2) a");
  const novelTitle = sanitizeString(getText(mediumTitleElement));

  const chaTit = $(".cha-tit h3");
  let directContentElement: cheerio.Cheerio<cheerio.Element>;
  let episodeTitle: string;

  if (chaTit.length) {
    directContentElement = $(".cha-content .cha-words");
    const firstChild = directContentElement.children().first();

    if (firstChild.is(".cha-words")) {
      directContentElement = firstChild;
    }
    episodeTitle = sanitizeString(getText(chaTit));
  } else {
    const entryTitle = $("h1.entry-title").remove();

    if (!entryTitle.length) {
      const currentChapter = $("option[selected]").first();

      if (!currentChapter.length) {
        scraperLog("warn", LogType.TITLE_FORMAT, "boxnovel", { url: urlString });
        return [];
      }
      episodeTitle = sanitizeString(getText(currentChapter));
    } else {
      episodeTitle = sanitizeString(getText(entryTitle));
    }
    directContentElement = $(".reading-content");
  }

  const content = directContentElement.html();

  if (!content) {
    scraperLog("warn", LogType.CONTENT_FORMAT, "boxnovel", { url: urlString });
    return [];
  }

  return getTextContent(novelTitle, episodeTitle, urlString, content);
}

async function tocAdapter(tocLink: string): Promise<Toc[]> {
  storeHookName("boxnovel");
  const uri = BASE_URI;

  if (!tocLink.startsWith(BASE_URI + "novel/")) {
    throw new UrlError("not a valid toc url for BoxNovel: " + tocLink, tocLink);
  }
  let $: cheerio.CheerioAPI;
  try {
    $ = await request.getCheerio({ url: tocLink });
  } catch (e) {
    if (typeof e === "object" && e && "isAxiosError" in e && (e as ResponseError).isAxiosError) {
      const error = e as ResponseError;

      if (error.code === "404") {
        throw new MissingResourceError("Toc not found on BoxNovel", tocLink);
      } else {
        throw e as Error;
      }
    } else {
      throw e;
    }
  }

  if ($("body.error404").length) {
    throw new MissingResourceError("Toc not found on BoxNovel", tocLink);
  }

  const mediumTitleElement = $(".post-title h3");
  mediumTitleElement.find("span").remove();
  const mediumTitle = sanitizeString(getText(mediumTitleElement));

  const content: TocContent[] = [];
  const items = $(".wp-manga-chapter");

  const titleRegex = /ch(\.|a?.?p?.?t?.?e?.?r?.?)?\s*((\d+)(\.(\d+))?)/i;
  const numberTitleRegex = /^(\s*)((\d+)(\.(\d+))?)/i;
  const linkRegex = /ch(\.|a?.?p?.?t?.?e?.?r?.?)?-((\d+)(\.(\d+))?)/i;

  const seenEpisodes: Map<number, string> = new Map();
  let end;
  for (let i = 0; i < items.length; i++) {
    const newsRow = items.eq(i);

    const titleElement = newsRow.find("a");
    const link = new url.URL(titleElement.attr("href") as string, uri).href;

    let episodeTitle = sanitizeString(getText(titleElement));

    const timeStampElement = newsRow.find(".chapter-release-date");
    const dateString = getText(timeStampElement).trim();
    const lowerDate = dateString.toLowerCase();

    let date;
    if (lowerDate.includes("now") || lowerDate.includes("ago")) {
      date = relativeToAbsoluteTime(dateString);
    } else {
      date = new Date(dateString);
    }

    if (!date || date > new Date()) {
      scraperLog("warn", LogType.TIME_FORMAT, "boxnovel", { url: tocLink });
      return [];
    }
    let regexResult = titleRegex.exec(episodeTitle) || numberTitleRegex.exec(episodeTitle);

    if (!regexResult) {
      regexResult = linkRegex.exec(link);

      if (!regexResult) {
        const lowerTitle = episodeTitle.toLowerCase();
        // for now just skip all these extra chapters
        if (lowerTitle.startsWith("extra")) {
          continue;
        }
        scraperLog("warn", LogType.TITLE_FORMAT, "boxnovel", {
          url: tocLink,
          unknown_title: episodeTitle,
          unknown_link: link,
        });
        return [];
      }
    } else if (regexResult.index) {
      const titleIndices = extractIndices(regexResult, 2, 3, 5);
      const linkRegexResult = linkRegex.exec(link);

      if (linkRegexResult) {
        const linkIndices = extractIndices(linkRegexResult, 2, 3, 5);

        if (linkIndices && titleIndices && linkIndices.combi > titleIndices.combi) {
          regexResult = linkRegexResult;
          const partialIndexPart = linkIndices.fraction ? "." + linkIndices.fraction : "";
          episodeTitle = `Chapter ${linkIndices.total}${partialIndexPart} ${episodeTitle}`;
        }
      }
    }
    const episodeIndices = extractIndices(regexResult, 2, 3, 5);

    if (episodeTitle.endsWith("(END)")) {
      end = true;
    }

    if (!episodeIndices) {
      throw new ValidationError(`title format changed on boxNovel, got no indices for '${episodeTitle}'`);
    }
    const previousTitle = seenEpisodes.get(episodeIndices.combi);
    if (previousTitle && previousTitle === episodeTitle) {
      continue;
    }
    seenEpisodes.set(episodeIndices.combi, episodeTitle);
    const chapterContent: TocEpisode = {
      combiIndex: episodeIndices.combi,
      totalIndex: episodeIndices.total,
      partialIndex: episodeIndices.fraction,
      url: link,
      releaseDate: date,
      title: episodeTitle,
    };
    checkTocContent(chapterContent);
    content.push(chapterContent);
  }
  const releaseStateElement = $("div.post-content_item:nth-child(2) > div:nth-child(2)");
  const releaseStateString = getText(releaseStateElement).toLowerCase();
  let releaseState: ReleaseState = ReleaseState.Unknown;

  if (releaseStateString.includes("complete")) {
    end = true;
    releaseState = ReleaseState.Complete;
  } else if (releaseStateString.includes("ongoing")) {
    end = false;
    releaseState = ReleaseState.Ongoing;
  }
  const authors = extractLinkable($, ".author-content a", uri);

  return [
    {
      link: tocLink,
      content,
      title: mediumTitle,
      end,
      statusTl: releaseState,
      mediumType: MediaType.TEXT,
      authors,
    },
  ];
}

async function newsAdapter(): VoidablePromise<{ news?: News[]; episodes?: EpisodeNews[] }> {
  storeHookName("boxnovel");
  const uri = BASE_URI;
  const $ = await request.getCheerio({ url: uri });
  const items = $(".page-item-detail");

  const episodeNews: EpisodeNews[] = [];
  const titleRegex = /(vol(\.|ume)?\s*((\d+)(\.(\d+))?).+)?ch(\.|apter)?\s*((\d+)(\.(\d+))?)/i;

  for (let i = 0; i < items.length; i++) {
    const newsRow = items.eq(i);

    const mediumTitleElement = newsRow.find(".post-title a");
    const tocLink = new url.URL(mediumTitleElement.attr("href") as string, uri).href.replace("-boxnovel", "");

    const mediumTitle = sanitizeString(getText(mediumTitleElement));

    const titleElement = newsRow.find(".chapter-item .chapter a");
    const timeElements = newsRow.find(".chapter-item .post-on");

    for (let j = 0; j < titleElement.length; j++) {
      const chapterTitleElement = titleElement.eq(j);
      const link = new url.URL(chapterTitleElement.attr("href") as string, uri).href;

      const episodeTitle = sanitizeString(getText(chapterTitleElement));
      const timeStampElement = timeElements.eq(j);
      const dateString = getText(timeStampElement).trim();
      const lowerDate = dateString.toLowerCase();

      let date: Nullable<Date>;

      if (lowerDate.includes("now") || lowerDate.includes("ago")) {
        date = relativeToAbsoluteTime(dateString);
      } else {
        date = new Date(dateString);
      }

      if (!date || date > new Date()) {
        scraperLog("warn", LogType.TIME_FORMAT, "boxnovel", { url: uri });
        return;
      }
      const regexResult = titleRegex.exec(episodeTitle);
      if (!regexResult) {
        scraperLog("warn", LogType.TITLE_FORMAT, "boxnovel", { url: uri, unknown_title: episodeTitle });
        return;
      }
      let partIndices;

      if (regexResult[3]) {
        partIndices = extractIndices(regexResult, 3, 4, 6);

        if (!partIndices) {
          scraperLog("warn", LogType.INDEX_FORMAT, "boxnovel", { url: uri, unknown_index: episodeTitle });
          continue;
        }
      }
      let episodeIndices;

      if (regexResult[8]) {
        episodeIndices = extractIndices(regexResult, 8, 9, 11);

        if (!episodeIndices) {
          scraperLog("warn", LogType.INDEX_FORMAT, "boxnovel", { url: uri, unknown_index: episodeTitle });
          continue;
        }
      }
      if (episodeIndices == null || episodeIndices.combi == null) {
        scraperLog("warn", LogType.INDEX_FORMAT, "boxnovel", { url: uri, unknown_index: episodeTitle });
        return;
      }
      episodeNews.push({
        mediumTocLink: tocLink,
        mediumTitle,
        mediumType: MediaType.TEXT,
        partIndex: partIndices ? partIndices.combi : undefined,
        partTotalIndex: partIndices ? partIndices.combi : undefined,
        partPartialIndex: partIndices ? partIndices.combi : undefined,
        episodeTotalIndex: episodeIndices.total,
        episodePartialIndex: episodeIndices.fraction,
        episodeIndex: episodeIndices.combi,
        episodeTitle,
        link,
        date,
      });
    }
  }
  return { episodes: episodeNews };
}

newsAdapter.link = BASE_URI;
tocSearch.link = BASE_URI;
tocSearch.medium = MediaType.TEXT;
tocSearch.blindSearch = true;
search.medium = MediaType.TEXT;

export function getHook(): Hook {
  return {
    name: "boxnovel",
    medium: MediaType.TEXT,
    domainReg: /https:\/\/boxnovel\.com/,
    contentDownloadAdapter,
    tocAdapter,
    tocSearchAdapter: tocSearch,
    newsAdapter,
    searchAdapter: search,
  };
}
