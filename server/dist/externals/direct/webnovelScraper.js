"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const tools_1 = require("../../tools");
const logger_1 = tslib_1.__importDefault(require("../../logger"));
const url = tslib_1.__importStar(require("url"));
const queueManager_1 = require("../queueManager");
const request = tslib_1.__importStar(require("request-promise-native"));
const jar = request.jar();
const defaultRequest = request.defaults({
    jar
});
const initPromise = queueManager_1.queueRequest("https://www.webnovel.com/", {
    method: "HEAD",
    uri: "https://www.webnovel.com/"
}, defaultRequest);
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
        const mediumTocLink = url.resolve(uri, mediumTocLinkElement.attr("href"));
        const mediumTitle = tools_1.sanitizeString(mediumElement.text());
        const titleElement = tableData.eq(2).children("a").first();
        const episodeTitle = tools_1.sanitizeString(titleElement.text());
        const link = url.resolve(uri, titleElement.attr("href"));
        const textTime = tableData.eq(5).text().trim();
        const time = tools_1.relativeToAbsoluteTime(textTime);
        if (!time) {
            logger_1.default.warn(`could not parse time of webnovel news: '${textTime}'`);
            continue;
        }
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
    const bookId = /https?:\/\/(www\.)?webnovel\.com\/book\/(\d+)/.exec(urlString);
    if (!bookId || !bookId[2]) {
        logger_1.default.warn("WebNovel toc link has no bookId: " + urlString);
        return [];
    }
    const csrfCookie = jar.getCookies("https://www.webnovel.com").find((value) => value.key === "_csrfToken");
    if (!csrfCookie) {
        logger_1.default.warn("csrf cookie not found for webnovel");
        return [];
    }
    const csrfValue = csrfCookie.value;
    const link = `https://www.webnovel.com/apiajax/chapter/GetChapterList?bookId=${bookId[2]}&_csrfToken=${csrfValue}`;
    const tocJson = await loadJson(link);
    if (tocJson.code !== 0) {
        logger_1.default.warn("WebNovel toc request was not successful for: " + urlString);
        return [];
    }
    const content = tocJson.data.volumeItems.map((volume) => {
        const name = volume.name;
        const chapters = volume.chapterItems.map((item) => {
            let date = new Date(item.createTime);
            if (Number.isNaN(date.getDate())) {
                date = tools_1.relativeToAbsoluteTime(item.createTime) || new Date();
            }
            return {
                url: `https://www.webnovel.com/book/${bookId}/${item.id}/`,
                title: item.name,
                combiIndex: item.index,
                totalIndex: item.index,
                releaseDate: date
            };
        });
        return {
            episodes: chapters,
            title: name,
            combiIndex: volume.index,
            totalIndex: volume.index,
        };
    });
    const toc = {
        link: urlString,
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
    const $ = await loadBody(urlString);
    const contentElement = $(".chapter_content");
    const novelTitle = contentElement.find(".cha-hd-mn-text").first().text().trim();
    const episodeTitle = contentElement.find(".cha-tit h3").first().text().trim();
    const content = contentElement.find(".cha-words").first().html();
    if (!novelTitle || !episodeTitle) {
        logger_1.default.warn("episode link with no novel or episode title: " + urlString);
        return [];
    }
    if (!content) {
        logger_1.default.warn("episode link with no content: " + urlString);
        return [];
    }
    const chapterGroups = /^\s*Chapter\s*(\d+(\.\d+)?)/.exec(episodeTitle);
    let index;
    if (chapterGroups) {
        index = Number(chapterGroups[1]);
    }
    if (index != null && Number.isNaN(index)) {
        index = undefined;
    }
    const textEpisodeContent = {
        contentType: tools_1.MediaType.TEXT,
        content,
        episodeTitle,
        mediumTitle: novelTitle,
        index
    };
    return [textEpisodeContent];
}
async function searchToc(searchMedium) {
    console.log("start scraping webnovel " + searchMedium.mediumId);
    const urlString = "https://www.webnovel.com/search?keywords=" + encodeURIComponent(searchMedium.title);
    const body = await loadBody(urlString);
    const titles = body("body > div.page  ul[class*=result] > li > h3 > a");
    let bookId;
    for (let i = 0; i < titles.length; i++) {
        const titleElement = titles.eq(i);
        const possibleTitles = [searchMedium.title, ...searchMedium.synonyms];
        if (possibleTitles.some((value) => tools_1.equalsIgnore(titleElement.text(), value))) {
            bookId = titleElement.attr("data-bookid");
            break;
        }
    }
    if (!bookId) {
        return;
    }
    const csrfCookie = jar.getCookies("https://www.webnovel.com").find((value) => value.key === "_csrfToken");
    if (!csrfCookie) {
        return;
    }
    // TODO: 03.07.2019 get _csrfToken from defaultRequest cookies
    const tocJson = await loadJson(`https://www.webnovel.com/apiajax/chapter/GetChapterList?_csrfToken=${csrfCookie.value}&bookId=${bookId}`);
    if (!tocJson.data || !tocJson.data.volumeItems || !tocJson.data.volumeItems.length) {
        return;
    }
    const parts = [];
    for (const volumeItem of tocJson.data.volumeItems) {
        if (!volumeItem.name) {
            volumeItem.name = "Volume " + volumeItem.index;
        }
        const episodes = [];
        parts.push({ totalIndex: volumeItem.index, title: volumeItem.name, combiIndex: volumeItem.index, episodes });
        for (const chapterItem of volumeItem.chapterItems) {
            const date = new Date(chapterItem.createTime);
            const releaseDate = date.getTime() ? date : tools_1.relativeToAbsoluteTime(chapterItem.createTime);
            if (!releaseDate) {
                throw Error(`invalid date: '${chapterItem.createTime}'`);
            }
            const link = `https://www.webnovel.com/book/${bookId}/${chapterItem.id}/`;
            episodes.push({
                title: chapterItem.name,
                combiIndex: chapterItem.index,
                totalIndex: chapterItem.index,
                releaseDate,
                url: link
            });
        }
    }
    console.log("scraping toc on webnovel successfully " + searchMedium.mediumId);
    return {
        link: `https://www.webnovel.com/book/${bookId}/`,
        synonyms: [tocJson.data.bookInfo.bookSubName],
        content: parts,
        title: tocJson.data.bookInfo.bookName,
        mediumId: searchMedium.mediumId,
        mediumType: tools_1.MediaType.TEXT,
        partsOnly: true
    };
}
scrapeNews.link = "https://www.webnovel.com/";
function getHook() {
    return {
        domainReg: /^https:\/\/(www\.)?webnovel\.com/,
        // tslint:disable-next-line:max-line-length
        tocPattern: /^https:\/\/(paste\.tech-port\.de)|(priv\.atebin\.com)|(paste\.fizi\.ca)|(privatebin\.secured\.fi)\/$/,
        newsAdapter: scrapeNews,
        contentDownloadAdapter: scrapeContent,
        tocAdapter: scrapeToc,
        tocSearchAdapter: searchToc
    };
}
exports.getHook = getHook;
//# sourceMappingURL=webnovelScraper.js.map