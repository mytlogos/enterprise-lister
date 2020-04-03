import logger from "../../logger";
import {EpisodeContent, TocContent, TocEpisode, TocPart, TocScraper} from "../types";
import {queueCheerioRequest} from "../queueManager";
import {combiIndex, equalsIgnore, extractIndices, sanitizeString} from "../../tools";
import * as url from "url";
import {TocSearchMedium} from "../../types";

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
    url?: string;
    title: string;
}

export interface EpisodePiece extends TocPiece {
    url: string;
    releaseDate: Date;
}

export interface PartPiece extends TocPiece {
    episodes: any[];
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
}

interface InternalTocPart extends InternalTocContent {
    episodes: InternalTocEpisode[];
}

function isEpisodePiece(value: TocPiece | any): value is EpisodePiece {
    return value.releaseDate || value.locked;
}

function isPartPiece(value: TocPiece | any): value is PartPiece {
    return value.episodes;
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
    let hasParts = false;
    let currentTotalIndex;
    const contents: InternalTocContent[] = [];
    const volumeRegex = /v[olume]{0,5}[\s.]*((\d+)(\.(\d+))?)/i;
    const chapterRegex = /\s*(c[hapter]{0,6}|(ep[isode]{0,5})|(word))?[\s.]*((\d+)(\.(\d+))?)[-:\s]*(.*)/i;
    const partRegex = /([^a-zA-Z]P[art]{0,3}[.\s]*(\d+))|([\[(]?(\d+)[/|](\d+)[)\]]?)/;
    const volumeMap: Map<number, InternalTocPart> = new Map();

    for await (const tocPiece of pageGenerator) {
        let title = tocPiece.title;
        const volumeGroups = volumeRegex.exec(title);
        let volume: InternalTocPart | undefined;
        if (volumeGroups) {
            const volIndices = extractIndices(volumeGroups, 1, 2, 4);

            if (volIndices) {
                const beforeMatch = title.substring(0, volumeGroups.index);
                const afterMatch = title.substring(volumeGroups.index + volumeGroups[0].length);
                title = beforeMatch + afterMatch;

                volume = volumeMap.get(volIndices.combi);

                if (!volume) {
                    volume = {
                        combiIndex: volIndices.combi,
                        totalIndex: volIndices.total,
                        partialIndex: volIndices.fraction,
                        title: "",
                        originalTitle: "",
                        episodes: []
                    } as InternalTocPart;
                    contents.push(volume);
                    volumeMap.set(volIndices.combi, volume);
                }
            }
        }
        const chapterGroups = chapterRegex.exec(title);
        if (!chapterGroups) {
            continue;
        }
        const indices = extractIndices(chapterGroups, 4, 5, 7);

        if (!indices) {
            continue;
        }

        if (!isEpisodePiece(tocPiece)) {
            continue;
        }
        title = chapterGroups[8];
        const partGroups = partRegex.exec(tocPiece.title);

        if (partGroups) {
            const part = Number.parseInt(partGroups[2] || partGroups[4], 10);

            if (Number.isInteger(part)) {
                if (indices.fraction == null) {
                    indices.fraction = part;
                    indices.combi = combiIndex({totalIndex: indices.total, partialIndex: indices.fraction});
                    title = title.substring(0, partGroups.index - (tocPiece.title.length - title.length)).trim();
                } else {
                    logger.warn("Episode Part defined with existing EpisodePartialIndex");
                }
            }
        }
        const chapterContent = {
            combiIndex: indices.combi,
            totalIndex: indices.total,
            partialIndex: indices.fraction,
            url: tocPiece.url,
            releaseDate: tocPiece.releaseDate || new Date(),
            title,
            originalTitle: tocPiece.title
        } as InternalTocEpisode;

        if (volume) {
            volume.episodes.push(chapterContent);
        } else {
            contents.push(chapterContent);
        }
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
