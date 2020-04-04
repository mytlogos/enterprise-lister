import logger from "../../logger";
import {EpisodeContent, TocContent, TocEpisode, TocPart, TocScraper} from "../types";
import {queueCheerioRequest} from "../queueManager";
import {combiIndex, equalsIgnore, extractIndices, MediaType, sanitizeString} from "../../tools";
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
    match: TocMatch;
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
    return value.episodes;
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
    const volRegex = ["volume", "book", "season"];
    const episodeRegex = ["episode", "chapter", "\\d+", "word \\d+"];
    const maybeEpisode = ["ova"];
    const optionalEpisode = ["xxx special chapter", "other tales", "interlude", "bonus", "SKILL SUMMARY", "CHARACTER INTRODUCTION", "side story", "ss", "intermission", "extra", "omake", /*"oneshot"*/];
    const partEpisode = ["part", "3/5"];
    const invalidEpisode = ["delete", "spam"];
    const start = ["prologue", "prolog"];
    const end = ["Epilogue", "finale"];
    const hasParts = false;
    let currentTotalIndex;
    const contents: InternalTocContent[] = [];
    const volumeRegex = /^(.*)(v[olume]{0,5}[\s.]*((\d+)(\.(\d+))?)[-:\s]*)(.*)$/i;
    const chapterRegex = /(^|\W)[\s-]*(c[hapter]{0,6}|(ep[isode]{0,5})|(word))?[\s.]*((\d+)(\.(\d+))?)[-:\s]*(.*)/i;
    const partRegex = /([^a-zA-Z]P[art]{0,3}[.\s]*(\d+))|([\[(]?(\d+)[/|](\d+)[)\]]?)/;
    const trimTitle = /^([-:\s]+)?(.+?)([-:\s]+)?$/i;
    const volumeMap: Map<number, InternalTocPart> = new Map();
    const scrapeState: TocScrapeState = {
        volumeRegex: /v[olume]{0,5}[\s.]*(((\d+)(\.(\d+))?)|\W*(delete|spam))/ig,
        separatorRegex: /[-:]/g,
        chapterRegex: /(^|(c[hapter]{0,6}|(ep[isode]{0,5})|(word)))[\s.]*(((\d+)(\.(\d+))?)|\W*(delete|spam))/ig,
        partRegex: /(P[art]{0,3}[.\s]*(\d+))|([\[(]?(\d+)[/|](\d+)[)\]]?)/g,
        trimRegex: /^[\s:–-]+|[\s:–-]+$/g,
        endRegex: /end/g,
        startRegex: /start/g,
        order: "unknown",
        volumeMap: new Map<number, InternalTocPart>()
    };

    // normalWay(pageGenerator, volumeRegex, volumeMap, contents, chapterRegex, trimTitle, partRegex);
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

function mark(tocPiece: TocContentPiece, state: TocScrapeState): InternalTocContent[] {
    const volumeRegex = state.volumeRegex;
    const separatorRegex = state.separatorRegex;
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
                    // noinspection JSUnusedAssignment
                    possibleEpisode.partialIndex = part;
                    possibleEpisode.combiIndex = combiIndex(possibleEpisode);
                    usedMatches.push(match);
                } else {
                    logger.warn("Episode Part defined with existing EpisodePartialIndex");
                }
            }
        } else if (!possibleVolume && match.type === "volume") {
            if (match.match[6]) {
                // it matches the pattern for an invalid episode
                return [];
            }
            const volIndices = extractIndices(match.match, 2, 3, 5);

            if (volIndices) {
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
                possibleVolume.title = contentTitle;
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
    if (possibleVolume) {
        if (possibleEpisode) {
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
