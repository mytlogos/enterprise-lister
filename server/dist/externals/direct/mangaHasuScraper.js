"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const url = tslib_1.__importStar(require("url"));
const queueManager_1 = require("../queueManager");
const logger_1 = tslib_1.__importDefault(require("../../logger"));
const tools_1 = require("../../tools");
const scraperTools_1 = require("../scraperTools");
const directTools_1 = require("./directTools");
const errors_1 = require("../errors");
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
            logger_1.default.warn(`Unknown News Format on mangahasu: '${title}' for '${mediumTitle}'`);
            continue;
        }
        let episodeIndices;
        let episodeTitle = "";
        if (groups[11]) {
            episodeTitle = tools_1.sanitizeString(groups[11]);
        }
        if (groups[6]) {
            episodeIndices = tools_1.extractIndices(groups, 6, 7, 9);
            if (!episodeIndices) {
                logger_1.default.warn("unknown news title format on mangahasu: " + episodeTitle);
                continue;
            }
            if (episodeTitle) {
                episodeTitle = `Ch. ${episodeIndices.combi} - ` + episodeTitle;
            }
            else {
                episodeTitle = `Ch. ${episodeIndices.combi}`;
            }
        }
        else {
            logger_1.default.info(`unknown news format on mangahasu: ${title}`);
            continue;
        }
        let partIndices;
        let partTitle;
        if (groups[2]) {
            partIndices = tools_1.extractIndices(groups, 2, 3, 5);
            if (!partIndices) {
                logger_1.default.warn("unknown news title format on mangahasu: " + episodeTitle);
                continue;
            }
            partTitle = `Vol. ${partIndices.combi}`;
        }
        news.push({
            mediumTitle,
            mediumTocLink,
            mediumType: tools_1.MediaType.IMAGE,
            episodeTitle,
            episodeIndex: episodeIndices.combi,
            episodeTotalIndex: episodeIndices.total,
            episodePartialIndex: episodeIndices.fraction,
            partIndex: partIndices ? partIndices.combi : undefined,
            partTotalIndex: partIndices ? partIndices.total : undefined,
            partPartialIndex: partIndices ? partIndices.fraction : undefined,
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
async function contentDownloadAdapter(chapterLink) {
    const $ = await queueManager_1.queueCheerioRequest(chapterLink);
    const mediumTitleElement = $(".breadcrumb li:nth-child(2) a");
    const titleElement = $(".breadcrumb span");
    const episodeTitle = tools_1.sanitizeString(titleElement.text());
    const mediumTitle = tools_1.sanitizeString(mediumTitleElement.text());
    if (!episodeTitle || !mediumTitle) {
        logger_1.default.warn(`chapter format changed on mangahasu, did not find any titles for content extraction: ${chapterLink}`);
        return [];
    }
    const chapReg = /Chapter\s*(\d+(\.\d+)?)(:\s*(.+))?/i;
    const exec = chapReg.exec(episodeTitle);
    if (!exec || !mediumTitle) {
        logger_1.default.warn(`chapter format changed on mangahasu, did not find any titles for content extraction: ${chapterLink}`);
        return [];
    }
    const index = Number(exec[1]);
    const images = $(".img img");
    const imageUrls = [];
    const imageUrlReg = /\.(jpg|png)$/;
    for (let i = 0; i < images.length; i++) {
        const imageElement = images.eq(i);
        const src = imageElement.attr("src");
        if (!src || !imageUrlReg.test(src)) {
            logger_1.default.warn("image link format changed on mangahasu: " + chapterLink);
            return [];
        }
        imageUrls.push(src);
    }
    const episodeContent = {
        content: imageUrls,
        episodeTitle,
        index,
        mediumTitle
    };
    return [episodeContent];
}
async function scrapeToc(urlString) {
    if (!/http:\/\/mangahasu\.se\/[^/]+\.html/.test(urlString)) {
        throw new errors_1.UrlError("not a toc link for MangaHasu: " + urlString, urlString);
    }
    const $ = await queueManager_1.queueCheerioRequest(urlString);
    const contentElement = $(".wrapper_content");
    const mangaTitle = tools_1.sanitizeString(contentElement.find(".info-title h1").first().text());
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
    const indexPartMap = new Map();
    const chapterContents = [];
    const toc = {
        link: urlString,
        content: [],
        title: mangaTitle,
        mediumType: tools_1.MediaType.IMAGE
    };
    const endReg = /\[END]\s*$/i;
    const volChapReg = /Vol\.?\s*((\d+)(\.(\d+))?)\s*Chapter\s*((\d+)(\.(\d+))?)(:\s*(.+))?/i;
    const chapReg = /Chapter\s*((\d+)(\.(\d+))?)(:\s*(.+))?/i;
    for (let i = 0; i < chapters.length; i++) {
        const chapterElement = chapters.eq(i);
        const timeString = chapterElement.find(".date-updated").text().trim();
        const time = new Date(timeString);
        if (!timeString || Number.isNaN(time.getTime())) {
            logger_1.default.warn("no time in title in mangahasu toc: " + urlString);
            return [];
        }
        const chapterTitleElement = chapterElement.find(".name");
        const chapterTitle = tools_1.sanitizeString(chapterTitleElement.text());
        if (endReg.test(chapterTitle)) {
            toc.end = true;
        }
        const volChapGroups = volChapReg.exec(chapterTitle);
        const chapGroups = chapReg.exec(chapterTitle);
        if (volChapGroups) {
            const volIndices = tools_1.extractIndices(volChapGroups, 1, 2, 4);
            if (!volIndices) {
                throw Error(`changed format on mangahasu, got no indices for: '${chapterTitle}'`);
            }
            const chapIndices = tools_1.extractIndices(volChapGroups, 5, 6, 8);
            const link = url.resolve(uri, chapterTitleElement.find("a").first().attr("href"));
            if (!chapIndices) {
                logger_1.default.warn("changed episode format on mangaHasu toc: got no index " + urlString);
                return [];
            }
            let title = "Chapter " + chapIndices.combi;
            if (volChapGroups[10]) {
                title += " - " + volChapGroups[10];
            }
            let part = indexPartMap.get(volIndices.combi);
            if (!part) {
                part = {
                    episodes: [],
                    combiIndex: volIndices.combi,
                    totalIndex: volIndices.total,
                    partialIndex: volIndices.fraction,
                    title: "Vol." + volIndices.combi
                };
                scraperTools_1.checkTocContent(part, true);
                indexPartMap.set(volIndices.combi, part);
                partContents.push(part);
            }
            const episodeContent = {
                title,
                combiIndex: chapIndices.combi,
                totalIndex: chapIndices.total,
                partialIndex: chapIndices.fraction,
                url: link,
                releaseDate: time
            };
            scraperTools_1.checkTocContent(episodeContent);
            part.episodes.push(episodeContent);
        }
        else if (chapGroups) {
            const chapIndices = tools_1.extractIndices(chapGroups, 1, 2, 4);
            if (!chapIndices) {
                throw Error(`changed format on mangahasu, got no indices for: '${chapterTitle}'`);
            }
            const link = url.resolve(uri, chapterTitleElement.find("a").first().attr("href"));
            let title = "Chapter " + chapIndices.combi;
            if (chapGroups[6]) {
                title += " - " + chapGroups[6];
            }
            chapterContents.push({
                title,
                combiIndex: chapIndices.combi,
                totalIndex: chapIndices.total,
                partialIndex: chapIndices.fraction,
                url: link,
                releaseDate: time
            });
        }
        else {
            logger_1.default.warn("volume - chapter format changed on mangahasu: recognized neither of them: "
                + chapterTitle + " on " + urlString);
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
async function tocSearchAdapter(searchMedium) {
    return directTools_1.searchToc(searchMedium, scrapeToc, "https://mangahasu.se/", (searchString) => scrapeSearch(searchString, searchMedium));
}
async function scrapeSearch(searchWords, medium) {
    const urlString = "http://mangahasu.se/search/autosearch";
    const body = "key=" + searchWords;
    // TODO: 26.08.2019 this does not work for any reason
    const $ = await queueManager_1.queueCheerioRequest(urlString, {
        url: urlString,
        headers: {
            "Host": "mangahasu.se",
            "Content-Type": "application/x-www-form-urlencoded"
        },
        method: "POST",
        body
    });
    const links = $("a.a-item");
    if (!links.length) {
        return { done: true };
    }
    for (let i = 0; i < links.length; i++) {
        const linkElement = links.eq(i);
        const titleElement = linkElement.find(".name");
        const text = tools_1.sanitizeString(titleElement.text());
        if (tools_1.equalsIgnore(text, medium.title) || medium.synonyms.some((s) => tools_1.equalsIgnore(text, s))) {
            const tocLink = linkElement.attr("href");
            return { value: tocLink, done: true };
        }
    }
    return { done: false };
}
async function search(searchWords) {
    const urlString = "http://mangahasu.se/search/autosearch";
    const body = "key=" + searchWords;
    // TODO: 26.08.2019 this does not work for any reason
    const $ = await queueManager_1.queueCheerioRequest(urlString, {
        url: urlString,
        headers: {
            "Host": "mangahasu.se",
            "Content-Type": "application/x-www-form-urlencoded"
        },
        method: "POST",
        body
    });
    const searchResults = [];
    const links = $("a.a-item");
    if (!links.length) {
        return searchResults;
    }
    for (let i = 0; i < links.length; i++) {
        const linkElement = links.eq(i);
        const titleElement = linkElement.find(".name");
        const authorElement = linkElement.find(".author");
        const coverElement = linkElement.find("img");
        const text = tools_1.sanitizeString(titleElement.text());
        const link = url.resolve("http://mangahasu.se/", linkElement.attr("href"));
        const author = tools_1.sanitizeString(authorElement.text());
        const coverLink = coverElement.attr("src");
        searchResults.push({ coverUrl: coverLink, author, link, title: text });
    }
    return searchResults;
}
scrapeNews.link = "http://mangahasu.se/";
tocSearchAdapter.link = "http://mangahasu.se/";
tocSearchAdapter.medium = tools_1.MediaType.IMAGE;
tocSearchAdapter.blindSearch = true;
search.medium = tools_1.MediaType.IMAGE;
function getHook() {
    return {
        name: "mangahasu",
        medium: tools_1.MediaType.IMAGE,
        domainReg: /^https?:\/\/mangahasu\.se/,
        newsAdapter: scrapeNews,
        contentDownloadAdapter,
        tocSearchAdapter,
        tocAdapter: scrapeToc,
        searchAdapter: search
    };
}
exports.getHook = getHook;
//# sourceMappingURL=mangaHasuScraper.js.map