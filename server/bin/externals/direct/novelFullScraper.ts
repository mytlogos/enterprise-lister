import {EpisodeContent, Hook, Toc, TocContent, TocEpisode, TocPart} from "../types";
import {EpisodeNews, News, ReleaseState, SearchResult, TocSearchMedium} from "../../types";
import {queueCheerioRequest} from "../queueManager";
import * as url from "url";
import {extractIndices, isTocEpisode, isTocPart, MediaType, relativeToAbsoluteTime, sanitizeString} from "../../tools";
import logger from "../../logger";
import {EpisodePiece, getTextContent, scrapeToc, searchTocCheerio, TocMetaPiece, TocPiece} from "./directTools";
import {checkTocContent} from "../scraperTools";
import {UrlError} from "../errors";

async function tocSearch(medium: TocSearchMedium): Promise<Toc | undefined> {
    return searchTocCheerio(
        medium,
        tocAdapter,
        "https://novelfull.com/",
        (parameter) => "https://novelfull.com/search?keyword=" + parameter,
        ".truyen-title a"
    );
}

async function search(text: string): Promise<SearchResult[]> {
    const encodedText = encodeURIComponent(text);
    const $ = await queueCheerioRequest("https://novelfull.com/search?keyword=" + encodedText);

    const uri = "https://novelfull.com/";
    const results = $(".col-truyen-main .row");
    const searchResults: SearchResult[] = [];

    for (let i = 0; i < results.length; i++) {
        const resultElement = results.eq(i);
        const linkElement = resultElement.find(".truyen-title a");
        const authorElement = resultElement.find(".author");
        const coverElement = resultElement.find("img.cover");

        const coverLink = url.resolve(uri, coverElement.attr("src") as string);
        const author = sanitizeString(authorElement.text());
        const title = sanitizeString(linkElement.text());
        let tocLink = linkElement.attr("href") as string;
        tocLink = url.resolve(uri, tocLink);

        searchResults.push({title, link: tocLink, author, coverUrl: coverLink});
    }
    return searchResults;
}

async function contentDownloadAdapter(urlString: string): Promise<EpisodeContent[]> {
    if (!urlString.match(/^https?:\/\/novelfull\.com\/.+\/.+\d+.+/)) {
        logger.warn("invalid chapter link for novelFull: " + urlString);
        return [];
    }

    const $ = await queueCheerioRequest(urlString);
    const mediumTitleElement = $("ol.breadcrumb li:nth-child(2) a");
    const novelTitle = sanitizeString(mediumTitleElement.text());

    const episodeTitle = sanitizeString($(".chapter-title").text());
    const directContentElement = $("#chapter-content");
    directContentElement.find("script, ins").remove();

    const content = directContentElement.html();

    if (!content) {
        logger.warn("no content on novelFull for " + urlString);
        return [];
    }

    return getTextContent(novelTitle, episodeTitle, urlString, content);
}

function extractTocSnippet($: CheerioStatic, link: string): Toc {
    let end = false;
    let releaseState: ReleaseState = ReleaseState.Unknown;
    const releaseStateElement = $(".info > div:nth-child(4) > a:nth-child(2)");

    const releaseStateString = releaseStateElement.text().toLowerCase();
    if (releaseStateString.includes("complete")) {
        end = true;
        releaseState = ReleaseState.Complete;
    } else if (releaseStateString === "ongoing") {
        end = false;
        releaseState = ReleaseState.Ongoing;
    }
    const mediumTitleElement = $(".desc .title").first();
    const mediumTitle = sanitizeString(mediumTitleElement.text());
    return {
        content: [],
        mediumType: MediaType.TEXT,
        end,
        // statusTl: releaseState,
        title: mediumTitle,
        link
    };
}

async function tocAdapterTooled(tocLink: string): Promise<Toc[]> {
    const uri = "https://novelfull.com";

    const linkMatch = tocLink.match("^https?://novelfull\\.com/([\\w-]+.html)$");
    if (!linkMatch) {
        throw new UrlError("not a valid toc url for NovelFull: " + tocLink, tocLink);
    }
    let toc: Toc | undefined;
    const pagedTocLink = `https://novelfull.com/index.php/${linkMatch[1]}?page=`;
    const now = new Date();

    const contents: TocContent[] = await scrapeToc((async function* itemGenerator(): AsyncGenerator<TocPiece, void> {
        for (let i = 1; ; i++) {
            const $ = await queueCheerioRequest(pagedTocLink + i);

            if (!toc) {
                toc = extractTocSnippet($, tocLink);
                yield toc as TocMetaPiece;
            }
            const items = $(".list-chapter li a");

            for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
                const newsRow = items.eq(itemIndex);
                const link = url.resolve(uri, newsRow.attr("href") as string);
                const episodeTitle = sanitizeString(newsRow.text());
                yield {title: episodeTitle, url: link, releaseDate: now} as EpisodePiece;
            }

            if ($(".pagination .last.disabled, .pagination .next.disabled").length) {
                break;
            }

            // no novel has more than 300 toc pages (300 * 50 -> 15000 Chapters)
            if (i > 300) {
                logger.error(new Error(`Could not reach end of TOC '${toc.link}'`));
                break;
            }
        }
    })());
    for (const content of contents) {
        if (isTocPart(content)) {
            if (!content.title) {
                content.title = `Volume ${content.combiIndex}`;
            }
            for (const episode of content.episodes) {
                if (!episode.title) {
                    episode.title = `Chapter ${episode.combiIndex}`;
                }
            }
        } else if (isTocEpisode(content)) {
            if (!content.title) {
                content.title = `Chapter ${content.combiIndex}`;
            }
        }
    }
    if (toc) {
        toc.content = contents;
        return [toc];
    }
    return [];
}

async function tocAdapter(tocLink: string): Promise<Toc[]> {
    const uri = "https://novelfull.com";

    const linkMatch = tocLink.match("^https?://novelfull\\.com/([\\w-]+.html)$");
    if (!linkMatch) {
        throw new UrlError("not a valid toc url for NovelFull: " + tocLink, tocLink);
    }
    const toc: {
        title?: string;
        content?: TocContent[];
        synonyms?: string[];
        mediumType: MediaType;
        partsOnly?: boolean;
        end?: boolean;
        link: string;
    } = {
        link: tocLink,
        mediumType: MediaType.TEXT
    };
    tocLink = `https://novelfull.com/index.php/${linkMatch[1]}?page=`;

    for (let i = 1; ; i++) {
        const $ = await queueCheerioRequest(tocLink + i);

        if ($(".info a[href=\"/status/Completed\"]").length) {
            toc.end = true;
        }
        const tocSnippet = await scrapeTocPage($, uri);

        if (!tocSnippet) {
            break;
        }

        if (!toc.title) {
            toc.title = tocSnippet.title;
        } else if (tocSnippet.title && tocSnippet.title !== toc.title) {
            logger.warn(
                `Mismatched Title on Toc Pages on novelFull: '${toc.title}' and '${tocSnippet.title}': ` + tocLink
            );
            return [];
        }
        if (!toc.content) {
            toc.content = tocSnippet.content;
        } else {
            toc.content.push(...tocSnippet.content);
        }
        if (!toc.synonyms) {
            toc.synonyms = tocSnippet.synonyms;
        } else if (tocSnippet.synonyms) {
            toc.synonyms.push(...tocSnippet.synonyms);
        }
        if ($(".pagination .last.disabled, .pagination .next.disabled").length) {
            break;
        }
        // no novel has more than 300 toc pages (300 * 50 -> 15000 Chapters)
        if (i > 300) {
            logger.error(new Error(`Could not reach end of TOC '${toc.link}'`));
            break;
        }
    }

    if (!toc.content || !toc.title) {
        return [];
    }
    return [toc as Toc];
}

async function scrapeTocPage($: CheerioStatic, uri: string): Promise<Toc | undefined> {
// TODO: 20.07.2019 scrape alternative titles and author too
    const mediumTitleElement = $(".desc .title").first();
    const mediumTitle = sanitizeString(mediumTitleElement.text());

    const content: TocContent[] = [];
    const indexPartMap: Map<number, TocPart> = new Map<number, TocPart>();
    const items = $(".list-chapter li a");

    const titleRegex = /(vol(\.|ume)?\s*((\d+)(\.(\d+))?).+)?((ch(\.|a?.?p?.?t?.?e?.?r?.?)?)|-)\s*((\d+)(\.(\d+))?)/i;
    // TODO: 24.07.2019 has volume, 'intermission', 'gossips', 'skill introduction', 'summary'
    //  for now it skips those, maybe do it with lookAheads in the rows or sth similar
    for (let i = 0; i < items.length; i++) {
        const newsRow = items.eq(i);

        const link = url.resolve(uri, newsRow.attr("href") as string);

        const episodeTitle = sanitizeString(newsRow.text());

        const regexResult = titleRegex.exec(episodeTitle);

        if (!regexResult) {
            logger.warn(`changed title format on novelFull: '${episodeTitle}': ` + uri);
            continue;
        }
        const partIndices = extractIndices(regexResult, 3, 4, 6);
        const episodeIndices = extractIndices(regexResult, 10, 11, 13);

        if (!episodeIndices) {
            throw Error(`title format changed on fullNovel, got no indices for '${episodeTitle}'`);
        }

        const episode = {
            combiIndex: episodeIndices.combi,
            totalIndex: episodeIndices.total,
            partialIndex: episodeIndices.fraction,
            url: link,
            title: episodeTitle
        } as TocEpisode;
        checkTocContent(episode);

        if (partIndices) {
            let part: TocPart | undefined = indexPartMap.get(partIndices.combi);

            if (!part) {
                part = {
                    episodes: [],
                    combiIndex: partIndices.combi,
                    totalIndex: partIndices.total,
                    partialIndex: partIndices.fraction,
                    title: "Vol." + partIndices.combi
                };
                checkTocContent(part, true);

                indexPartMap.set(partIndices.combi, part);
                content.push(part);
            }
            part.episodes.push(episode);
        } else {
            content.push(episode);
        }
    }
    return {
        link: "",
        content,
        title: mediumTitle,
        mediumType: MediaType.TEXT
    };
}

async function newsAdapter(): Promise<{ news?: News[], episodes?: EpisodeNews[] } | undefined> {
    const uri = "https://novelfull.com";
    const $ = await queueCheerioRequest(uri);
    const items = $("#list-index .list-new .row");

    const episodeNews: EpisodeNews[] = [];
    // some people just cant get it right to write 'Chapter' right so just allow a character error margin
    const titleRegex = /((ch(\.|a?.?p?.?t?.?e?.?r?.?)?)|-|^)\s*((\d+)(\.(\d+))?)/i;
    const abbrevTitleRegex = "|^)\\s*((\\d+)(\\.(\\d+))?)";

    for (let i = 0; i < items.length; i++) {
        const newsRow = items.eq(i);

        const mediumTitleElement = newsRow.find(".col-title a");
        const tocLink = url.resolve(uri, mediumTitleElement.attr("href") as string);
        const mediumTitle = sanitizeString(mediumTitleElement.text());

        const titleElement = newsRow.find(".col-chap a");
        const link = url.resolve(uri, titleElement.attr("href") as string);

        const episodeTitle = sanitizeString(titleElement.text());

        const timeStampElement = newsRow.find(".col-time");
        const date = relativeToAbsoluteTime(timeStampElement.text().trim());

        if (!date || date > new Date()) {
            logger.warn(`changed time format on novelFull: '${date}' from '${timeStampElement.text().trim()}': news`);
            continue;
        }
        let regexResult: string[] | null = titleRegex.exec(episodeTitle);
        if (!regexResult) {
            let abbrev = "";
            for (const word of mediumTitle.split(/[\W'´`’′‘]+/)) {
                if (word) {
                    abbrev += word[0];
                }
            }
            // workaround, as some titles have the abbreviation instead of chapter before the chapter index
            const match = episodeTitle.match(new RegExp(`(${abbrev}${abbrevTitleRegex}`, "i"));

            if (!abbrev || !match) {
                if (!episodeTitle.startsWith("Side")) {
                    logger.warn(`changed title format on novelFull: '${episodeTitle}': news`);
                }
                continue;
            }

            regexResult = [];
            regexResult[10] = match[2];
            regexResult[11] = match[3];
            regexResult[13] = match[5];
        }
        // const partIndices = extractIndices(regexResult, 3, 4, 6);
        const episodeIndices = extractIndices(regexResult, 4, 5, 7);

        if (!episodeIndices) {
            logger.warn(`changed title format on novelFull: '${episodeTitle}': news`);
            continue;
        }
        episodeNews.push({
            mediumTocLink: tocLink,
            mediumTitle,
            mediumType: MediaType.TEXT,
            // partIndex: partIndices && partIndices.combi || undefined,
            // partTotalIndex: partIndices && partIndices.total || undefined,
            // partPartialIndex: partIndices && partIndices.fraction || undefined,
            episodeTotalIndex: episodeIndices.total,
            episodePartialIndex: episodeIndices.fraction,
            episodeIndex: episodeIndices.combi,
            episodeTitle,
            link,
            date,
        });
    }
    return {episodes: episodeNews};
}

newsAdapter.link = "https://novelfull.com";
tocSearch.link = "https://novelfull.com";
tocSearch.medium = MediaType.TEXT;
tocSearch.blindSearch = true;
search.medium = MediaType.TEXT;

export function getHook(): Hook {
    return {
        name: "novelfull",
        medium: MediaType.TEXT,
        domainReg: /https?:\/\/novelfull\.com/,
        contentDownloadAdapter,
        tocAdapter: tocAdapterTooled,
        newsAdapter,
        tocSearchAdapter: tocSearch,
        searchAdapter: search
    };
}
