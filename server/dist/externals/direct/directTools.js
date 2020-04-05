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
function isTocMetaPiece(value) {
    return Number.isInteger(value.mediumType);
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
    const maybeEpisode = ["ova"];
    const optionalEpisode = ["xxx special chapter", "other tales", "interlude", "bonus", "SKILL SUMMARY", "CHARACTER INTRODUCTION", "side story", "ss", "intermission", "extra", "omake",];
    const start = ["prologue", "prolog"];
    const end = ["Epilogue", "finale"];
    const contents = [];
    const scrapeState = {
        unusedPieces: [],
        ascendingCount: 0,
        descendingCount: 0,
        hasParts: false,
        volumeRegex: /(v[olume]{0,5}|s[eason]{0,5}|b[ok]{0,3})[\s.]*(((\d+)(\.(\d+))?)|\W*(delete|spam))/ig,
        separatorRegex: /[-:]/g,
        chapterRegex: /(^|(c[hapter]{0,6}|(ep[isode]{0,5})|(word)))[\s.]*(((\d+)(\.(\d+))?)|\W*(delete|spam))/ig,
        partRegex: /(P[art]{0,3}[.\s]*(\d+))|([\[(]?(\d+)[/|](\d+)[)\]]?)/g,
        trimRegex: /^[\s:–-]+|[\s:–-]+$/g,
        endRegex: /end/g,
        startRegex: /start/g,
        order: "unknown",
        volumeMap: new Map()
    };
    for await (const tocPiece of pageGenerator) {
        if (isTocMetaPiece(tocPiece)) {
            scrapeState.tocMeta = {
                artists: tocPiece.artists,
                authors: tocPiece.authors,
                content: [],
                end: tocPiece.end,
                langCOO: tocPiece.langCOO,
                langTL: tocPiece.langTL,
                link: tocPiece.link,
                mediumType: tocPiece.mediumType,
                statusCOO: tocPiece.statusCOO,
                statusTl: tocPiece.statusTl,
                synonyms: tocPiece.synonyms,
                title: tocPiece.title
            };
            continue;
        }
        const tocContent = mark(tocPiece, scrapeState);
        contents.push(...tocContent);
    }
    adjustTocContents(contents, scrapeState);
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
        matches.push({ match, from: match.index, to: match.index + match[0].length, ignore: false, remove: true, type });
    }
}
function adjustPartialIndices(contentIndex, contents, ascending) {
    const content = contents[contentIndex];
    const partialLimit = content.partCount;
    if (partialLimit) {
        const totalIndex = content.totalIndex;
        const currentPartialIndex = content.partialIndex;
        if (currentPartialIndex == null) {
            logger_1.default.warn("partialLimit but no partialIndex for: " + tools_1.stringify(content));
        }
        else {
            for (let j = contentIndex + 1; j < contents.length; j++) {
                const next = contents[j];
                if (!isInternalEpisode(next) || !next.match) {
                    continue;
                }
                if (next.totalIndex !== totalIndex) {
                    break;
                }
                const nextPartialIndex = currentPartialIndex + (ascending ? 1 : -1);
                if (nextPartialIndex < 1 || nextPartialIndex > partialLimit) {
                    break;
                }
                if (next.partialIndex != null && next.partialIndex !== nextPartialIndex) {
                    logger_1.default.warn(`trying to overwrite partialIndex on existing one with ${nextPartialIndex}: ${tools_1.stringify(content)}`);
                }
                else {
                    next.partialIndex = nextPartialIndex;
                    next.combiIndex = tools_1.combiIndex(next);
                }
            }
            for (let j = contentIndex - 1; j >= 0; j--) {
                const previous = contents[j];
                if (!isInternalEpisode(previous) || !previous.match) {
                    continue;
                }
                if (previous.totalIndex !== totalIndex) {
                    break;
                }
                const nextPartialIndex = currentPartialIndex + (ascending ? -1 : 1);
                if (nextPartialIndex < 1 || nextPartialIndex > partialLimit) {
                    break;
                }
                if (previous.partialIndex != null && previous.partialIndex !== nextPartialIndex) {
                    logger_1.default.warn("trying to overwrite partialIndex on existing one: " + tools_1.stringify(content));
                }
                else {
                    previous.partialIndex = nextPartialIndex;
                    previous.combiIndex = tools_1.combiIndex(previous);
                }
            }
        }
    }
}
function getConvertToTocEpisode(ascending, totalIndex, partialIndex) {
    return (value, index, array) => {
        if (!ascending) {
            index = array.length - 1 - index;
        }
        const episode = {
            combiIndex: 0,
            totalIndex,
            partialIndex: partialIndex + index,
            title: value.title,
            url: value.url,
            match: null,
            locked: false,
            releaseDate: value.releaseDate,
            originalTitle: value.title
        };
        episode.combiIndex = tools_1.combiIndex(episode);
        return episode;
    };
}
function adjustTocContents(contents, state) {
    const ascending = state.ascendingCount > state.descendingCount;
    if (state.ascendingCount > state.descendingCount) {
        state.order = "asc";
    }
    else {
        state.order = "desc";
    }
    const unusedEpisodePieces = state.unusedPieces.filter(isEpisodePiece);
    let endingsFilter;
    if (state.tocMeta && state.tocMeta.end) {
        let endFilter;
        let insertFunction;
        let latest = tools_1.max(contents, "combiIndex");
        if (latest && isInternalPart(latest)) {
            latest = tools_1.max(latest.episodes, "combiIndex");
        }
        const sidePartialIndex = latest ? (latest.partialIndex || 0) + 1 : 1;
        if (ascending) {
            endingsFilter = (value) => !value.after;
            endFilter = (value) => !value.before;
            insertFunction = contents.push;
        }
        else {
            endingsFilter = (value) => !value.before;
            endFilter = (value) => !value.after;
            insertFunction = contents.unshift;
        }
        const endSideEpisodes = unusedEpisodePieces
            .filter(endFilter)
            .map(getConvertToTocEpisode(ascending, latest ? latest.totalIndex : 0, sidePartialIndex));
        insertFunction.apply(contents, endSideEpisodes);
    }
    else {
        endingsFilter = (value) => !value.before || !value.after;
    }
    let earliest = tools_1.min(contents, "combiIndex");
    if (earliest && isInternalPart(earliest)) {
        earliest = tools_1.min(earliest.episodes, "combiIndex");
    }
    const startSidePartialIndex = earliest && earliest.totalIndex === 0 ? (earliest.partialIndex || 0) + 1 : 1;
    const startSideEpisodes = unusedEpisodePieces
        .filter(endingsFilter)
        .map(getConvertToTocEpisode(ascending, 0, startSidePartialIndex));
    if (ascending) {
        contents.unshift(...startSideEpisodes);
    }
    else {
        contents.push(...startSideEpisodes);
    }
    for (let i = 0; i < contents.length; i++) {
        const content = contents[i];
        if (isInternalEpisode(content)) {
            adjustPartialIndices(i, contents, ascending);
        }
        else if (isInternalPart(content)) {
            for (let j = 0; j < content.episodes.length; j++) {
                adjustPartialIndices(j, content.episodes, ascending);
            }
        }
    }
}
function mark(tocPiece, state) {
    const volumeRegex = state.volumeRegex;
    const chapterRegex = state.chapterRegex;
    const partRegex = state.partRegex;
    const trimRegex = state.trimRegex;
    let title = tocPiece.title;
    if (state.tocMeta) {
        const index = title.indexOf(state.tocMeta.title);
        if (index >= 0) {
            const before = title.substring(0, index).replace(trimRegex, "");
            const after = title.substring(index + state.tocMeta.title.length).replace(trimRegex, "");
            title = before + after;
        }
    }
    const matches = [];
    markWithRegex(volumeRegex, title, "volume", matches);
    // markWithRegex(separatorRegex, title, "separator", matches);
    markWithRegex(chapterRegex, title, "episode", matches);
    markWithRegex(partRegex, title, "part", matches);
    matches.sort((a, b) => a.from - b.from);
    let possibleEpisode;
    let possibleVolume;
    let newVolume = false;
    const usedMatches = [];
    for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        if (match.type === "episode") {
            if (match.match[10]) {
                // it matches the pattern for an invalid episode
                return [];
            }
            const indices = tools_1.extractIndices(match.match, 6, 7, 9);
            if (!indices) {
                continue;
            }
            if (!isEpisodePiece(tocPiece)) {
                continue;
            }
            if (possibleEpisode) {
                let hasDirectVolume = false;
                for (let j = i - 1; j >= 0; j--) {
                    const type = matches[j].type;
                    if (type === "episode" || type === "part") {
                        break;
                    }
                    if (type === "volume") {
                        hasDirectVolume = true;
                        break;
                    }
                }
                if (hasDirectVolume) {
                    possibleEpisode.relativeIndices = {
                        combiIndex: indices.combi,
                        partialIndex: indices.fraction,
                        totalIndex: indices.total
                    };
                }
                match.ignore = true;
                usedMatches.push(match);
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
                originalTitle: tocPiece.title,
                match
            };
        }
        else if (possibleEpisode && match.type === "part") {
            const wrappingMatch = usedMatches.find((value) => value.from <= match.from && value.to >= match.to);
            // there exists a match which wraps the current one, so skip this one
            if (wrappingMatch) {
                continue;
            }
            let refersToCurrentEpisode = true;
            for (let j = i; j >= 0; j--) {
                const previousMatch = matches[j];
                if (previousMatch.type === "episode") {
                    // noinspection JSUnusedAssignment
                    refersToCurrentEpisode = previousMatch === possibleEpisode.match;
                    break;
                }
            }
            if (!refersToCurrentEpisode) {
                match.ignore = true;
                usedMatches.push(match);
                continue;
            }
            const part = Number.parseInt(match.match[2] || match.match[4], 10);
            if (Number.isInteger(part)) {
                // noinspection JSUnusedAssignment
                if (possibleEpisode.partialIndex == null) {
                    if (match.match[5]) {
                        // noinspection JSUnusedAssignment
                        possibleEpisode.partCount = Number.parseInt(match.match[5], 10);
                    }
                    // noinspection JSUnusedAssignment
                    possibleEpisode.partialIndex = part;
                    // noinspection JSUnusedAssignment
                    possibleEpisode.combiIndex = tools_1.combiIndex(possibleEpisode);
                    usedMatches.push(match);
                }
                else {
                    logger_1.default.warn("Episode Part defined with existing EpisodePartialIndex");
                }
            }
        }
        else if (!possibleVolume && match.type === "volume") {
            if (match.match[7]) {
                // it matches the pattern for an invalid episode
                return [];
            }
            const volIndices = tools_1.extractIndices(match.match, 3, 4, 6);
            if (volIndices) {
                state.hasParts = true;
                usedMatches.push(match);
                possibleVolume = state.volumeMap.get(volIndices.combi);
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
                    state.volumeMap.set(volIndices.combi, possibleVolume);
                }
            }
            else {
                logger_1.default.warn("got a volume match but no indices");
            }
        }
    }
    for (let i = 0; i < usedMatches.length; i++) {
        const usedMatch = usedMatches[i];
        if (!usedMatch.remove) {
            continue;
        }
        const before = title.substring(0, usedMatch.from).replace(trimRegex, "");
        const after = title.substring(usedMatch.to).replace(trimRegex, "");
        const removedLength = title.length - (before.length + after.length);
        if (!usedMatch.ignore) {
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
        }
        for (let j = i + 1; j < usedMatches.length; j++) {
            const followingUsedMatch = usedMatches[j];
            followingUsedMatch.from -= removedLength;
            followingUsedMatch.to -= removedLength;
        }
        title = before + after;
    }
    if (possibleEpisode && !possibleEpisode.title && title) {
        possibleEpisode.title = title.replace(trimRegex, "");
    }
    const result = [];
    if (possibleEpisode) {
        if (state.lastCombiIndex != null) {
            if (state.lastCombiIndex < possibleEpisode.combiIndex) {
                state.ascendingCount++;
            }
            else if (state.lastCombiIndex > possibleEpisode.combiIndex) {
                state.descendingCount++;
            }
        }
        state.lastCombiIndex = possibleEpisode.combiIndex;
        for (const unusedPiece of state.unusedPieces) {
            if (!unusedPiece.before) {
                unusedPiece.before = possibleEpisode;
            }
        }
    }
    else {
        state.unusedPieces.push({ ...tocPiece, after: state.lastExtracted });
    }
    state.lastExtracted = possibleEpisode || possibleVolume || state.lastExtracted;
    if (possibleVolume) {
        if (possibleEpisode) {
            possibleVolume.episodes.push(possibleEpisode);
        }
        if (newVolume) {
            result.push(possibleVolume);
        }
    }
    else if (possibleEpisode) {
        result.push(possibleEpisode);
    }
    return result;
}
//# sourceMappingURL=directTools.js.map