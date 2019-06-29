"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const url = tslib_1.__importStar(require("url"));
const queueManager_1 = require("../queueManager");
const logger_1 = tslib_1.__importDefault(require("../../logger"));
const tools_1 = require("../../tools");
async function scrapeNews() {
    // fixme mangadex has cloudflare protection and this request throws a 503 error
    const uri = "https://mangadex.org/";
    const $ = await queueManager_1.queueCheerioRequest(uri + "updates");
    const newsRows = $(".table tbody tr");
    const news = [];
    let currentMedium = "";
    for (let i = 0; i < newsRows.length; i++) {
        const newsRow = newsRows.eq(i);
        if (newsRow.has(".flag").length) {
            if (!currentMedium) {
                throw Error("episode without medium");
            }
            const children = newsRow.children("td");
            // ignore manga which are not english
            if (!children.eq(3).children(".flag-gb").length) {
                continue;
            }
            const titleElement = children.eq(1);
            const link = url.resolve(uri, titleElement.children("a").attr("href"));
            const title = `${currentMedium} - ${titleElement.text()}`;
            const timeStampElement = children.eq(6).children("time").first();
            const date = new Date(timeStampElement.attr("datetime"));
            news.push({
                title,
                link,
                date,
            });
        }
        else {
            currentMedium = newsRow.text().trim();
        }
    }
    return news;
}
async function scrapeToc(urlString) {
    const $ = await queueManager_1.queueCheerioRequest(urlString);
    const contentElement = $("#content");
    const mangaTitle = contentElement.find("h6.card-header").first().text();
    // const metaRows = contentElement.find(".col-xl-9.col-lg-8.col-md-7 > .row");
    // todo process these metadata and get more (like author)
    // const alternateMangaTitles = metaRows.eq(0).find("li");
    // const mangaStatus = metaRows.eq(8).find(".col-lg-9.col-xl-10").first();
    const chapters = contentElement.find(".chapter-container .chapter-row").first().children();
    if (!chapters.length) {
        logger_1.default.warn("toc link with no chapters: " + urlString);
        return [];
    }
    if (!mangaTitle) {
        logger_1.default.warn("toc link with no novel title: " + urlString);
        return [];
    }
    const uri = "https://mangadex.org/";
    const contents = [];
    const toc = {
        link: urlString,
        content: [],
        title: mangaTitle,
        mediumType: tools_1.MediaType.IMAGE,
    };
    const endReg = /^END$/i;
    const volChapReg = /^\s*Vol\.?\s*(\d+(\.\d+)?)\s*Ch\.?\s*(\d+(\.\d+)?)\s*(-\s*)?(.+)/i;
    const chapReg = /^\s*Ch\.?\s*(\d+(\.\d+)?)\s*(-\s*)?(.+)/i;
    let hasVolumes;
    for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters.eq(i);
        if (!chapter.has(".flag-gb").length) {
            continue;
        }
        const columns = chapter.children();
        const timeString = columns.eq(3).attr("title");
        const time = new Date(timeString);
        if (!timeString || Number.isNaN(time.getTime())) {
            logger_1.default.warn("no time in title in mangadex toc");
            return [];
        }
        const chapterTitleElement = columns.eq(1);
        const endBadgeElement = chapterTitleElement.find(".badge").first().remove();
        if (endBadgeElement.length && endReg.test(endBadgeElement.text())) {
            toc.end = true;
        }
        const chapterTitle = chapterTitleElement.text();
        const volChapGroups = volChapReg.exec(chapterTitle);
        const chapGroups = chapReg.exec(chapterTitle);
        if (i && !hasVolumes && volChapGroups && !chapGroups) {
            logger_1.default.warn("changed volume - chapter format on mangadex toc: expected chapter, got volume");
            return [];
        }
        if (i && hasVolumes && chapGroups && !volChapGroups) {
            logger_1.default.warn("changed volume - chapter format on mangadex toc: expected volume, got chapter");
            return [];
        }
        if (!i && volChapGroups) {
            hasVolumes = true;
        }
        if (volChapGroups) {
            const volIndex = Number(volChapGroups[1]);
            const chapIndex = Number(volChapGroups[2]);
            const title = volChapGroups[4];
            const link = url.resolve(uri, chapterTitleElement.find("a").first().attr("href"));
            let part = contents[volIndex];
            if (Number.isNaN(chapIndex)) {
                logger_1.default.warn("changed episode format on mangaDex toc: got no index");
                return [];
            }
            if (!part) {
                contents[volIndex] = part = {
                    episodes: [],
                    index: volIndex,
                    title: "Vol." + volIndex
                };
            }
            part.episodes.push({
                title,
                index: chapIndex,
                url: link,
                releaseDate: time
            });
        }
        else if (chapGroups) {
            const chapIndex = Number(chapGroups[1]);
            const title = chapGroups[3];
            const link = url.resolve(uri, chapterTitleElement.find("a").first().attr("href"));
            if (Number.isNaN(chapIndex)) {
                logger_1.default.warn("changed episode format on mangaDex toc: got no index");
                return [];
            }
            contents.push({
                title,
                index: chapIndex,
                url: link,
                releaseDate: time
            });
        }
        else {
            logger_1.default.warn("volume - chapter format changed on mangadex: recognized neither of them");
            return [];
        }
    }
    contents.forEach((value) => {
        if (value) {
            toc.content.push(value);
        }
    });
    return [toc];
}
scrapeNews.link = "https://mangadex.org/";
function getHook() {
    return {
        domainReg: /^mangadex\.org/,
        newsAdapter: scrapeNews,
        tocAdapter: scrapeToc
    };
}
exports.getHook = getHook;
//# sourceMappingURL=mangadexScraper.js.map