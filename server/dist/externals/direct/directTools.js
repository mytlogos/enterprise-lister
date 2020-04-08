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
class TocLinkedList {
    constructor() {
        this.start = { type: "sentinel", next: { type: "dummy" } };
        this.end = { type: "sentinel", previous: { type: "dummy" } };
        this.listLength = 0;
        this.start.next = this.end;
        this.end.previous = this.start;
    }
    get length() {
        return this.listLength;
    }
    get asArray() {
        return [...this];
    }
    push(value) {
        this.remove(value);
        const oldPrevious = this.end.previous;
        oldPrevious.next = value;
        value.previous = oldPrevious;
        value.next = this.end;
        this.end.previous = value;
        this.listLength++;
    }
    unshift(value) {
        this.remove(value);
        const oldNext = this.start.next;
        oldNext.previous = value;
        value.next = oldNext;
        value.previous = this.start;
        this.start.next = value;
        this.listLength++;
    }
    insertAfter(value, after) {
        if (value === after) {
            throw Error("cannot insert itself after itself");
        }
        this.remove(value);
        const afterNext = after.next;
        after.next = value;
        value.previous = after;
        value.next = afterNext;
        afterNext.previous = value;
        this.listLength++;
    }
    insertBefore(value, before) {
        if (value === before) {
            throw Error("cannot insert itself after itself");
        }
        this.remove(value);
        const beforePrevious = before.previous;
        before.previous = value;
        value.next = before;
        value.previous = beforePrevious;
        beforePrevious.next = value;
        this.listLength++;
    }
    remove(value) {
        const next = value.next;
        const previous = value.previous;
        if (next && previous) {
            previous.next = next;
            next.previous = previous;
            this.listLength--;
        }
    }
    replace(oldValue, newValue) {
        const oldNext = oldValue.next;
        const oldPrevious = oldValue.previous;
        oldNext.previous = newValue;
        newValue.next = oldNext;
        oldPrevious.next = newValue;
        newValue.previous = oldPrevious;
    }
    map(mapFn, thisArg) {
        const resultList = [];
        const dummy = [];
        let currentIndex = 0;
        for (const node of this) {
            resultList.push(mapFn.call(thisArg, node, currentIndex, dummy));
            currentIndex++;
        }
        return resultList;
    }
    [Symbol.iterator]() {
        let node = this.start;
        return {
            next() {
                if (node && node.next) {
                    node = node.next;
                    if (node.next) {
                        return { value: node };
                    }
                    return { value: node, done: true };
                }
                return { value: {}, done: true };
            }
        };
    }
    iterate(forwards, from) {
        const nextKey = forwards ? "next" : "previous";
        const start = from || (forwards ? this.start : this.end);
        let node = start[nextKey];
        return {
            [Symbol.iterator]() {
                return {
                    next() {
                        if (node) {
                            const current = node;
                            node = node[nextKey];
                            if (node) {
                                return { value: current };
                            }
                            return { value: undefined, done: true };
                        }
                        // should never reach here
                        return { value: {}, done: true };
                    }
                };
            }
        };
    }
    backwards(from) {
        return this.iterate(false, from);
    }
    forwards(from) {
        return this.iterate(true, from);
    }
}
function isEpisodePiece(value) {
    return value.releaseDate || value.locked;
}
function isUnusedPiece(value) {
    return value.type === "unusedPiece";
}
function isPartPiece(value) {
    return value.episodes;
}
function isTocMetaPiece(value) {
    return Number.isInteger(value.mediumType);
}
function isInternalEpisode(value) {
    return value.type === "episode";
}
function isInternalPart(value) {
    return value.type === "part";
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
    const contents = new TocLinkedList();
    const scrapeState = {
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
        for (const node of tocContent) {
            contents.push(node);
        }
    }
    adjustTocContentsLinked(contents, scrapeState);
    let result = contents;
    if (scrapeState.hasParts) {
        result = [];
        for (const content of contents) {
            if (isInternalPart(content)) {
                result.push(content);
            }
        }
    }
    return result.map((value) => {
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
function convertToTocEpisode(totalIndex, partialIndex, index, value) {
    const episode = {
        type: "episode",
        combiIndex: 0,
        totalIndex,
        partialIndex: partialIndex + index,
        title: value.title,
        url: value.url,
        match: null,
        locked: false,
        releaseDate: value.releaseDate,
        originalTitle: value.title,
        part: value.part
    };
    episode.combiIndex = tools_1.combiIndex(episode);
    return episode;
}
function adjustPartialIndicesLinked(node, ascending, contents) {
    const partialLimit = node.partCount;
    let currentPartialIndex = node.partialIndex;
    const increment = ascending ? 1 : -1;
    for (const content of contents.iterate(ascending, node)) {
        // do not try to change partial indices over volume boundaries
        if (isInternalPart(content)) {
            break;
        }
        if (!isInternalEpisode(content) || !content.match) {
            continue;
        }
        if (content.totalIndex !== node.totalIndex) {
            break;
        }
        currentPartialIndex = currentPartialIndex + increment;
        if (currentPartialIndex < 1 || currentPartialIndex > partialLimit) {
            break;
        }
        if (content.partialIndex != null && content.partialIndex !== currentPartialIndex) {
            logger_1.default.warn(`trying to overwrite partialIndex on existing one with ${currentPartialIndex}: ${tools_1.stringify(content)}`);
        }
        else {
            content.partialIndex = currentPartialIndex;
            content.combiIndex = tools_1.combiIndex(content);
        }
    }
}
function adjustTocContentsLinked(contents, state) {
    const ascending = state.ascendingCount > state.descendingCount;
    if (state.ascendingCount > state.descendingCount) {
        state.order = "asc";
    }
    else {
        state.order = "desc";
    }
    if (!state.tocMeta || !state.tocMeta.end) {
        let possibleStartNode;
        let volumeEncountered = false;
        for (const content of contents.iterate(ascending)) {
            if (!isUnusedPiece(content)) {
                if (isInternalPart(content)) {
                    if (volumeEncountered) {
                        possibleStartNode = content;
                        break;
                    }
                    else {
                        volumeEncountered = true;
                    }
                }
                else {
                    possibleStartNode = content;
                    break;
                }
            }
        }
        if (possibleStartNode) {
            let startNode = possibleStartNode;
            const insert = ascending ? contents.insertBefore : contents.insertAfter;
            // iterate backwards against the current order
            for (const node of contents.iterate(!ascending)) {
                if (!isUnusedPiece(node)) {
                    break;
                }
                insert.call(contents, node, startNode);
                startNode = node;
            }
        }
    }
    let minPartialIndex;
    let startPiecesCount = 0;
    for (const content of contents.iterate(ascending)) {
        if (isUnusedPiece(content)) {
            startPiecesCount++;
        }
        if (isInternalEpisode(content)) {
            if (content.totalIndex === 0) {
                minPartialIndex = content.partialIndex;
            }
            break;
        }
    }
    let volumeEncountered = false;
    let index = 0;
    for (const content of contents.iterate(ascending)) {
        if (!isUnusedPiece(content)) {
            if (isInternalPart(content)) {
                if (volumeEncountered) {
                    break;
                }
                else {
                    volumeEncountered = true;
                    continue;
                }
            }
            else {
                break;
            }
        }
        const tocEpisode = convertToTocEpisode(0, minPartialIndex ? minPartialIndex + 1 : 1, index, content);
        contents.replace(content, tocEpisode);
        index++;
    }
    let lastSeenEpisode;
    let offset = 1;
    for (const content of contents.iterate(ascending)) {
        if (isInternalEpisode(content)) {
            lastSeenEpisode = content;
            offset = 1;
            continue;
        }
        if (lastSeenEpisode && isUnusedPiece(content)) {
            const partialIndex = lastSeenEpisode.partialIndex || 0;
            const internalTocEpisode = convertToTocEpisode(lastSeenEpisode.totalIndex, partialIndex, offset, content);
            contents.replace(content, internalTocEpisode);
            offset++;
        }
    }
    let volume;
    const volumeInserter = ascending ? TocLinkedList.prototype.insertBefore : TocLinkedList.prototype.insertAfter;
    for (const content of contents.iterate(!ascending)) {
        if (isInternalPart(content)) {
            volume = content;
        }
        if (!volume) {
            continue;
        }
        if (isInternalEpisode(content)) {
            if (!content.match && volume.title) {
                const volumeTitleIndex = content.title.indexOf(volume.title);
                if (volumeTitleIndex >= 0) {
                    content.title = content
                        .title
                        .substring(volumeTitleIndex + volume.title.length)
                        .replace(state.trimRegex, "");
                    volumeInserter.call(contents, volume, content);
                }
            }
            else if (content.part === volume) {
                volumeInserter.call(contents, volume, content);
            }
        }
    }
    volume = undefined;
    const episodeInserter = ascending ? Array.prototype.push : Array.prototype.unshift;
    for (const node of contents.iterate(ascending)) {
        if (isInternalPart(node)) {
            volume = node;
        }
        else if (isInternalEpisode(node)) {
            if (node.partCount) {
                adjustPartialIndicesLinked(node, ascending, contents);
                adjustPartialIndicesLinked(node, !ascending, contents);
            }
            if (volume) {
                episodeInserter.call(volume.episodes, node);
                const titleIndex = node.title.indexOf(volume.title);
                if (titleIndex >= 0) {
                    node.title = node.title.substring(titleIndex + volume.title.length).replace(state.trimRegex, "");
                }
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
                type: "episode",
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
                        type: "part",
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
                if (!possibleVolume.title || possibleVolume.title.includes(contentTitle)) {
                    possibleVolume.title = contentTitle;
                }
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
    }
    const result = [];
    if (possibleVolume) {
        if (possibleEpisode) {
            possibleEpisode.part = possibleVolume;
        }
        if (newVolume) {
            result.push(possibleVolume);
        }
    }
    if (possibleEpisode) {
        result.push(possibleEpisode);
    }
    else if (isEpisodePiece(tocPiece)) {
        result.push({ type: "unusedPiece", ...tocPiece, part: possibleVolume });
    }
    return result;
}
//# sourceMappingURL=directTools.js.map