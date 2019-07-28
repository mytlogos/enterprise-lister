"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const url = tslib_1.__importStar(require("url"));
const queueManager_1 = require("../queueManager");
const logger_1 = tslib_1.__importDefault(require("../../logger"));
const tools_1 = require("../../tools");
const request = tslib_1.__importStar(require("request"));
const jar = request.jar();
jar.setCookie(`mangadex_filter_langs=1; expires=Sun, 16 Jul 2119 18:59:17 GMT; domain=mangadex.org;`, "https://mangadex.org/", { secure: false });
async function scrapeNews() {
    // TODO: 19.07.2019 set the cookie 'mangadex_filter_langs:"1"'
    //  with expiration date somewhere in 100 years to lessen load
    const uri = "https://mangadex.org/";
    const requestLink = uri + "updates";
    const $ = await queueManager_1.queueCheerioRequest(requestLink, { jar, uri: requestLink });
    const newsRows = $(".table tbody tr");
    const episodeNews = [];
    let currentMedium = "";
    let currentMediumLink = "";
    const titlePattern = /(vol\.\s*((\d+)(\.(\d+))?))?\s*ch\.\s*((\d+)(\.(\d+))?)(\s*-\s*(.+))?/i;
    for (let i = 0; i < newsRows.length; i++) {
        const newsRow = newsRows.eq(i);
        if (!newsRow.has(".flag").length) {
            const mediumLinkElement = newsRow.find("a.manga_title");
            currentMediumLink = url.resolve(uri, mediumLinkElement.attr("href"));
            currentMedium = tools_1.sanitizeString(mediumLinkElement.text());
            continue;
        }
        if (!currentMedium) {
            throw Error("episode without medium");
        }
        const children = newsRow.children("td");
        // ignore manga which are not english
        if (!children.eq(2).children(".flag-gb").length) {
            continue;
        }
        const titleElement = children.eq(1);
        const link = url.resolve(uri, titleElement.children("a").attr("href"));
        const title = tools_1.sanitizeString(titleElement.text());
        // ignore oneshots, they are not 'interesting' enough, e.g. too short
        if (title === "Oneshot") {
            continue;
        }
        const timeStampElement = children.eq(6).children("time").first();
        const date = new Date(timeStampElement.attr("datetime"));
        const groups = titlePattern.exec(title);
        if (!groups) {
            console.log(`Unknown News Format: '${title}' for '${currentMedium}'`);
            continue;
        }
        let episodeIndex;
        let episodeTotalIndex;
        let episodePartialIndex;
        let episodeTitle = "";
        if (groups[11]) {
            episodeTitle = tools_1.sanitizeString(groups[11]);
        }
        if (groups[6]) {
            episodeIndex = Number(groups[6]);
            episodeTotalIndex = Number(groups[7]);
            episodePartialIndex = Number(groups[9]) || undefined;
            if (episodeTitle) {
                episodeTitle = `Ch. ${episodeIndex} - ` + episodeTitle;
            }
            else {
                episodeTitle = `Ch. ${episodeIndex}`;
            }
        }
        else {
            logger_1.default.info(`unknown new format on mangadex: ${title}`);
            continue;
        }
        let partIndex;
        let partTotalIndex;
        let partPartialIndex;
        let partTitle;
        if (groups[2]) {
            partIndex = Number(groups[2]);
            partTitle = `Vol. ${partIndex}`;
            partTotalIndex = Number(groups[3]);
            partPartialIndex = Number(groups[5]) || undefined;
        }
        episodeNews.push({
            mediumTitle: currentMedium,
            mediumTocLink: currentMediumLink,
            mediumType: tools_1.MediaType.IMAGE,
            episodeTitle: title,
            episodeIndex,
            episodeTotalIndex,
            episodePartialIndex,
            partIndex,
            partTotalIndex,
            partPartialIndex,
            link,
            date
        });
    }
    return { episodes: episodeNews };
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
    const indexPartMap = new Map();
    const toc = {
        link: urlString,
        content: [],
        title: mangaTitle,
        mediumType: tools_1.MediaType.IMAGE,
    };
    const endReg = /^END$/i;
    const volChapReg = /^\s*Vol\.?\s*((\d+)(\.(\d+))?)\s*Ch\.?\s*((\d+)(\.(\d+))?)\s*(-\s*)?(.+)/i;
    const chapReg = /^\s*Ch\.?\s*((\d+)(\.(\d+))?)\s*(-\s*)?(.+)/i;
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
            const volIndices = tools_1.extractIndices(volChapGroups, 1, 2, 4);
            if (!volIndices) {
                throw Error(`changed format on mangadex, got no indices for: '${chapterTitle}'`);
            }
            const chapIndices = tools_1.extractIndices(volChapGroups, 5, 6, 8);
            const link = url.resolve(uri, chapterTitleElement.find("a").first().attr("href"));
            let part = indexPartMap.get(volIndices.combi);
            if (!chapIndices) {
                logger_1.default.warn("changed episode format on mangadex toc: got no index");
                return [];
            }
            let title = "Chapter " + chapIndices.combi;
            if (volChapGroups[10]) {
                title += " - " + volChapGroups[10];
            }
            if (!part) {
                part = {
                    episodes: [],
                    combiIndex: volIndices.combi,
                    totalIndex: volIndices.total,
                    partialIndex: volIndices.fraction,
                    title: "Vol." + volIndices.combi
                };
                indexPartMap.set(volIndices.combi, part);
                contents.push(part);
            }
            part.episodes.push({
                title,
                combiIndex: chapIndices.combi,
                totalIndex: chapIndices.total,
                partialIndex: chapIndices.fraction,
                url: link,
                releaseDate: time
            });
        }
        else if (chapGroups) {
            const chapIndices = tools_1.extractIndices(chapGroups, 1, 2, 4);
            if (!chapIndices) {
                throw Error(`changed format on mangadex, got no indices for: '${chapterTitle}'`);
            }
            const link = url.resolve(uri, chapterTitleElement.find("a").first().attr("href"));
            const title = `Chapter ${chapIndices.combi} - ${chapGroups[6]}`;
            contents.push({
                title,
                combiIndex: chapIndices.combi,
                totalIndex: chapIndices.total,
                partialIndex: chapIndices.fraction,
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