"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const logger_1 = tslib_1.__importDefault(require("../../logger"));
const queueManager_1 = require("../queueManager");
const tools_1 = require("../../tools");
const url = tslib_1.__importStar(require("url"));
function getTextContent(novelTitle, episodeTitle, urlString, content) {
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
    if (index == null || Number.isNaN(index)) {
        index = undefined;
    }
    const episodeContent = {
        content: [content],
        episodeTitle,
        mediumTitle: novelTitle,
        index
    };
    return [episodeContent];
}
exports.getTextContent = getTextContent;
async function searchTocCheerio(medium, tocScraper, uri, searchLink, linkSelector) {
    logger_1.default.info(`searching for ${medium.title} on ${uri}`);
    const words = medium.title.split(/\s+/).filter((value) => value);
    let tocLink = "";
    let searchWords = "";
    for (let word of words) {
        word = encodeURIComponent(word);
        if (!word) {
            continue;
        }
        searchWords = searchWords ? searchWords + "+" + word : word;
        if (searchWords.length < 4) {
            continue;
        }
        const $ = await queueManager_1.queueCheerioRequest(searchLink(searchWords));
        const links = $(linkSelector);
        if (!links.length) {
            break;
        }
        for (let i = 0; i < links.length; i++) {
            const linkElement = links.eq(i);
            const text = tools_1.sanitizeString(linkElement.text());
            if (tools_1.equalsIgnore(text, medium.title) || medium.synonyms.some((s) => tools_1.equalsIgnore(text, s))) {
                tocLink = linkElement.attr("href");
                tocLink = url.resolve(uri, tocLink);
                break;
            }
        }
        if (tocLink) {
            break;
        }
    }
    if (tocLink) {
        const tocs = await tocScraper(tocLink);
        if (tocs && tocs.length) {
            return tocs[0];
        }
        else {
            logger_1.default.warn("a possible toc link could not be scraped: " + tocLink);
        }
    }
    else {
        logger_1.default.info(`no toc link found on ${uri} for ${medium.mediumId}: '${medium.title}'`);
    }
    return;
}
exports.searchTocCheerio = searchTocCheerio;
function searchForWords(linkSelector, medium, uri, searchLink) {
    return async (word) => {
        const $ = await queueManager_1.queueCheerioRequest(searchLink(word));
        const links = $(linkSelector);
        if (!links.length) {
            return { done: true };
        }
        for (let i = 0; i < links.length; i++) {
            const linkElement = links.eq(i);
            const text = tools_1.sanitizeString(linkElement.text());
            if (tools_1.equalsIgnore(text, medium.title) || medium.synonyms.some((s) => tools_1.equalsIgnore(text, s))) {
                const tocLink = linkElement.attr("href");
                return { value: url.resolve(uri, tocLink), done: true };
            }
        }
        return { done: false };
    };
}
async function searchToc(medium, tocScraper, uri, searchLink) {
    logger_1.default.info(`searching for ${medium.title} on ${uri}`);
    const words = medium.title.split(/\s+/).filter((value) => value);
    let tocLink = "";
    let searchString = "";
    for (let word of words) {
        word = encodeURIComponent(word);
        if (!word) {
            continue;
        }
        searchString = searchString ? searchString + "+" + word : word;
        if (searchString.length < 4) {
            continue;
        }
        const result = await searchLink(searchString);
        if (result.value) {
            tocLink = url.resolve(uri, result.value);
        }
        if (result.done) {
            break;
        }
    }
    if (tocLink) {
        const tocs = await tocScraper(tocLink);
        if (tocs && tocs.length) {
            return tocs[0];
        }
        else {
            logger_1.default.warn("a possible toc link could not be scraped: " + tocLink);
        }
    }
    else {
        logger_1.default.info(`no toc link found on ${uri} for ${medium.mediumId}: '${medium.title}'`);
    }
    return;
}
exports.searchToc = searchToc;
//# sourceMappingURL=directTools.js.map