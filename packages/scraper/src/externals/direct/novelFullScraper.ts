import { EpisodeContent, Hook, Toc, TocContent, NewsScrapeResult } from "../types";
import {
  EpisodeNews,
  ReleaseState,
  SearchResult,
  TocSearchMedium,
  Optional,
  VoidablePromise,
  Nullable,
} from "enterprise-core/dist/types";
import * as url from "url";
import { extractIndices, MediaType, relativeToAbsoluteTime, sanitizeString } from "enterprise-core/dist/tools";
import { isTocEpisode, isTocPart } from "../../tools";
import logger from "enterprise-core/dist/logger";
import {
  EpisodePiece,
  getTextContent,
  scrapeToc,
  searchTocCheerio,
  TocMetaPiece,
  TocPiece,
  extractLinkable,
  LogType,
  scraperLog,
  getText,
} from "./directTools";
import { ScraperError, UrlError } from "../errors";
import * as cheerio from "cheerio";
import request from "../request";
import { storeHookName } from "../scraperTools";

const BASE_URI = "https://novelfull.com/";

async function tocSearch(medium: TocSearchMedium): VoidablePromise<Toc> {
  storeHookName("novelfull");
  return searchTocCheerio(
    medium,
    tocAdapterTooled,
    BASE_URI,
    (parameter) => BASE_URI + "search?keyword=" + parameter,
    ".truyen-title a",
  );
}

async function search(text: string): Promise<SearchResult[]> {
  storeHookName("novelfull");
  const encodedText = encodeURIComponent(text);
  const $ = await request.getCheerio({ url: BASE_URI + "search?keyword=" + encodedText });

  const uri = BASE_URI;
  const results = $(".col-truyen-main .row");
  const searchResults: SearchResult[] = [];

  for (let i = 0; i < results.length; i++) {
    const resultElement = results.eq(i);
    const linkElement = resultElement.find(".truyen-title a");
    const authorElement = resultElement.find(".author");
    const coverElement = resultElement.find("img.cover");

    const coverLink = new url.URL(coverElement.attr("src") as string, uri).href;
    const author = sanitizeString(getText(authorElement));
    const title = sanitizeString(getText(linkElement));
    let tocLink = linkElement.attr("href") as string;
    tocLink = new url.URL(tocLink, uri).href;

    searchResults.push({ title, link: tocLink, author, coverUrl: coverLink, medium: MediaType.TEXT });
  }
  return searchResults;
}

async function contentDownloadAdapter(urlString: string): Promise<EpisodeContent[]> {
  storeHookName("novelfull");
  const pattern = /^https?:\/\/novelfull\.com\/.+\/.+\d+.+/;
  if (!urlString.match(pattern)) {
    scraperLog("warn", LogType.INVALID_LINK, "novelfull", { link: urlString, expected: pattern.source });
    return [];
  }

  const $ = await request.getCheerio({ url: urlString });
  const mediumTitleElement = $("ol.breadcrumb li:nth-child(2) a");
  const novelTitle = sanitizeString(getText(mediumTitleElement));

  const episodeTitle = sanitizeString(getText($(".chapter-title")));
  const directContentElement = $("#chapter-content");
  directContentElement.find("script, ins").remove();

  const content = directContentElement.html();

  if (!content) {
    scraperLog("warn", LogType.CONTENT_FORMAT, "novelfull", { url: urlString });
    return [];
  }

  return getTextContent(novelTitle, episodeTitle, urlString, content);
}

function extractTocSnippet($: cheerio.CheerioAPI, link: string): Toc {
  let end = false;
  let releaseState: ReleaseState = ReleaseState.Unknown;
  const releaseStateElement = $('a[href^="/status/"]');

  const releaseStateString = getText(releaseStateElement).toLowerCase();
  if (releaseStateString.includes("complete")) {
    end = true;
    releaseState = ReleaseState.Complete;
  } else if (releaseStateString.includes("ongoing")) {
    end = false;
    releaseState = ReleaseState.Ongoing;
  }
  const mediumTitleElement = $(".desc .title").first();
  const mediumTitle = sanitizeString(getText(mediumTitleElement));

  const authors = extractLinkable($, 'a[href^="/author/"]', BASE_URI);

  return {
    content: [],
    mediumType: MediaType.TEXT,
    end,
    statusTl: releaseState,
    title: mediumTitle,
    link,
    authors,
  };
}

async function tocAdapterTooled(tocLink: string): Promise<Toc[]> {
  storeHookName("novelfull");
  const uri = BASE_URI;

  const linkMatch = tocLink.match("^https?://novelfull\\.com/([\\w-]+.html)$");
  if (!linkMatch) {
    throw new UrlError("not a valid toc url for NovelFull: " + tocLink, tocLink);
  }
  let toc: Optional<Toc>;
  const pagedTocLink = `${BASE_URI}index.php/${linkMatch[1]}?page=`;
  const now = new Date();

  const contents: TocContent[] = await scrapeToc(
    (async function* itemGenerator(): AsyncGenerator<TocPiece, void> {
      for (let i = 1; ; i++) {
        const $ = await request.getCheerio({ url: pagedTocLink + i });

        if (!toc) {
          toc = extractTocSnippet($, tocLink);
          yield toc as TocMetaPiece;
        }
        const items = $(".list-chapter li a");

        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
          const newsRow = items.eq(itemIndex);
          const link = new url.URL(newsRow.attr("href") as string, uri).href;
          const episodeTitle = sanitizeString(getText(newsRow));
          yield { title: episodeTitle, url: link, releaseDate: now } as EpisodePiece;
        }

        if ($(".pagination .last.disabled, .pagination .next.disabled").length) {
          break;
        }

        // no novel has more than 300 toc pages (300 * 50 -> 15000 Chapters)
        if (i > 300) {
          logger.error(new ScraperError(`Could not reach end of TOC '${toc.link}'`));
          break;
        }
      }
    })(),
  );
  for (const content of contents) {
    if (isTocPart(content)) {
      if (!content.title) {
        content.title = `Volume ${content.combiIndex}`;
      }
      for (const episode of content.episodes) {
        if (!episode.title) {
          episode.title = `Chapter ${episode.combiIndex}`;
        }
      }
    } else if (isTocEpisode(content)) {
      if (!content.title) {
        content.title = `Chapter ${content.combiIndex}`;
      }
    }
  }
  if (toc) {
    toc.content = contents;
    return [toc];
  }
  return [];
}

async function newsAdapter(): Promise<NewsScrapeResult> {
  storeHookName("novelfull");
  const uri = BASE_URI;
  const $ = await request.getCheerio({ url: uri });
  const items = $("#list-index .list-new .row");

  const episodeNews: EpisodeNews[] = [];
  // some people just cant get it right to write 'Chapter' right so just allow a character error margin
  const titleRegex = /((ch(\.|a?.?p?.?t?.?e?.?r?.?)?)|-|^)\s*((\d+)(\.(\d+))?)/i;
  const abbrevTitleRegex = "|^)\\s*((\\d+)(\\.(\\d+))?)";

  for (let i = 0; i < items.length; i++) {
    const newsRow = items.eq(i);

    const mediumTitleElement = newsRow.find(".col-title a");
    const tocLink = new url.URL(mediumTitleElement.attr("href") as string, uri).href;
    const mediumTitle = sanitizeString(getText(mediumTitleElement));

    const titleElement = newsRow.find(".col-chap a");
    const link = new url.URL(titleElement.attr("href") as string, uri).href;

    const episodeTitle = sanitizeString(getText(titleElement));

    const timeStampElement = newsRow.find(".col-time");
    const date = relativeToAbsoluteTime(getText(timeStampElement).trim());

    if (!date || date > new Date()) {
      scraperLog("warn", LogType.TIME_FORMAT, "novelfull", {
        url: uri,
        unknown_time: getText(timeStampElement) || undefined,
      });
      continue;
    }
    let regexResult: Nullable<string[]> = titleRegex.exec(episodeTitle);
    if (!regexResult) {
      let abbrev = "";
      for (const word of mediumTitle.split(/[\W'´`’′‘]+/)) {
        if (word) {
          abbrev += word[0];
        }
      }
      // workaround, as some titles have the abbreviation instead of chapter before the chapter index
      const match = episodeTitle.match(new RegExp(`(${abbrev}${abbrevTitleRegex}`, "i"));

      if (!abbrev || !match) {
        if (!episodeTitle.startsWith("Side")) {
          scraperLog("warn", LogType.TITLE_FORMAT, "novelfull", { url: uri, unknown_title: episodeTitle });
        }
        continue;
      }

      regexResult = [];
      regexResult[10] = match[2];
      regexResult[11] = match[3];
      regexResult[13] = match[5];
    }
    // const partIndices = extractIndices(regexResult, 3, 4, 6);
    const episodeIndices = extractIndices(regexResult, 4, 5, 7);

    if (!episodeIndices) {
      scraperLog("warn", LogType.TITLE_FORMAT, "novelfull", { url: uri, unknown_title: episodeTitle });
      continue;
    }
    episodeNews.push({
      mediumTocLink: tocLink,
      mediumTitle,
      mediumType: MediaType.TEXT,
      // partIndex: partIndices && partIndices.combi || undefined,
      // partTotalIndex: partIndices && partIndices.total || undefined,
      // partPartialIndex: partIndices && partIndices.fraction || undefined,
      episodeTotalIndex: episodeIndices.total,
      episodePartialIndex: episodeIndices.fraction,
      episodeIndex: episodeIndices.combi,
      episodeTitle,
      link,
      date,
    });
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
    name: "novelfull",
    medium: MediaType.TEXT,
    domainReg: /https?:\/\/novelfull\.com/,
    contentDownloadAdapter,
    tocAdapter: tocAdapterTooled,
    newsAdapter,
    tocSearchAdapter: tocSearch,
    searchAdapter: search,
  };
}
