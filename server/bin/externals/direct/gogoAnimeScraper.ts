import {EpisodeContent, Hook, Toc, TocEpisode} from "../types";
import {extractIndices, MediaType, sanitizeString} from "../../tools";
import {EpisodeNews, News, SearchResult} from "../../types";
import {queueCheerioRequest, queueRequest} from "../queueManager";
import cheerio from "cheerio";
import logger from "../../logger";
import {CloudscraperOptions} from "cloudscraper";
import * as url from "url";
import {checkTocContent} from "../scraperTools";

function loadBody(urlString: string, options?: CloudscraperOptions): Promise<CheerioStatic> {
    // @ts-ignore
    return queueCheerioRequest(urlString, options, defaultRequest);
}

async function scrapeNews(): Promise<{ news?: News[], episodes?: EpisodeNews[] } | undefined> {
    const uri = "https://www10.gogoanime.io/";
    const $ = await loadBody(uri);

    const newsRows = $(".items li");

    const news: EpisodeNews[] = [];
    const titlePattern = /Episode\s*((\d+)(\.(\d+))?)/i;
    for (let i = 0; i < newsRows.length; i++) {
        const newsRow = newsRows.eq(i);

        const mediumElement = newsRow.find(".name a");
        const link = url.resolve(uri, mediumElement.attr("href"));
        const episodeTitleElement = newsRow.children(".episode");

        const mediumTitle = sanitizeString(mediumElement.text());

        const rawTitle = sanitizeString(episodeTitleElement.text());
        const groups = titlePattern.exec(rawTitle);

        if (!groups) {
            console.log(`Unknown KissAnime News Format: '${episodeTitleElement.text()}' for '${mediumTitle}'`);
            continue;
        }

        const episodeTitle = sanitizeString(groups[0]);
        const episodeIndices = extractIndices(groups, 1, 2, 4);
        if (!episodeIndices) {
            logger.info(`unknown news format on kissanime: ${episodeTitle}`);
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
    const animeAliasReg = /https?:\/\/www10\.gogoanime\.io\/category\/(.+)/;
    const aliasExec = animeAliasReg.exec(urlString);

    if (!aliasExec) {
        logger.warn("invalid toc url: " + urlString);
        return [];
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
            url: `https://www10.gogoanime.io/detective-conan-episode-${i}`,
        };
        checkTocContent(episodeContent);
        content.push(episodeContent);
    }

    const toc: Toc = {
        link: urlString,
        content,
        title: animeTitle,
        mediumType: MediaType.VIDEO
    };

    return [toc];
}

async function searchToc() {

}

async function search(searchWords: string): Promise<SearchResult[]> {
    const urlString = `https://ajax.apimovie.xyz/site/loadAjaxSearch?keyword=${encodeURIComponent(searchWords)}&id=-1&link_web=https%3A%2F%2Fwww10.gogoanime.io%2F`;

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
        const link = linkElement.attr("href");
        const coverStyle = coverElement.attr("style");
        const exec = coverRegex.exec(coverStyle);
        if (!exec) {
            logger.warn(`On search gogoanime: Style with coverLink not matchable '${coverStyle}'`);
            continue;
        }
        searchResults.push({coverUrl: exec[1], link, title: text});
    }

    return searchResults;
}

scrapeNews.link = "https://www10.gogoanime.io/";
search.medium = MediaType.VIDEO;

async function contentDownloader(link: string): Promise<EpisodeContent[]> {
    const episodeRegex = /https:\/\/www10\.gogoanime\.io\/.+-episode-(\d+)/;
    const exec = episodeRegex.exec(link);
    if (!exec) {
        logger.warn(`invalid gogoanime episode link: '${link}'`);
        return [];
    }
    const $ = await queueCheerioRequest(link);

    const outSideLink = $(".download-anime + a");
    const downloadPage = await queueCheerioRequest(outSideLink.attr("href"));

    const downloadLink = downloadPage(".dowload a").first().attr("href");
    const mediumTitle = sanitizeString($(".anime-info a").text());

    return [{content: [downloadLink], index: 1, mediumTitle, episodeTitle: `Episode ${exec[1]}`}];
}

export function getHook(): Hook {
    return {
        name: "gogoanime",
        medium: MediaType.VIDEO,
        domainReg: /^https?:\/\/www10\.gogoanime\.io/,
        searchAdapter: search,
        newsAdapter: scrapeNews,
        tocAdapter: scrapeToc,
        contentDownloadAdapter: contentDownloader,
    };
}
