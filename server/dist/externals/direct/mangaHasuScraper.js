"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const url = tslib_1.__importStar(require("url"));
const queueManager_1 = require("../queueManager");
const logger_1 = tslib_1.__importDefault(require("../../logger"));
const tools_1 = require("../../tools");
async function scrapeNews() {
    // todo scrape more than just the first page if there is an open end
    const baseUri = "http://mangahasu.se/";
    const $ = await queueManager_1.queueCheerioRequest(baseUri + "latest-releases.html");
    const newsRows = $("ul.list_manga  .info-manga");
    const news = [];
    const titlePattern = /(vol\s*((\d+)(\.(\d+))?))?\s*chapter\s*((\d+)(\.(\d+))?)(\s*:\s*(.+))?/i;
    for (let i = 0; i < newsRows.length; i++) {
        const newsRow = newsRows.eq(i);
        const children = newsRow.children("a");
        const mediumElement = children.eq(0);
        const titleElement = children.eq(1);
        const link = url.resolve(baseUri, titleElement.attr("href"));
        const mediumTocLink = url.resolve(baseUri, mediumElement.attr("href"));
        const mediumTitle = tools_1.sanitizeString(mediumElement.text());
        const title = tools_1.sanitizeString(titleElement.text());
        // ignore oneshots, they are not 'interesting' enough, e.g. too short
        if (title === "Oneshot") {
            continue;
        }
        const groups = titlePattern.exec(title);
        if (!groups) {
            console.log(`Unknown News Format: '${title}' for '${mediumTitle}'`);
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
            logger_1.default.info(`unknown news format on mangahasu: ${title}`);
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
        news.push({
            mediumTitle,
            mediumTocLink,
            mediumType: tools_1.MediaType.IMAGE,
            episodeTitle,
            episodeIndex,
            episodeTotalIndex,
            episodePartialIndex,
            partIndex,
            partTotalIndex,
            partPartialIndex,
            link,
            date: new Date()
        });
    }
    if (!news.length) {
        return {};
    }
    // if there is an open end, just pretend as if every 15 min one release happened
    for (let i = 0; i < news.length; i++) {
        const date = news[i].date;
        date.setMinutes(date.getMinutes() - i * 15);
    }
    return { episodes: news };
}
async function scrapeToc(urlString) {
    const $ = await queueManager_1.queueCheerioRequest(urlString);
    const contentElement = $(".wrapper_content");
    const mangaTitle = contentElement.find(".info-title h1").first().text().trim();
    // todo process metadata and get more (like author)
    const chapters = contentElement.find(".list-chapter tbody > tr");
    if (!chapters.length) {
        logger_1.default.warn("toc link with no chapters: " + urlString);
        return [];
    }
    if (!mangaTitle) {
        logger_1.default.warn("toc link with no novel title: " + urlString);
        return [];
    }
    const uri = "http://mangahasu.se/";
    const partContents = [];
    const chapterContents = [];
    const toc = {
        link: urlString,
        content: [],
        title: mangaTitle,
        mediumType: tools_1.MediaType.IMAGE
    };
    const endReg = /\[END]\s*$/i;
    const volChapReg = /Vol\.?\s*(\d+(\.\d+)?)\s*Chapter\s*(\d+(\.\d+)?)(:\s*(.+))?/i;
    const chapReg = /Chapter\s*(\d+(\.\d+)?)(:\s*(.+))?/i;
    let hasVolumes;
    for (let i = 0; i < chapters.length; i++) {
        const chapterElement = chapters.eq(i);
        const timeString = chapterElement.find(".date-updated").text().trim();
        const time = new Date(timeString);
        if (!timeString || Number.isNaN(time.getTime())) {
            logger_1.default.warn("no time in title in mangahasu toc");
            return [];
        }
        const chapterTitleElement = chapterElement.find(".name");
        if (endReg.test(chapterTitleElement.text())) {
            toc.end = true;
        }
        const chapterTitle = chapterTitleElement.text().trim();
        const volChapGroups = volChapReg.exec(chapterTitle);
        const chapGroups = chapReg.exec(chapterTitle);
        if (i && !hasVolumes && volChapGroups && !chapGroups) {
            logger_1.default.warn("changed volume - chapter format on mangahasu toc: expected chapter, got volume");
        }
        if (i && hasVolumes && chapGroups && !volChapGroups) {
            logger_1.default.warn("changed volume - chapter format on mangahasu toc: expected volume, got chapter");
        }
        if (!i && volChapGroups) {
            hasVolumes = true;
        }
        if (volChapGroups) {
            const volIndex = Number(volChapGroups[1]);
            const chapIndex = Number(volChapGroups[3]);
            const title = volChapGroups[4] || "Chapter " + chapIndex;
            const link = url.resolve(uri, chapterTitleElement.find("a").first().attr("href"));
            let part = partContents[volIndex];
            if (Number.isNaN(chapIndex)) {
                logger_1.default.warn("changed episode format on mangaHasu toc: got no index");
                return [];
            }
            if (!part) {
                partContents[volIndex] = part = {
                    episodes: [],
                    totalIndex: volIndex,
                    title: "Vol." + volIndex
                };
            }
            part.episodes.push({
                title,
                totalIndex: chapIndex,
                url: link,
                releaseDate: time
            });
        }
        else if (chapGroups) {
            const chapIndex = Number(chapGroups[1]);
            const title = chapGroups[4] || "Chapter " + chapIndex;
            const link = url.resolve(uri, chapterTitleElement.find("a").first().attr("href"));
            if (Number.isNaN(chapIndex)) {
                logger_1.default.warn("changed episode format on mangaHasu toc: got no index");
                return [];
            }
            chapterContents.push({
                title,
                totalIndex: chapIndex,
                url: link,
                releaseDate: time
            });
        }
        else {
            logger_1.default.warn("volume - chapter format changed on mangahasu: recognized neither of them");
            return [];
        }
    }
    partContents.forEach((value) => {
        if (value) {
            toc.content.push(value);
        }
    });
    toc.content.push(...chapterContents);
    return [toc];
}
scrapeNews.link = "http://mangahasu.se/";
function getHook() {
    return {
        domainReg: /^mangahasu\.se/,
        newsAdapter: scrapeNews,
        tocAdapter: scrapeToc
    };
}
exports.getHook = getHook;
//# sourceMappingURL=mangaHasuScraper.js.map