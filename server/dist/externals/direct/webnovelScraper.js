"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const tools_1 = require("../../tools");
const logger_1 = tslib_1.__importDefault(require("../../logger"));
const url = tslib_1.__importStar(require("url"));
const queueManager_1 = require("../queueManager");
const request = tslib_1.__importStar(require("request-promise-native"));
const scraperTools_1 = require("../scraperTools");
const errors_1 = require("../errors");
const jar = request.jar();
const defaultRequest = request.defaults({
    jar
});
const initPromise = queueManager_1.queueRequest("https://www.webnovel.com/", {
    method: "HEAD",
    uri: "https://www.webnovel.com/"
}, defaultRequest).then(tools_1.ignore);
async function scrapeNews() {
    const uri = "https://www.webnovel.com/";
    const $ = await queueManager_1.queueCheerioRequest(uri);
    const newsRows = $("#LatUpdate tbody > tr");
    const news = [];
    const titlePattern = /(\d+) .+/i;
    for (let i = 0; i < newsRows.length; i++) {
        const newsRow = newsRows.eq(i);
        const tableData = newsRow.children("td");
        const mediumElement = tableData.eq(1);
        const mediumTocLinkElement = mediumElement.children("a").first();
        const mediumTocTotalLink = url.resolve(uri, mediumTocLinkElement.attr("href"));
        const mediumTocLinkGroup = /https?:\/\/(www\.)?webnovel\.com\/book\/\d+\//.exec(mediumTocTotalLink);
        if (!mediumTocLinkGroup) {
            logger_1.default.info(`unknown toc link format on webnovel: ${mediumTocTotalLink}`);
            continue;
        }
        const mediumTocLink = mediumTocLinkGroup[0];
        const mediumTitle = tools_1.sanitizeString(mediumElement.text());
        const titleElement = tableData.eq(2).children("a").first();
        const episodeTitle = tools_1.sanitizeString(titleElement.text());
        const textTime = tableData.eq(5).text().trim();
        const time = tools_1.relativeToAbsoluteTime(textTime);
        if (!time) {
            logger_1.default.warn(`could not parse time of webnovel news: '${textTime}'`);
            continue;
        }
        const totalLink = url.resolve(uri, titleElement.attr("href"));
        const linkGroup = /(https:\/\/www\.webnovel\.com\/book\/\d+\/\d+\/).+/.exec(totalLink);
        if (!linkGroup) {
            logger_1.default.info(`unknown news url format on webnovel: ${totalLink}`);
            continue;
        }
        const link = linkGroup[1];
        const groups = titlePattern.exec(episodeTitle);
        if (!groups || !groups[1]) {
            logger_1.default.info(`unknown news format on webnovel: ${episodeTitle}`);
            continue;
        }
        const index = Number(groups[1]);
        news.push({
            mediumTitle,
            mediumTocLink,
            mediumType: tools_1.MediaType.TEXT,
            episodeTitle,
            episodeIndex: index,
            episodeTotalIndex: index,
            date: time,
            link
        });
    }
    return { episodes: news };
}
async function scrapeToc(urlString) {
    // wait for a normal request, to get the right cookies
    await initPromise;
    const bookIdResult = /https?:\/\/(www\.)?webnovel\.com\/book\/(\d+)/.exec(urlString);
    if (!bookIdResult) {
        throw new errors_1.UrlError("WebNovel toc link has no bookIdResult: " + urlString, urlString);
    }
    const bookId = bookIdResult[2];
    return scrapeTocPage(bookId);
}
async function scrapeTocPage(bookId, mediumId) {
    const csrfCookie = jar.getCookies("https://www.webnovel.com").find((value) => value.key === "_csrfToken");
    if (!csrfCookie) {
        logger_1.default.warn("csrf cookie not found for webnovel");
        return [];
    }
    const csrfValue = csrfCookie.value;
    const tocLink = `https://www.webnovel.com/apiajax/chapter/GetChapterList?bookId=${bookId}&_csrfToken=${csrfValue}`;
    const tocJson = await loadJson(tocLink);
    if (tocJson.code !== 0) {
        logger_1.default.warn("WebNovel toc request was not successful for: " + bookId);
        return [];
    }
    if (!tocJson.data || !tocJson.data.volumeItems || !tocJson.data.volumeItems.length) {
        logger_1.default.warn("no toc content on webnovel for " + bookId);
        return [];
    }
    const idPattern = /^\d+$/;
    const content = tocJson.data.volumeItems.map((volume) => {
        if (!volume.name) {
            volume.name = "Volume " + volume.index;
        }
        const name = volume.name;
        const chapters = volume.chapterItems.map((item) => {
            let date = new Date(item.createTime);
            if (Number.isNaN(date.getDate())) {
                date = tools_1.relativeToAbsoluteTime(item.createTime) || new Date();
            }
            if (!date) {
                throw Error(`invalid date: '${item.createTime}'`);
            }
            if (!idPattern.test(item.id)) {
                throw Error("invalid chapterId: " + item.id);
            }
            const chapterContent = {
                url: `https://www.webnovel.com/book/${bookId}/${item.id}/`,
                title: item.name,
                combiIndex: item.index,
                totalIndex: item.index,
                releaseDate: date,
                locked: item.isVip !== 0
            };
            scraperTools_1.checkTocContent(chapterContent);
            return chapterContent;
        });
        const partContent = {
            episodes: chapters,
            title: name,
            combiIndex: volume.index,
            totalIndex: volume.index,
        };
        scraperTools_1.checkTocContent(partContent, true);
        return partContent;
    });
    const toc = {
        link: `https://www.webnovel.com/book/${bookId}/`,
        synonyms: [tocJson.data.bookInfo.bookSubName],
        mediumId,
        content,
        partsOnly: true,
        title: tocJson.data.bookInfo.bookName,
        mediumType: tools_1.MediaType.TEXT
    };
    return [toc];
}
function loadBody(urlString) {
    return initPromise.then(() => queueManager_1.queueCheerioRequest(urlString, undefined, defaultRequest));
}
function loadJson(urlString) {
    return initPromise
        .then(() => queueManager_1.queueRequest(urlString, undefined, defaultRequest))
        .then((body) => JSON.parse(body));
}
async function scrapeContent(urlString) {
    let $;
    try {
        $ = await loadBody(urlString);
    }
    catch (e) {
        logger_1.default.warn("could not access: " + urlString);
        return [];
    }
    const contentElement = $(".chapter_content");
    const titleElement = $(".cha-hd-mn-text a").first();
    const novelTitle = tools_1.sanitizeString(titleElement.text().replace(/\/\s*$/, ""));
    titleElement.remove();
    const episodeTitle = tools_1.sanitizeString($(".cha-hd-mn-text").text());
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
        logger_1.default.warn("episode link with no novel or episode title: " + urlString);
        return [];
    }
    const episodeContent = {
        content: [],
        episodeTitle,
        mediumTitle: novelTitle,
        index
    };
    // either normal premium locked or app locked
    if ($("._lock").length || !contentElement.children().length) {
        episodeContent.locked = true;
        return [episodeContent];
    }
    else if (!content) {
        logger_1.default.warn("episode link with no content: " + urlString);
        return [];
    }
    return [episodeContent];
}
async function searchToc(searchMedium) {
    logger_1.default.info("start searching webnovel " + searchMedium.mediumId);
    const urlString = "https://www.webnovel.com/search?keywords=" + encodeURIComponent(searchMedium.title);
    const body = await loadBody(urlString);
    const titles = body("body > div.page  ul[class*=result] > li > h3 > a");
    let bookId;
    for (let i = 0; i < titles.length; i++) {
        const titleElement = titles.eq(i);
        const possibleTitles = [searchMedium.title, ...searchMedium.synonyms];
        const title = tools_1.sanitizeString(titleElement.text());
        if (possibleTitles.some((value) => tools_1.equalsIgnore(title, value))) {
            bookId = titleElement.attr("data-bookid");
            break;
        }
    }
    if (!bookId) {
        return;
    }
    const idPattern = /^\d+$/;
    if (!idPattern.test(bookId)) {
        throw Error("invalid bookId");
    }
    const [toc] = await scrapeTocPage(bookId, searchMedium.mediumId);
    logger_1.default.info("scraping toc on webnovel successfully " + searchMedium.mediumId);
    return toc;
}
async function search(text) {
    const uri = "https://www.webnovel.com";
    const urlString = "https://www.webnovel.com/search?keywords=" + encodeURIComponent(text);
    const body = await loadBody(urlString);
    const results = body("body > div.page  ul[class*=result] > li");
    const searchResult = [];
    for (let i = 0; i < results.length; i++) {
        const result = results.eq(i);
        const titleElement = result.find("h3 > a");
        const coverElement = result.find("img");
        const title = tools_1.sanitizeString(titleElement.text());
        const coverUrl = url.resolve(uri, coverElement.attr("src"));
        const link = url.resolve(uri, titleElement.attr("href"));
        searchResult.push({ title, link, coverUrl });
    }
    return searchResult;
}
scrapeNews.link = "https://www.webnovel.com/";
searchToc.link = "https://www.webnovel.com/";
searchToc.medium = tools_1.MediaType.TEXT;
search.medium = tools_1.MediaType.TEXT;
function getHook() {
    return {
        name: "webnovel",
        medium: tools_1.MediaType.TEXT,
        domainReg: /^https:\/\/(www\.)?webnovel\.com/,
        // tslint:disable-next-line:max-line-length
        tocPattern: /^https:\/\/(paste\.tech-port\.de)|(priv\.atebin\.com)|(paste\.fizi\.ca)|(privatebin\.secured\.fi)\/$/,
        newsAdapter: scrapeNews,
        contentDownloadAdapter: scrapeContent,
        tocAdapter: scrapeToc,
        tocSearchAdapter: searchToc,
        searchAdapter: search
    };
}
exports.getHook = getHook;
//# sourceMappingURL=webnovelScraper.js.map