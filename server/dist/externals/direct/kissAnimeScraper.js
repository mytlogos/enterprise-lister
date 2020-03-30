"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const url = tslib_1.__importStar(require("url"));
const queueManager_1 = require("../queueManager");
const logger_1 = tslib_1.__importDefault(require("../../logger"));
const tools_1 = require("../../tools");
const request = tslib_1.__importStar(require("cloudscraper"));
const scraperTools_1 = require("../scraperTools");
const errors_1 = require("../errors");
// @ts-ignore
const jar = request.jar();
// @ts-ignore
const defaultRequest = request.defaults({
    jar
});
function loadBody(urlString, options) {
    // @ts-ignore
    return queueManager_1.queueCheerioRequest(urlString, options, defaultRequest);
}
async function scrapeNews() {
    const uri = "https://kissanime.ru/";
    // const $ = await loadBody("https://kissanime.ru/Home/GetNextUpdatedAnime", {method: "POST"});
    const $ = await loadBody(uri);
    const newsRows = $(".bigBarContainer .barContent a");
    const news = [];
    const titlePattern = /(Episode\s*((\d+)(\.(\d+))?))|(movie)/i;
    for (let i = 0; i < newsRows.length; i++) {
        const newsRow = newsRows.eq(i);
        const link = url.resolve(uri, newsRow.attr("href"));
        const span = newsRow.children("span").eq(0);
        span.remove();
        const mediumTitle = tools_1.sanitizeString(newsRow.text());
        const rawTitle = tools_1.sanitizeString(span.text());
        const groups = titlePattern.exec(rawTitle);
        if (!groups) {
            // TODO: 19.07.2019 log or just ignore?, kissAnime has news designated with 'episode', ona or ova only
            logger_1.default.warn(`Unknown KissAnime News Format: '${span.text()}' for '${mediumTitle}'`);
            continue;
        }
        let episodeIndices;
        let episodeTitle;
        if (groups[1]) {
            episodeTitle = tools_1.sanitizeString(groups[1]);
            episodeIndices = tools_1.extractIndices(groups, 2, 3, 5);
            if (!episodeIndices) {
                logger_1.default.info(`unknown news format on kissanime: ${episodeTitle}`);
                continue;
            }
        }
        else if (groups[6]) {
            episodeTitle = mediumTitle;
            episodeIndices = { total: 1, combi: 1 };
        }
        else {
            logger_1.default.info(`unknown news format on kissanime: ${rawTitle}`);
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
async function scrapeToc(urlString) {
    const urlRegex = /^https?:\/\/kissanime\.ru\/Anime\/[^\/]+\/?$/;
    if (!urlRegex.test(urlString)) {
        throw new errors_1.UrlError("invalid toc url for KissAnime: " + urlString, urlString);
    }
    const $ = await queueManager_1.queueCheerioRequest(urlString);
    const contentElement = $("#container > #leftside");
    const animeTitle = contentElement
        .find(".bigBarContainer > .barContent > div > a:first-child")
        .first()
        .text()
        .trim();
    const episodeElements = contentElement.find(".episodeList .listing > tbody > tr:has(td)");
    if (episodeElements.length <= 1) {
        logger_1.default.warn("toc link with no episodes: " + urlString);
        return [];
    }
    if (!animeTitle) {
        logger_1.default.warn("toc link with no title: " + urlString);
        return [];
    }
    const uri = "https://kissanime.ru/";
    const content = [];
    const chapReg = /Episode\s*((\d+)(\.(\d+))?)(\s*-\s*((\d+)(\.(\d+))?))?(\s*(.+))?/i;
    for (let i = 0; i < episodeElements.length; i++) {
        const episodeElement = episodeElements.eq(i);
        const columns = episodeElement.children();
        const date = new Date(columns.eq(1).text().trim());
        const titleElement = columns.eq(0).find("a");
        const titleString = tools_1.sanitizeString(titleElement.text());
        const episodeGroups = chapReg.exec(titleString);
        if (Number.isNaN(date.getDate()) || !episodeGroups) {
            if (titleString.toLowerCase().includes("ova")) {
                continue;
            }
            logger_1.default.warn("changed episode format on kissAnime toc " + urlString);
            return [];
        }
        const link = url.resolve(uri, titleElement.attr("href"));
        const indices = tools_1.extractIndices(episodeGroups, 1, 2, 4);
        if (!indices) {
            throw Error(`changed format on kissAnime, got no indices for: '${titleString}'`);
        }
        let title = "Episode " + indices.combi;
        if (episodeGroups[5]) {
            const multiIndices = tools_1.extractIndices(episodeGroups, 6, 7, 9);
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
                        releaseDate: date
                    };
                    scraperTools_1.checkTocContent(multiEpisodeContent);
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
            releaseDate: date
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
async function search(searchWords) {
    const urlString = "https://kissanime.ru/Search/SearchSuggestx";
    const body = "type=Anime&keyword=" + searchWords;
    const $ = await queueManager_1.queueCheerioRequest(urlString, {
        url: urlString,
        headers: {
            "Host": "kissanime.ru",
            "Content-Type": "application/x-www-form-urlencoded"
        },
        method: "POST",
        body
    });
    const searchResults = [];
    const links = $("a");
    if (!links.length) {
        return searchResults;
    }
    for (let i = 0; i < links.length; i++) {
        const linkElement = links.eq(i);
        const text = tools_1.sanitizeString(linkElement.text());
        const link = url.resolve("https://kissanime.ru/", linkElement.attr("href"));
        searchResults.push({ link, title: text });
    }
    if (searchResults.length === 1 && searchResults[0].link === "https://kissanime.ru/Search/SearchSuggestx") {
        // could lead to an unending loop, if the server returns always the same answer, which it should do only once
        return search(searchWords);
    }
    return searchResults;
}
scrapeNews.link = "https://kissanime.ru/";
search.medium = tools_1.MediaType.VIDEO;
function getHook() {
    return {
        name: "kissanime",
        medium: tools_1.MediaType.VIDEO,
        domainReg: /^https?:\/\/kissanime\.ru/,
        newsAdapter: scrapeNews,
        tocAdapter: scrapeToc,
        searchAdapter: search,
    };
}
exports.getHook = getHook;
//# sourceMappingURL=kissAnimeScraper.js.map