"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const logger_1 = tslib_1.__importStar(require("../../logger"));
const queueManager_1 = require("../queueManager");
const database_1 = require("../../database/database");
const tools_1 = require("../../tools");
exports.sourceType = "qidian_underground";
async function scrapeNews() {
    const uri = "https://toc.qidianunderground.org/";
    const $ = await queueManager_1.queueCheerioRequest(uri);
    const tocRows = $(".content p + ul");
    const chapterReg = /(\d+)(\s*-\s*(\d+))?/;
    const potentialMediaNews = [];
    const now = new Date();
    for (let tocRowIndex = 0; tocRowIndex < tocRows.length; tocRowIndex++) {
        const tocRow = tocRows.eq(tocRowIndex);
        const mediumElement = tocRow.prev();
        const mediumTitle = tools_1.sanitizeString(mediumElement.contents().first().text().trim());
        if (!mediumTitle) {
            logger_1.default.warn("changed format on qidianUnderground");
            return;
        }
        const timeStampElement = mediumElement.find(".timeago").first();
        const date = new Date(timeStampElement.attr("title"));
        if (date > now) {
            // due to summer time the zone of germany is utc+2,
            // but normally qidianUnderground thinks we have utc+1, also winter time all around?
            date.setHours(date.getHours() - 1);
            if (date > now) {
                logger_1.default.warn("changed time format on qidianUnderground");
                continue;
            }
        }
        const children = tocRow.find("a");
        const potentialNews = [];
        for (let j = 0; j < children.length; j++) {
            const titleElement = children.length > 1 ? children.eq(j) : children;
            const link = titleElement.attr("href");
            if (!link) {
                logger_1.default.warn(`missing href attribute for '${mediumTitle}' on qidianUnderground`);
                continue;
            }
            const exec = chapterReg.exec(tools_1.sanitizeString(titleElement.text()));
            if (!exec) {
                logger_1.default.warn("changed format on qidianUnderground");
                continue;
            }
            const startChapterIndex = Number(exec[1]);
            const endChapterIndex = Number(exec[3]);
            if (!Number.isNaN(endChapterIndex)) {
                for (let chapterIndex = startChapterIndex; chapterIndex <= endChapterIndex; chapterIndex++) {
                    const title = tools_1.sanitizeString(`${mediumTitle} - ${chapterIndex}`);
                    potentialNews.push({ title, link, date });
                }
            }
            else {
                const title = tools_1.sanitizeString(`${mediumTitle} - ${startChapterIndex}`);
                potentialNews.push({ title, link, date });
            }
        }
        if (potentialNews.length) {
            potentialMediaNews.push(processMediumNews(mediumTitle, potentialNews));
        }
    }
    await Promise.all(potentialMediaNews);
}
// TODO: 25.06.2019 use caching for likeMedium?
async function processMediumNews(mediumTitle, potentialNews) {
    const likeMedia = await database_1.Storage.getLikeMedium({
        title: mediumTitle,
        link: "",
        type: tools_1.MediaType.TEXT
    });
    if (!likeMedia || Array.isArray(likeMedia) || !likeMedia.medium || !likeMedia.medium.id) {
        return;
    }
    const mediumId = likeMedia.medium.id;
    const latestReleases = await database_1.Storage.getLatestReleases(mediumId);
    const latestRelease = tools_1.max(latestReleases, (previous, current) => {
        const maxPreviousRelease = tools_1.max(previous.releases, "releaseDate");
        const maxCurrentRelease = tools_1.max(current.releases, "releaseDate");
        return ((maxPreviousRelease && maxPreviousRelease.releaseDate.getTime()) || 0)
            - ((maxCurrentRelease && maxCurrentRelease.releaseDate.getTime()) || 0);
    });
    const chapIndexReg = /(\d+)\s*$/;
    let standardPart = await database_1.Storage.getStandardPart(mediumId);
    if (!standardPart) {
        standardPart = await database_1.Storage.createStandardPart(mediumId);
    }
    let news;
    if (latestRelease) {
        const oldReleases = [];
        news = potentialNews.filter((value) => {
            const exec = chapIndexReg.exec(value.title);
            if (!exec) {
                logger_1.default.warn("news title does not end chapter index on qidianUnderground");
                return;
            }
            if (Number(exec[1]) > latestRelease.totalIndex) {
                return true;
            }
            else {
                oldReleases.push(value);
                return false;
            }
        });
        const sourcedReleases = await database_1.Storage.getSourcedReleases(exports.sourceType, mediumId);
        const toUpdateReleases = oldReleases.map((value) => {
            return {
                title: value.title,
                url: value.link,
                releaseDate: value.date,
                sourceType: exports.sourceType,
                episodeId: 0,
            };
        }).filter((value) => {
            const foundRelease = sourcedReleases.find((release) => release.title === value.title);
            if (!foundRelease) {
                logger_1.default.warn("wanted to update an unavailable release");
                return false;
            }
            return foundRelease.url !== value.url;
        });
        if (toUpdateReleases.length) {
            database_1.Storage.updateRelease(toUpdateReleases).catch(logger_1.logError);
        }
    }
    else {
        news = potentialNews;
    }
    const newEpisodes = news.map((value) => {
        const exec = chapIndexReg.exec(value.title);
        if (!exec) {
            throw Error(`'${value.title}' does not end with chapter number`);
        }
        const totalIndex = Number(exec[1]);
        return {
            totalIndex,
            releases: [
                {
                    episodeId: 0,
                    sourceType: exports.sourceType,
                    releaseDate: value.date,
                    url: value.link,
                    title: value.title
                }
            ],
            id: 0,
            // @ts-ignore
            partId: standardPart.id
        };
    });
    if (newEpisodes.length) {
        await database_1.Storage.addEpisode(newEpisodes);
    }
}
async function scrapeContent(urlString) {
    const $ = await queueManager_1.queueCheerioRequest(urlString);
    const contents = $(".center-block .well");
    const episodes = [];
    for (let i = 0; i < contents.length; i++) {
        const contentElement = contents.eq(i);
        const contentChildren = contentElement.children();
        const episodeTitle = tools_1.sanitizeString(contentChildren.find("h2").first().remove().text().trim());
        const content = contentChildren.html();
        if (!episodeTitle) {
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
        const episodeContent = {
            content: [content],
            episodeTitle,
            // the pages themselves dont have any novel titles
            mediumTitle: "",
            index
        };
        episodes.push(episodeContent);
    }
    return episodes;
}
scrapeNews.link = "https://toc.qidianunderground.org/";
function getHook() {
    return {
        name: "qidianunderground",
        domainReg: /^https:\/\/toc\.qidianunderground\.org/,
        newsAdapter: scrapeNews,
        contentDownloadAdapter: scrapeContent
    };
}
exports.getHook = getHook;
//# sourceMappingURL=undergroundScraper.js.map