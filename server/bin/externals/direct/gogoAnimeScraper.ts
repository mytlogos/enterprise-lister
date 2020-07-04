import {EpisodeContent, Hook, Toc, TocEpisode} from "../types";
import {equalsIgnore, extractIndices, MediaType, sanitizeString} from "../../tools";
import {EpisodeNews, News, ReleaseState, SearchResult, TocSearchMedium} from "../../types";
import {queueCheerioRequest, queueRequest} from "../queueManager";
import cheerio from "cheerio";
import logger from "../../logger";
import * as url from "url";
import {checkTocContent} from "../scraperTools";
import {SearchResult as TocSearchResult, searchToc} from "./directTools";
import {UrlError} from "../errors";

async function scrapeNews(): Promise<{ news?: News[], episodes?: EpisodeNews[] } | undefined> {
    const uri = "https://www.gogoanime.io/";
    const $ = await queueCheerioRequest(uri);

    const newsRows = $(".items li");

    const news: EpisodeNews[] = [];
    const titlePattern = /Episode\s*((\d+)(\.(\d+))?)/i;
    for (let i = 0; i < newsRows.length; i++) {
        const newsRow = newsRows.eq(i);

        const mediumElement = newsRow.find(".name a");
        const link = url.resolve(uri, mediumElement.attr("href") as string);
        const episodeTitleElement = newsRow.children(".episode");

        const mediumTitle = sanitizeString(mediumElement.text());

        const rawTitle = sanitizeString(episodeTitleElement.text());
        const groups = titlePattern.exec(rawTitle);

        if (!groups) {
            logger.warn(`Unknown GogoAnime News Format: '${episodeTitleElement.text()}' for '${mediumTitle}'`);
            continue;
        }

        const episodeTitle = sanitizeString(groups[0]);
        const episodeIndices = extractIndices(groups, 1, 2, 4);
        if (!episodeIndices) {
            logger.warn(`unknown news format on gogoAnime: ${episodeTitle}`);
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
            date: new Date()
        });
    }
    if (!news.length) {
        return {};
    }

    return {episodes: news};
}

async function scrapeToc(urlString: string): Promise<Toc[]> {
    const animeAliasReg = /^https?:\/\/www\d*\.gogoanime\.io\/category\/(.+)/;
    const aliasExec = animeAliasReg.exec(urlString);

    if (!aliasExec) {
        throw new UrlError("invalid toc url for GogoAnime: " + urlString, urlString);
    }
    const animeAlias = aliasExec[1];

    const $ = await queueCheerioRequest(urlString);
    const contentElement = $(".content_left .main_body");

    const animeTitle = sanitizeString(contentElement.find("h1").text());

    if (!animeTitle) {
        logger.warn("toc link with no title: " + urlString);
        return [];
    }

    const episodePages = contentElement.find("#episode_page li");
    if (episodePages.length < 1) {
        logger.warn("toc link with no episodes: " + urlString);
        return [];
    }
    const content: TocEpisode[] = [];
    const pageReg = /\d+\s*-\s*(\d+)/;
    let maxEpisodeIndex = 0;

    for (let i = 0; i < episodePages.length; i++) {
        const episodePage = episodePages.eq(i);
        const exec = pageReg.exec(episodePage.text());

        if (!exec) {
            logger.warn(`could not match toc episode Page text on '${urlString}'`);
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
            url: `https://www.gogoanime.io/${animeAlias}-episode-${i}`,
        };
        checkTocContent(episodeContent);
        content.push(episodeContent);
    }
    const infoElements = $("p.type");
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
        link: `https://www.gogoanime.io/category/${urlString}`,
        content,
        title: animeTitle,
        statusTl: releaseState,
        mediumType: MediaType.VIDEO
    };

    return [toc];
}

async function scrapeSearch(searchString: string, searchMedium: TocSearchMedium): Promise<TocSearchResult> {
    const searchResults = await search(searchString);
    if (!searchResults || !searchResults.length) {
        return {done: true};
    }
    for (const searchResult of searchResults) {
        const title = searchResult.title;
        if (equalsIgnore(title, searchMedium.title) || searchMedium.synonyms.some((s) => equalsIgnore(title, s))) {
            return {value: searchResult.link, done: true};
        }
    }
    return {done: false};
}

async function searchForToc(searchMedium: TocSearchMedium): Promise<Toc | undefined> {
    return searchToc(
        searchMedium,
        scrapeToc,
        "https://www.gogoanime.io/",
        (searchString) => scrapeSearch(searchString, searchMedium)
    );
}

async function search(searchWords: string): Promise<SearchResult[]> {
    const urlString = `https://ajax.apimovie.xyz/site/loadAjaxSearch?keyword=${encodeURIComponent(searchWords)}&id=-1&link_web=https%3A%2F%2Fwww.gogoanime.io%2F`;

    const response: string = await queueRequest(urlString);
    const responseJson: { content: string } = JSON.parse(response);
    const $ = cheerio.load(responseJson.content);
    const links = $("a");

    const searchResults: SearchResult[] = [];
    const coverRegex = /background: url\("(.+)"\)/i;
    for (let i = 0; i < links.length; i++) {
        const linkElement = links.eq(i);

        const coverElement = linkElement.find("[style]");

        const text = sanitizeString(linkElement.text());
        const link = linkElement.attr("href") as string;
        const coverStyle = coverElement.attr("style") as string;
        const exec = coverRegex.exec(coverStyle);
        if (!exec) {
            logger.warn(`On search gogoanime: Style with coverLink not matchable '${coverStyle}'`);
            continue;
        }
        searchResults.push({coverUrl: exec[1], link, title: text});
    }

    return searchResults;
}

scrapeNews.link = "https://www.gogoanime.io/";
searchForToc.link = "https://www.gogoanime.io/";
searchForToc.medium = MediaType.VIDEO;
searchForToc.blindSearch = true;
search.medium = MediaType.VIDEO;

async function contentDownloader(link: string): Promise<EpisodeContent[]> {
    const episodeRegex = /https:\/\/www\d*\.gogoanime\.io\/.+-episode-(\d+)/;
    const exec = episodeRegex.exec(link);
    if (!exec) {
        logger.warn(`invalid gogoanime episode link: '${link}'`);
        return [];
    }
    const $ = await queueCheerioRequest(link);

    const outSideLink = $(".download-anime + a");
    const downloadPage = await queueCheerioRequest(outSideLink.attr("href") as string);

    const downloadLink = downloadPage(".dowload a").first().attr("href") as string;
    const mediumTitle = sanitizeString($(".anime-info a").text());

    return [{content: [downloadLink], index: 1, mediumTitle, episodeTitle: `Episode ${exec[1]}`}];
}

export function getHook(): Hook {
    return {
        name: "gogoanime",
        medium: MediaType.VIDEO,
        domainReg: /^https?:\/\/www\d*\.gogoanime\.io/,
        searchAdapter: search,
        newsAdapter: scrapeNews,
        tocAdapter: scrapeToc,
        contentDownloadAdapter: contentDownloader,
        tocSearchAdapter: searchForToc,
    };
}
