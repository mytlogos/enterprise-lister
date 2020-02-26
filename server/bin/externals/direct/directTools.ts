import logger from "../../logger";
import {EpisodeContent, TocScraper} from "../types";
import {queueCheerioRequest} from "../queueManager";
import {equalsIgnore, sanitizeString} from "../../tools";
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
                const tocLink = linkElement.attr("href");
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
