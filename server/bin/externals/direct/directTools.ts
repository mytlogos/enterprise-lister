import logger from "../../logger";
import {EpisodeContent, TocContent, TocEpisode, TocPart, TocScraper} from "../types";
import {queueCheerioRequest} from "../queueManager";
import {
    combiIndex,
    equalsIgnore,
    extractIndices,
    getElseSet,
    max,
    MediaType,
    min,
    sanitizeString,
    stringify
} from "../../tools";
import * as url from "url";
import {ReleaseState, TocSearchMedium} from "../../types";

export function getTextContent(novelTitle: string, episodeTitle: string, urlString: string, content: string) {
    if (!novelTitle || !episodeTitle) {
        logger.warn("episode link with no novel or episode title: " + urlString);
        return [];
    }
    if (!content) {
        logger.warn("episode link with no content: " + urlString);
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
    const episodeContent: EpisodeContent = {
        content: [content],
        episodeTitle,
        mediumTitle: novelTitle,
        index
    };

    return [episodeContent];
}

export async function searchTocCheerio(medium: TocSearchMedium, tocScraper: TocScraper, uri: string,
                                       searchLink: (parameter: string) => string, linkSelector: string) {
    logger.info(`searching for ${medium.title} on ${uri}`);
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
        const $ = await queueCheerioRequest(searchLink(searchWords));

        const links = $(linkSelector);

        if (!links.length) {
            break;
        }
        for (let i = 0; i < links.length; i++) {
            const linkElement = links.eq(i);

            const text = sanitizeString(linkElement.text());

            if (equalsIgnore(text, medium.title) || medium.synonyms.some((s) => equalsIgnore(text, s))) {
                tocLink = linkElement.attr("href") as string;
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
        } else {
            logger.warn("a possible toc link could not be scraped: " + tocLink);
        }
    } else {
        logger.info(`no toc link found on ${uri} for ${medium.mediumId}: '${medium.title}'`);
    }
    return;
}

export interface SearchResult {
    value?: string;
    done: boolean;
}

function searchForWords(
    linkSelector: string,
    medium: TocSearchMedium,
    uri: string,
    searchLink: (parameter: string) => string
): (searchString: string) => Promise<SearchResult> {
    return async (word: string): Promise<SearchResult> => {
        const $ = await queueCheerioRequest(searchLink(word));

        const links = $(linkSelector);

        if (!links.length) {
            return {done: true};
        }
        for (let i = 0; i < links.length; i++) {
            const linkElement = links.eq(i);

            const text = sanitizeString(linkElement.text());

            if (equalsIgnore(text, medium.title) || medium.synonyms.some((s) => equalsIgnore(text, s))) {
                const tocLink = linkElement.attr("href") as string;
                return {value: url.resolve(uri, tocLink), done: true};
            }
        }
        return {done: false};
    };
}

export async function searchToc(medium: TocSearchMedium, tocScraper: TocScraper, uri: string,
                                searchLink: (searchString: string) => Promise<SearchResult>) {
    logger.info(`searching for ${medium.title} on ${uri}`);
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
        } else {
            logger.warn("a possible toc link could not be scraped: " + tocLink);
        }
    } else {
        logger.info(`no toc link found on ${uri} for ${medium.mediumId}: '${medium.title}'`);
    }
    return;
}

export interface TocPiece {
    readonly title: string;
}

export interface TocMetaPiece extends TocPiece {
    readonly mediumId?: number;
    readonly synonyms?: string[];
    readonly mediumType: MediaType;
    readonly end?: boolean;
    readonly link: string;
    readonly langCOO?: string;
    readonly langTL?: string;
    readonly statusCOO: ReleaseState;
    readonly statusTl: ReleaseState;
    readonly authors?: Array<{ name: string, link: string }>;
    readonly artists?: Array<{ name: string, link: string }>;
}

export interface TocContentPiece extends TocPiece {
    readonly url?: string;
}

interface Node {
    after?: InternalTocContent;
    before?: InternalTocContent;
    part?: InternalTocPart
}

type UnusedPiece<R> = Node & R;
type UnusedEpisode = UnusedPiece<EpisodePiece>;

export interface EpisodePiece extends TocContentPiece {
    readonly url: string;
    readonly releaseDate: Date;
}

export interface PartPiece extends TocContentPiece {
    readonly episodes: any[];
}

interface InternalToc {
    title: string;
    content: InternalTocContent[];
    synonyms?: string[];
    mediumType: MediaType;
    partsOnly?: boolean;
    end?: boolean;
    link: string;
    langCOO?: string;
    langTL?: string;
    statusCOO: ReleaseState;
    statusTl: ReleaseState;
    authors?: Array<{ name: string, link: string }>;
    artists?: Array<{ name: string, link: string }>;
}

interface InternalTocContent {
    title: string;
    originalTitle: string;
    combiIndex: number;
    totalIndex: number;
    partialIndex?: number;
}

interface InternalTocEpisode extends InternalTocContent {
    url: string;
    releaseDate?: Date;
    locked?: boolean;
    match: TocMatch | null;
    partCount?: number;
    part?: InternalTocPart;
    relativeIndices?: {
        combiIndex: number;
        totalIndex: number;
        partialIndex?: number;
    };
}

interface InternalTocPart extends InternalTocContent {
    episodes: InternalTocEpisode[];
}

function isEpisodePiece(value: any): value is EpisodePiece {
    return value.releaseDate || value.locked;
}

function isPartPiece(value: any): value is PartPiece {
    return value.episodes;
}

function isTocMetaPiece(value: any): value is TocMetaPiece {
    return Number.isInteger(value.mediumType);
}

function isInternalEpisode(value: TocContent | any): value is InternalTocEpisode {
    return value.releaseDate || value.locked;
}

function isInternalPart(value: TocContent | any): value is InternalTocPart {
    return Array.isArray(value.episodes);
}

function externalizeTocEpisode(value: InternalTocEpisode): TocEpisode {
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

function externalizeTocPart(internalTocPart: InternalTocPart): TocPart {
    return {
        title: internalTocPart.title,
        combiIndex: internalTocPart.combiIndex,
        partialIndex: internalTocPart.partialIndex,
        totalIndex: internalTocPart.totalIndex,
        episodes: internalTocPart.episodes.map(externalizeTocEpisode)
    };
}

export async function scrapeToc(pageGenerator: AsyncGenerator<TocPiece, void>) {
    const maybeEpisode = ["ova"];
    const optionalEpisode = ["xxx special chapter", "other tales", "interlude", "bonus", "SKILL SUMMARY", "CHARACTER INTRODUCTION", "side story", "ss", "intermission", "extra", "omake", /*"oneshot"*/];
    const start = ["prologue", "prolog"];
    const end = ["Epilogue", "finale"];
    const contents: InternalTocContent[] = [];
    const scrapeState: TocScrapeState = {
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
        volumeMap: new Map<number, InternalTocPart>()
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
    return contents.map((value): TocContent => {
        if (isInternalEpisode(value)) {
            return externalizeTocEpisode(value);
        } else if (isInternalPart(value)) {
            return externalizeTocPart(value);
        } else {
            throw TypeError();
        }
    });
}

type TocMatchType = "volume" | "separator" | "episode" | "part";

function markWithRegex(regExp: RegExp, title: string, type: TocMatchType, matches: TocMatch[]) {
    if (!regExp.flags.includes("g")) {
        throw Error("Need a Regex with global Flag enabled, else it will crash");
    }
    for (let match = regExp.exec(title); match; match = regExp.exec(title)) {
        matches.push({match, from: match.index, to: match.index + match[0].length, ignore: false, remove: true, type});
    }
}

interface TocMatch {
    match: RegExpExecArray;
    from: number;
    to: number;
    type: TocMatchType;
    ignore: boolean;
    remove: boolean;
}

interface TocScrapeState {
    lastExtracted?: InternalTocContent;
    lastCombiIndex?: number;
    ascendingCount: number;
    descendingCount: number;
    hasParts: boolean;
    unusedPieces: Array<UnusedPiece<TocContentPiece>>;
    volumeRegex: RegExp;
    chapterRegex: RegExp;
    partRegex: RegExp;
    separatorRegex: RegExp;
    trimRegex: RegExp;
    startRegex: RegExp;
    endRegex: RegExp;
    order: "asc" | "desc" | "unknown";
    volumeMap: Map<number, InternalTocPart>;
    tocMeta?: InternalToc;
}

function adjustPartialIndices(contentIndex: number, contents: InternalTocContent[], ascending: boolean): void {
    const content = contents[contentIndex] as InternalTocEpisode;
    const partialLimit = content.partCount;

    if (partialLimit) {
        const totalIndex = content.totalIndex;
        const currentPartialIndex = content.partialIndex;

        if (currentPartialIndex == null) {
            logger.warn("partialLimit but no partialIndex for: " + stringify(content));
        } else {
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
                    logger.warn(`trying to overwrite partialIndex on existing one with ${nextPartialIndex}: ${stringify(content)}`);
                } else {
                    next.partialIndex = nextPartialIndex;
                    next.combiIndex = combiIndex(next);
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
                    logger.warn("trying to overwrite partialIndex on existing one: " + stringify(content));
                } else {
                    previous.partialIndex = nextPartialIndex;
                    previous.combiIndex = combiIndex(previous);
                }
            }
        }
    }
}

type EpisodePieceConverter = (value: EpisodePiece, index: number, array: EpisodePiece[]) => InternalTocEpisode;

function getConvertToTocEpisode(ascending: boolean, totalIndex: number, partialIndex: number): EpisodePieceConverter {
    return (value: EpisodePiece, index: number, array: EpisodePiece[]): InternalTocEpisode => {
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
        episode.combiIndex = combiIndex(episode);
        return episode;
    };
}

// tslint:disable-next-line
function insertUnusedEndPieces(state: TocScrapeState, contents: InternalTocContent[], ascending: boolean, unusedEpisodePieces: UnusedEpisode[]) {
    let endingsFilter: (value: UnusedEpisode) => boolean;
    if (state.tocMeta && state.tocMeta.end) {
        let endFilter: (value: UnusedEpisode) => boolean;
        let insertFunction: (...values: InternalTocEpisode[]) => void;

        let latest = max(contents, "combiIndex");

        if (latest && isInternalPart(latest)) {
            latest = max(latest.episodes, "combiIndex");
        }

        const sidePartialIndex = latest ? (latest.partialIndex || 0) + 1 : 1;

        if (ascending) {
            endingsFilter = (value) => !value.after;
            endFilter = (value) => !value.before;
            insertFunction = contents.push;
        } else {
            endingsFilter = (value) => !value.before;
            endFilter = (value) => !value.after;
            insertFunction = contents.unshift;
        }
        const endSideEpisodes = unusedEpisodePieces
            .filter(endFilter)
            .map(getConvertToTocEpisode(ascending, latest ? latest.totalIndex : 0, sidePartialIndex));

        insertFunction.apply(contents, endSideEpisodes);
    } else {
        endingsFilter = (value) => !value.before || !value.after;
    }
    let earliest = min(contents, "combiIndex");
    let partTitle: string | undefined;

    if (earliest && isInternalPart(earliest)) {
        contents = earliest.episodes;
        partTitle = earliest.title;
        earliest = min(earliest.episodes, "combiIndex");
    }

    const startSidePartialIndex = earliest && earliest.totalIndex === 0 ? (earliest.partialIndex || 0) + 1 : 1;

    const startSideEpisodes = unusedEpisodePieces
        .filter(endingsFilter)
        .map(getConvertToTocEpisode(ascending, 0, startSidePartialIndex));

    if (partTitle) {
        const title = partTitle as string;
        startSideEpisodes.forEach((value) => {
            const index = value.title.indexOf(title);
            if (index >= 0) {
                value.title = value.title.substring(index + title.length).replace(state.trimRegex, "");
            }
        });
    }
    if (ascending) {
        contents.unshift(...startSideEpisodes);
    } else {
        contents.push(...startSideEpisodes);
    }
}

// tslint:disable-next-line
function insertIntoPart(insertEpisode: InternalTocEpisode, part: InternalTocPart, state: TocScrapeState, partIndex: number, index: number) {
    const volumeTitleIndex = insertEpisode.title.indexOf(part.title);

    if (volumeTitleIndex >= 0) {
        insertEpisode.title = insertEpisode
            .title
            .substring(volumeTitleIndex + part.title.length)
            .replace(state.trimRegex, "");

        const insertIndex = partIndex + index;
        part.episodes.splice(insertIndex, 0, insertEpisode);
        return true;
    }
    return false;
}

// tslint:disable-next-line
function insertUnusedMiddlePieces(state: TocScrapeState, contents: InternalTocContent[], ascending: boolean, unusedEpisodePieces: UnusedEpisode[]) {
    // map has insertion order, so it is fine to use it
    const rangeEpisodeMap: Map<InternalTocContent, UnusedEpisode[]> = new Map();

    const middlePieces = unusedEpisodePieces.filter((value) => value.after && value.before);

    for (const unused of middlePieces) {
        const episodes = getElseSet(rangeEpisodeMap, unused.part || unused.after, () => []);
        episodes.push(unused);
    }
    const startKey = ascending ? "after" : "before";
    const endKey = ascending ? "before" : "after";

    for (const range of rangeEpisodeMap.values()) {
        let start: InternalTocContent | undefined;
        let end: InternalTocContent | undefined;
        let index = 0;
        let converter: EpisodePieceConverter | undefined;
        let startIndex: number | undefined;
        let partStartIndex: number | undefined;
        let partEndIndex: number | undefined;
        let part: InternalTocPart | undefined;

        for (const unusedEpisode of range) {
            const currentStart = unusedEpisode[startKey];
            const currentEnd = unusedEpisode[endKey];
            if (!start && !end) {
                start = currentStart as InternalTocContent;
                end = currentEnd as InternalTocContent;
                part = unusedEpisode.part || (isInternalPart(start) ? start : part);
                if (part) {
                    const episode = part.episodes.reduce((previous, current): InternalTocEpisode => {
                        // tslint:disable-next-line
                        const previousTotalIndex = (previous.relativeIndices != null && previous.relativeIndices.totalIndex) || previous.totalIndex;
                        // tslint:disable-next-line
                        const previousPartialIndex = (previous.relativeIndices != null && previous.relativeIndices.partialIndex) || previous.totalIndex;
                        // tslint:disable-next-line
                        const nextTotalIndex = (current.relativeIndices != null && current.relativeIndices.totalIndex) || current.totalIndex;
                        // tslint:disable-next-line
                        const nextPartialIndex = (current.relativeIndices != null && current.relativeIndices.partialIndex) || current.totalIndex;

                        if (previousTotalIndex === 0 && nextTotalIndex === 0) {
                            if (previousPartialIndex < nextPartialIndex) {
                                return current;
                            } else {
                                return previous;
                            }
                        } else if (previousTotalIndex === 0) {
                            return previous;
                        } else {
                            return current;
                        }
                    });
                    let startPartialIndex;
                    if (episode) {
                        if (episode.totalIndex === 0) {
                            startPartialIndex = episode.partialIndex;
                        } else if (episode.relativeIndices != null && episode.relativeIndices.totalIndex === 0) {
                            startPartialIndex = episode.relativeIndices.partialIndex;
                        } else {
                            startPartialIndex = 0;
                        }
                    } else {
                        startPartialIndex = 0;
                    }
                    converter = getConvertToTocEpisode(ascending, 0, (startPartialIndex || 0) + 1);
                } else {
                    converter = getConvertToTocEpisode(ascending, start.totalIndex, (start.partialIndex || 0) + 1);
                }
                if (isInternalEpisode(start) && start.part) {
                    partStartIndex = start.part.episodes.indexOf(start);
                }
                if (isInternalEpisode(end) && end.part) {
                    partEndIndex = end.part.episodes.indexOf(end);
                }
                startIndex = contents.indexOf(start);
            } else if ((start !== currentStart || end !== currentEnd) && part !== unusedEpisode.part) {
                logger.warn("different episode boundaries detected for an unused one: " + stringify(unusedEpisode));
                continue;
            }
            const internalTocEpisode = (converter as EpisodePieceConverter)(unusedEpisode, index, range);
            let addedToVolume = false;

            if (part) {
                const partIndex = ascending ? 0 : part.episodes.length;
                addedToVolume = insertIntoPart(internalTocEpisode, part, state, partIndex, index);
            }
            if (isInternalPart(start) && !addedToVolume) {
                addedToVolume = insertIntoPart(internalTocEpisode, start, state, 0, index);
            } else if (isInternalEpisode(start) && start.part && partStartIndex != null && !addedToVolume) {
                addedToVolume = insertIntoPart(internalTocEpisode, start.part, state, partStartIndex, index);
            }
            if (isInternalEpisode(end) && end.part && partEndIndex != null && !addedToVolume) {
                addedToVolume = insertIntoPart(internalTocEpisode, end.part, state, partEndIndex, index);
            }
            if (!addedToVolume) {
                const insertIndex = (startIndex as number) + index + (ascending ? 1 : 0);
                contents.splice(insertIndex, 0, internalTocEpisode);
            }
            index++;
        }
    }
}

function adjustTocContents(contents: InternalTocContent[], state: TocScrapeState): void {
    const ascending = state.ascendingCount > state.descendingCount;

    if (state.ascendingCount > state.descendingCount) {
        state.order = "asc";
    } else {
        state.order = "desc";
    }

    const unusedEpisodePieces = state.unusedPieces.filter(isEpisodePiece);

    insertUnusedEndPieces(state, contents, ascending, unusedEpisodePieces);
    insertUnusedMiddlePieces(state, contents, ascending, unusedEpisodePieces);

    let currentVolume: InternalTocPart | undefined;
    for (let i = 0; i < contents.length; i++) {
        const content = contents[i];

        if (isInternalEpisode(content)) {
            adjustPartialIndices(i, contents, ascending);
            if (currentVolume) {
                content.part = currentVolume;
                currentVolume.episodes.push(content);
                contents.splice(i, 1);
                i--;
            }
        } else if (isInternalPart(content)) {
            for (let j = 0; j < content.episodes.length; j++) {
                adjustPartialIndices(j, content.episodes, ascending);
            }
            if (ascending) {
                currentVolume = content;
            } else {
                for (let j = i - 1; j >= 0; j--) {
                    const previousContent = contents[j];
                    if (isInternalPart(previousContent)) {
                        break;
                    }
                    contents.splice(j, 1);
                    const episode = previousContent as InternalTocEpisode;
                    episode.part = content;
                    content.episodes.unshift(episode);
                }
            }
        }
    }
}

function mark(tocPiece: TocContentPiece, state: TocScrapeState): InternalTocContent[] {
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
    const matches: TocMatch[] = [];

    markWithRegex(volumeRegex, title, "volume", matches);
    // markWithRegex(separatorRegex, title, "separator", matches);
    markWithRegex(chapterRegex, title, "episode", matches);
    markWithRegex(partRegex, title, "part", matches);

    matches.sort((a, b) => a.from - b.from);
    let possibleEpisode: InternalTocEpisode | undefined;
    let possibleVolume: InternalTocPart | undefined;
    let newVolume = false;
    const usedMatches: TocMatch[] = [];

    for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        if (match.type === "episode") {
            if (match.match[10]) {
                // it matches the pattern for an invalid episode
                return [];
            }
            const indices = extractIndices(match.match, 6, 7, 9);

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
            } as InternalTocEpisode;
        } else if (possibleEpisode && match.type === "part") {
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
                    possibleEpisode.combiIndex = combiIndex(possibleEpisode);
                    usedMatches.push(match);
                } else {
                    logger.warn("Episode Part defined with existing EpisodePartialIndex");
                }
            }
        } else if (!possibleVolume && match.type === "volume") {
            if (match.match[7]) {
                // it matches the pattern for an invalid episode
                return [];
            }
            const volIndices = extractIndices(match.match, 3, 4, 6);

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
                    } as InternalTocPart;
                    newVolume = true;
                    state.volumeMap.set(volIndices.combi, possibleVolume);
                }
            } else {
                logger.warn("got a volume match but no indices");
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
            let contentTitle: string;
            if ((i + 1) < usedMatches.length) {
                contentTitle = title.substring(usedMatch.to, usedMatches[i + 1].from).replace(trimRegex, "");
            } else {
                contentTitle = after;
            }
            if (usedMatch.type === "volume" && possibleVolume) {
                if (!possibleVolume.title || possibleVolume.title.includes(contentTitle)) {
                    possibleVolume.title = contentTitle;
                }
            } else if (usedMatch.type === "episode" && possibleEpisode) {
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
    const result: InternalTocContent[] = [];
    if (possibleEpisode) {
        if (state.lastCombiIndex != null) {
            if (state.lastCombiIndex < possibleEpisode.combiIndex) {
                state.ascendingCount++;
            } else if (state.lastCombiIndex > possibleEpisode.combiIndex) {
                state.descendingCount++;
            }
        }
        state.lastCombiIndex = possibleEpisode.combiIndex;
        for (const unusedPiece of state.unusedPieces) {
            if (!unusedPiece.before) {
                unusedPiece.before = possibleEpisode;
            }
        }
    } else {
        const after = newVolume ? possibleVolume : state.lastExtracted;
        state.unusedPieces.push({...tocPiece, after, part: possibleVolume});
    }
    state.lastExtracted = possibleEpisode || possibleVolume || state.lastExtracted;

    if (possibleVolume) {
        if (possibleEpisode) {
            possibleEpisode.part = possibleVolume;
            possibleVolume.episodes.push(possibleEpisode);
        }
        if (newVolume) {
            result.push(possibleVolume);
        }
    } else if (possibleEpisode) {
        result.push(possibleEpisode);
    }
    return result;
}
