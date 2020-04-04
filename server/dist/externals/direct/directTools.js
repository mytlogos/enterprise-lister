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
function isEpisodePiece(value) {
    return value.releaseDate || value.locked;
}
function isPartPiece(value) {
    return value.episodes;
}
function isInternalEpisode(value) {
    return value.releaseDate || value.locked;
}
function isInternalPart(value) {
    return value.episodes;
}
function externalizeTocEpisode(value) {
    return {
        title: value.title,
        combiIndex: value.combiIndex,
        partialIndex: value.partialIndex,
        totalIndex: value.totalIndex,
        url: value.url,
        locked: value.locked || false,
        releaseDate: value.releaseDate
    };
}
function externalizeTocPart(internalTocPart) {
    return {
        title: internalTocPart.title,
        combiIndex: internalTocPart.combiIndex,
        partialIndex: internalTocPart.partialIndex,
        totalIndex: internalTocPart.totalIndex,
        episodes: internalTocPart.episodes.map(externalizeTocEpisode)
    };
}
async function scrapeToc(pageGenerator) {
    const volRegex = ["volume", "book", "season"];
    const episodeRegex = ["episode", "chapter", "\\d+", "word \\d+"];
    const maybeEpisode = ["ova"];
    const optionalEpisode = ["xxx special chapter", "other tales", "interlude", "bonus", "SKILL SUMMARY", "CHARACTER INTRODUCTION", "side story", "ss", "intermission", "extra", "omake",];
    const partEpisode = ["part", "3/5"];
    const invalidEpisode = ["delete", "spam"];
    const start = ["prologue", "prolog"];
    const end = ["Epilogue", "finale"];
    const hasParts = false;
    let currentTotalIndex;
    const contents = [];
    const volumeRegex = /^(.*)(v[olume]{0,5}[\s.]*((\d+)(\.(\d+))?)[-:\s]*)(.*)$/i;
    const chapterRegex = /(^|\W)[\s-]*(c[hapter]{0,6}|(ep[isode]{0,5})|(word))?[\s.]*((\d+)(\.(\d+))?)[-:\s]*(.*)/i;
    const partRegex = /([^a-zA-Z]P[art]{0,3}[.\s]*(\d+))|([\[(]?(\d+)[/|](\d+)[)\]]?)/;
    const trimTitle = /^([-:\s]+)?(.+?)([-:\s]+)?$/i;
    const volumeMap = new Map();
    // normalWay(pageGenerator, volumeRegex, volumeMap, contents, chapterRegex, trimTitle, partRegex);
    for await (const tocPiece of pageGenerator) {
        const tocContent = mark(tocPiece, volumeMap);
        if (tocContent) {
            contents.push(tocContent);
        }
    }
    return contents.map((value) => {
        if (isInternalEpisode(value)) {
            return externalizeTocEpisode(value);
        }
        else if (isInternalPart(value)) {
            return externalizeTocPart(value);
        }
        else {
            throw TypeError();
        }
    });
}
exports.scrapeToc = scrapeToc;
function markWithRegex(regExp, title, type, matches) {
    if (!regExp.flags.includes("g")) {
        throw Error("Need a Regex with global Flag enabled, else it will crash");
    }
    for (let match = regExp.exec(title); match; match = regExp.exec(title)) {
        matches.push({ match, from: match.index, to: match.index + match[0].length, type });
    }
}
function mark(tocPiece, volumeMap) {
    const volumeRegex = /v[olume]{0,5}[\s.]*(((\d+)(\.(\d+))?)|\W*(delete|spam))/ig;
    const separatorRegex = /[-:]/g;
    const chapterRegex = /(^|(c[hapter]{0,6}|(ep[isode]{0,5})|(word)))[\s.]*(((\d+)(\.(\d+))?)|\W*(delete|spam))/ig;
    const partRegex = /(P[art]{0,3}[.\s]*(\d+))|([\[(]?(\d+)[/|](\d+)[)\]]?)/g;
    const trimRegex = /^[\s:-]+|[\s:-]+$/g;
    const matches = [];
    markWithRegex(volumeRegex, tocPiece.title, "volume", matches);
    // markWithRegex(separatorRegex, tocPiece.title, "separator", matches);
    markWithRegex(chapterRegex, tocPiece.title, "episode", matches);
    markWithRegex(partRegex, tocPiece.title, "part", matches);
    matches.sort((a, b) => a.from - b.from);
    let possibleEpisode;
    let possibleVolume;
    let newVolume = false;
    const usedMatches = [];
    for (const match of matches) {
        if (!possibleEpisode && match.type === "episode") {
            if (match.match[10]) {
                // it matches the pattern for an invalid episode
                return undefined;
            }
            const indices = tools_1.extractIndices(match.match, 6, 7, 9);
            if (!indices) {
                continue;
            }
            if (!isEpisodePiece(tocPiece)) {
                continue;
            }
            usedMatches.push(match);
            possibleEpisode = {
                combiIndex: indices.combi,
                totalIndex: indices.total,
                partialIndex: indices.fraction,
                url: tocPiece.url,
                releaseDate: tocPiece.releaseDate || new Date(),
                title: "",
                originalTitle: tocPiece.title
            };
        }
        else if (possibleEpisode && match.type === "part") {
            const wrappingMatch = usedMatches.find((value) => value.from <= match.from && value.to >= match.to);
            // there exists a match which wraps the current one, so skip this one
            if (wrappingMatch) {
                continue;
            }
            const part = Number.parseInt(match.match[2] || match.match[4], 10);
            if (Number.isInteger(part)) {
                // noinspection JSUnusedAssignment
                if (possibleEpisode.partialIndex == null) {
                    // noinspection JSUnusedAssignment
                    possibleEpisode.partialIndex = part;
                    possibleEpisode.combiIndex = tools_1.combiIndex(possibleEpisode);
                    usedMatches.push(match);
                }
                else {
                    logger_1.default.warn("Episode Part defined with existing EpisodePartialIndex");
                }
            }
        }
        else if (!possibleVolume && match.type === "volume") {
            if (match.match[6]) {
                // it matches the pattern for an invalid episode
                return undefined;
            }
            const volIndices = tools_1.extractIndices(match.match, 2, 3, 5);
            if (volIndices) {
                usedMatches.push(match);
                possibleVolume = volumeMap.get(volIndices.combi);
                if (!possibleVolume) {
                    possibleVolume = {
                        combiIndex: volIndices.combi,
                        totalIndex: volIndices.total,
                        partialIndex: volIndices.fraction,
                        title: "",
                        originalTitle: "",
                        episodes: []
                    };
                    newVolume = true;
                    volumeMap.set(volIndices.combi, possibleVolume);
                }
            }
            else {
                logger_1.default.warn("got a volume match but no indices");
            }
        }
    }
    let title = tocPiece.title;
    for (let i = 0; i < usedMatches.length; i++) {
        const usedMatch = usedMatches[i];
        const before = title.substring(0, usedMatch.from).replace(trimRegex, "");
        const after = title.substring(usedMatch.to).replace(trimRegex, "");
        const removedLength = title.length - (before.length + after.length);
        let contentTitle;
        if ((i + 1) < usedMatches.length) {
            contentTitle = title.substring(usedMatch.to, usedMatches[i + 1].from).replace(trimRegex, "");
        }
        else {
            contentTitle = after;
        }
        if (usedMatch.type === "volume" && possibleVolume) {
            possibleVolume.title = contentTitle;
        }
        else if (usedMatch.type === "episode" && possibleEpisode) {
            possibleEpisode.title = contentTitle;
        }
        for (let j = i + 1; j < usedMatches.length; j++) {
            const followingUsedMatch = usedMatches[j];
            followingUsedMatch.from -= removedLength;
            followingUsedMatch.to -= removedLength;
        }
        title = before + after;
    }
    if (possibleVolume) {
        if (possibleEpisode) {
            possibleVolume.episodes.push(possibleEpisode);
        }
        return newVolume ? possibleVolume : undefined;
    }
    else {
        return possibleEpisode;
    }
}
//# sourceMappingURL=directTools.js.map