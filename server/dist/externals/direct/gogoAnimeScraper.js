"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const tools_1 = require("../../tools");
const queueManager_1 = require("../queueManager");
const cheerio_1 = tslib_1.__importDefault(require("cheerio"));
const logger_1 = tslib_1.__importDefault(require("../../logger"));
const url = tslib_1.__importStar(require("url"));
const scraperTools_1 = require("../scraperTools");
function loadBody(urlString, options) {
    // @ts-ignore
    return queueManager_1.queueCheerioRequest(urlString, options, defaultRequest);
}
async function scrapeNews() {
    const uri = "https://www10.gogoanime.io/";
    const $ = await loadBody(uri);
    const newsRows = $(".items li");
    const news = [];
    const titlePattern = /Episode\s*((\d+)(\.(\d+))?)/i;
    for (let i = 0; i < newsRows.length; i++) {
        const newsRow = newsRows.eq(i);
        const mediumElement = newsRow.find(".name a");
        const link = url.resolve(uri, mediumElement.attr("href"));
        const episodeTitleElement = newsRow.children(".episode");
        const mediumTitle = tools_1.sanitizeString(mediumElement.text());
        const rawTitle = tools_1.sanitizeString(episodeTitleElement.text());
        const groups = titlePattern.exec(rawTitle);
        if (!groups) {
            console.log(`Unknown KissAnime News Format: '${episodeTitleElement.text()}' for '${mediumTitle}'`);
            continue;
        }
        const episodeTitle = tools_1.sanitizeString(groups[0]);
        const episodeIndices = tools_1.extractIndices(groups, 1, 2, 4);
        if (!episodeIndices) {
            logger_1.default.info(`unknown news format on kissanime: ${episodeTitle}`);
            continue;
        }
        news.push({
            link,
            mediumType: tools_1.MediaType.VIDEO,
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
    return { episodes: news };
}
async function scrapeToc(urlString) {
    const animeAliasReg = /https?:\/\/www10\.gogoanime\.io\/category\/(.+)/;
    const aliasExec = animeAliasReg.exec(urlString);
    if (!aliasExec) {
        logger_1.default.warn("invalid toc url: " + urlString);
        return [];
    }
    const animeAlias = aliasExec[1];
    const $ = await queueManager_1.queueCheerioRequest(urlString);
    const contentElement = $(".content_left .main_body");
    const animeTitle = tools_1.sanitizeString(contentElement.find("h1").text());
    if (!animeTitle) {
        logger_1.default.warn("toc link with no title: " + urlString);
        return [];
    }
    const episodePages = contentElement.find("#episode_page li");
    if (episodePages.length < 1) {
        logger_1.default.warn("toc link with no episodes: " + urlString);
        return [];
    }
    const content = [];
    const pageReg = /\d+\s*-\s*(\d+)/;
    let maxEpisodeIndex = 0;
    for (let i = 0; i < episodePages.length; i++) {
        const episodePage = episodePages.eq(i);
        const exec = pageReg.exec(episodePage.text());
        if (!exec) {
            logger_1.default.warn(`could not match toc episode Page text on '${urlString}'`);
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
        scraperTools_1.checkTocContent(episodeContent);
        content.push(episodeContent);
    }
    const toc = {
        link: urlString,
        content,
        title: animeTitle,
        mediumType: tools_1.MediaType.VIDEO
    };
    return [toc];
}
async function searchToc() {
}
async function search(searchWords) {
    const urlString = `https://ajax.apimovie.xyz/site/loadAjaxSearch?keyword=${encodeURIComponent(searchWords)}&id=-1&link_web=https%3A%2F%2Fwww10.gogoanime.io%2F`;
    const response = await queueManager_1.queueRequest(urlString);
    const responseJson = JSON.parse(response);
    const $ = cheerio_1.default.load(responseJson.content);
    const links = $("a");
    const searchResults = [];
    const coverRegex = /background: url\("(.+)"\)/i;
    for (let i = 0; i < links.length; i++) {
        const linkElement = links.eq(i);
        const coverElement = linkElement.find("[style]");
        const text = tools_1.sanitizeString(linkElement.text());
        const link = linkElement.attr("href");
        const coverStyle = coverElement.attr("style");
        const exec = coverRegex.exec(coverStyle);
        if (!exec) {
            logger_1.default.warn(`On search gogoanime: Style with coverLink not matchable '${coverStyle}'`);
            continue;
        }
        searchResults.push({ coverUrl: exec[1], link, title: text });
    }
    return searchResults;
}
scrapeNews.link = "https://www10.gogoanime.io/";
search.medium = tools_1.MediaType.VIDEO;
async function contentDownloader(link) {
    const episodeRegex = /https:\/\/www10\.gogoanime\.io\/.+-episode-(\d+)/;
    const exec = episodeRegex.exec(link);
    if (!exec) {
        logger_1.default.warn(`invalid gogoanime episode link: '${link}'`);
        return [];
    }
    const $ = await queueManager_1.queueCheerioRequest(link);
    const outSideLink = $(".download-anime + a");
    const downloadPage = await queueManager_1.queueCheerioRequest(outSideLink.attr("href"));
    const downloadLink = downloadPage(".dowload a").first().attr("href");
    const mediumTitle = tools_1.sanitizeString($(".anime-info a").text());
    return [{ content: [downloadLink], index: 1, mediumTitle, episodeTitle: `Episode ${exec[1]}` }];
}
function getHook() {
    return {
        name: "gogoanime",
        medium: tools_1.MediaType.VIDEO,
        domainReg: /^https?:\/\/www10\.gogoanime\.io/,
        searchAdapter: search,
        newsAdapter: scrapeNews,
        tocAdapter: scrapeToc,
        contentDownloadAdapter: contentDownloader,
    };
}
exports.getHook = getHook;
//# sourceMappingURL=gogoAnimeScraper.js.map