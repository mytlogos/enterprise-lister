"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const tools_1 = require("../../tools");
const logger_1 = tslib_1.__importDefault(require("../../logger"));
const url = tslib_1.__importStar(require("url"));
const queueManager_1 = require("../queueManager");
const request = tslib_1.__importStar(require("request-promise-native"));
const defaultRequest = request.defaults({
    jar: true
});
const initPromise = queueManager_1.queueRequest("https://www.webnovel.com/", undefined, defaultRequest);
async function scrapeNews() {
    const uri = "https://www.webnovel.com/";
    const $ = await queueManager_1.queueCheerioRequest(uri);
    const newsRows = $("#LatUpdate tbody > tr");
    const news = [];
    for (let i = 0; i < newsRows.length; i++) {
        const newsRow = newsRows.eq(i);
        const tableData = newsRow.children("td");
        const mediumName = tableData.eq(1).text().trim();
        const titleElement = tableData.eq(2).children("a").first();
        const title = titleElement.text().trim();
        const link = url.resolve(uri, titleElement.attr("href"));
        const time = tools_1.relativeToAbsoluteTime(tableData.eq(5).text().trim());
        if (!time) {
            logger_1.default.warn("could not parse time of webnovel news");
            continue;
        }
        news.push({
            date: time,
            link,
            title: `${mediumName} - ${title}`
        });
    }
    return news;
}
async function scrapeToc(urlString) {
    const bookId = /https?:\/\/(www\.)?webnovel\.com\/book\/(\d+)/.exec(urlString);
    if (!bookId || !bookId[2]) {
        logger_1.default.warn("WebNovel toc link has no bookId: " + urlString);
        return [];
    }
    const tocJson = await loadJson("https://www.webnovel.com/apiajax/chapter/GetChapterList?bookId=" + bookId[2]);
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
                index: item.index,
                releaseDate: date
            };
        });
        return {
            episodes: chapters,
            title: name,
            index: volume.index,
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
scrapeNews.link = "https://www.webnovel.com/";
function getHook() {
    return {
        domainReg: /^https:\/\/(www\.)?webnovel\.com/,
        newsAdapter: scrapeNews,
        contentDownloadAdapter: scrapeContent,
        tocAdapter: scrapeToc
    };
}
exports.getHook = getHook;
//# sourceMappingURL=webnovelScraper.js.map