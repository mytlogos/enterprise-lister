import {EpisodeContent, Hook, Toc, TocEpisode, TocPart} from "../types";
import {EpisodeContentData, EpisodeNews, News} from "../../types";
import * as url from "url";
import {queueCheerioRequest, queueRequest} from "../queueManager";
import logger from "../../logger";
import {extractIndices, MediaType, sanitizeString} from "../../tools";
import * as request from "request";
import {checkTocContent} from "../scraperTools";
import {episodeStorage} from "../../database/storages/storage";
import {MissingResourceError, UrlError} from "../errors";

const jar = request.jar();
jar.setCookie(
    `mangadex_filter_langs=1; expires=Sun, 16 Jul 2119 18:59:17 GMT; domain=mangadex.org;`,
    "https://mangadex.org/",
    {secure: false}
);

function loadJson(urlString: string): Promise<any> {
    return queueRequest(urlString).then((body) => JSON.parse(body));
}

interface ChapterResponse {
    id: number;
    timestamp: number;
    hash: string;
    volume: string;
    chapter: string;
    title: string;
    lang_name: string;
    lang_code: string;
    manga_id: number;
    group_id: number;
    group_id_2: number;
    group_id_3: number;
    comments: null | string;
    server: string;
    page_array: string[];
    long_strip: number;
    status: string;
}

interface ChapterTocResponse {
    manga: MangaChapter;
    chapter: { [key: string]: ChapterChapterItem };
    status: string;
}

interface MangaChapter {
    cover_url: string;
    description: string;
    title: string;
    artist: string;
    author: string;
    status: number;
    genre: number[];
    last_chapter: string;
    lang_name: string;
    lang_flag: string;
    hentai: number;
    links: { mu: string, mal: string };
}

interface ChapterChapterItem {
    volume: string;
    chapter: string;
    title: string;
    lang_code: string;
    group_id: string;
    group_name: string;
    group_id_2: number;
    group_name_2: null | string;
    group_id_3: number;
    group_name_3: null | string;
    timestamp: number;
}

async function contentDownloadAdapter(chapterLink: string): Promise<EpisodeContent[]> {
    const linkReg = /^https:\/\/mangadex\.org\/chapter\/(\d+)/;
    const exec = linkReg.exec(chapterLink);
    if (!exec) {
        logger.warn("changed chapter link format on mangadex for " + chapterLink);
        return [];
    }
    const chapterId = exec[1];
    const urlString = `https://mangadex.org/api/?id=${chapterId}&server=null&type=chapter`;
    const jsonPromise: Promise<any> = loadJson(urlString);
    const contentData: EpisodeContentData = await episodeStorage.getEpisodeContent(chapterLink);

    if (!contentData.mediumTitle || !contentData.episodeTitle || contentData.index == null) {
        logger.warn(
            "incoherent data, did not find any release with given url link, " +
            "which has a title, index and mediumTitle on: " + urlString
        );
        return [];
    }
    let jsonResponse: any;
    try {
        jsonResponse = await jsonPromise;
    } catch (e) {
        if (e.statusCode && e.statusCode === 409) {
            return [{
                content: [],
                episodeTitle: contentData.episodeTitle,
                index: contentData.index,
                mediumTitle: contentData.mediumTitle
            } as EpisodeContent];
        } else {
            throw e;
        }
    }

    if (jsonResponse.status !== "OK" || !jsonResponse.hash || !jsonResponse.page_array.length) {
        logger.warn("changed chapter api format on mangadex " + urlString);
        return [];
    }
    const imageUrls = [];
    for (const imageKey of jsonResponse.page_array) {
        let server = jsonResponse.server;
        if (!server.startsWith("http")) {
            server = "https://mangadex.org" + server;
        }
        imageUrls.push(`${server}${jsonResponse.hash}/${imageKey}`);
    }
    const episodeContent: EpisodeContent = {
        content: imageUrls,
        episodeTitle: contentData.episodeTitle,
        index: contentData.index,
        mediumTitle: contentData.mediumTitle
    };
    return [episodeContent];
}


async function scrapeNews(): Promise<{ news?: News[], episodes?: EpisodeNews[] } | undefined> {
    // TODO: 19.07.2019 set the cookie 'mangadex_filter_langs:"1"'
    //  with expiration date somewhere in 100 years to lessen load

    const uri = "https://mangadex.org/";
    const requestLink = uri + "updates";
    const $ = await queueCheerioRequest(requestLink, {jar, uri: requestLink});
    const newsRows = $(".table tbody tr");

    const episodeNews: EpisodeNews[] = [];
    let currentMedium = "";
    let currentMediumLink = "";

    const titlePattern = /(vol\.\s*((\d+)(\.(\d+))?))?\s*ch\.\s*((\d+)(\.(\d+))?)(\s*-\s*(.+))?/i;

    for (let i = 0; i < newsRows.length; i++) {
        const newsRow = newsRows.eq(i);

        if (!newsRow.has(".flag").length) {
            const mediumLinkElement = newsRow.find("a.manga_title");
            currentMediumLink = url.resolve(uri, mediumLinkElement.attr("href") as string);
            currentMedium = sanitizeString(mediumLinkElement.text());
            continue;
        }

        if (!currentMedium) {
            throw Error("episode without medium");
        }
        const children = newsRow.children("td");

        // ignore manga which are not english
        if (!children.eq(2).children(".flag-gb").length) {
            continue;
        }
        const titleElement = children.eq(1);
        const link = url.resolve(uri, titleElement.children("a").attr("href") as string);
        const title = sanitizeString(titleElement.text());

        // ignore oneshots, they are not 'interesting' enough, e.g. too short
        if (title === "Oneshot") {
            continue;
        }

        const timeStampElement = children.eq(6).children("time").first();
        const date = new Date(timeStampElement.attr("datetime") as string);

        const groups = titlePattern.exec(title);

        if (!groups) {
            logger.warn(`Unknown News Format on mangadex: '${title}' for '${currentMedium}'`);
            continue;
        }

        let episodeIndices;
        let episodeTitle = "";

        if (groups[11]) {
            episodeTitle = sanitizeString(groups[11]);
        }

        if (groups[6]) {
            episodeIndices = extractIndices(groups, 6, 7, 9);

            if (!episodeIndices) {
                logger.info(`unknown news format on mangadex: ${title}`);
                continue;
            }

            if (episodeTitle) {
                episodeTitle = `Ch. ${episodeIndices.combi} - ` + episodeTitle;
            } else {
                episodeTitle = `Ch. ${episodeIndices.combi}`;
            }
        } else {
            logger.info(`unknown news format on mangadex: ${title}`);
            continue;
        }
        let partIndices;
        let partTitle;

        if (groups[2]) {
            partIndices = extractIndices(groups, 2, 3, 5);

            if (!partIndices) {
                logger.info(`unknown news format on mangadex: ${title}`);
                continue;
            }

            partTitle = `Vol. ${partIndices.combi}`;
        }
        episodeNews.push({
            mediumTitle: currentMedium,
            mediumTocLink: currentMediumLink,
            mediumType: MediaType.IMAGE,
            episodeTitle: title,
            episodeIndex: episodeIndices.combi,
            episodeTotalIndex: episodeIndices.total,
            episodePartialIndex: episodeIndices.fraction,
            partIndex: partIndices ? partIndices.combi : undefined,
            partTotalIndex: partIndices ? partIndices.total : undefined,
            partPartialIndex: partIndices ? partIndices.fraction : undefined,
            link,
            date
        });
    }
    return {episodes: episodeNews};
}

async function scrapeToc(urlString: string): Promise<Toc[]> {
    const urlRegex = /^https?:\/\/mangadex\.org\/title\/\d+\/[^\/]+\/?$/;

    if (!urlRegex.test(urlString)) {
        throw new UrlError("invalid toc url for MangaDex: " + urlString, urlString);
    }
    const uri = "https://mangadex.org/";

    const indexPartMap: Map<number, TocPart> = new Map();

    const toc: Toc = {
        link: urlString,
        content: [],
        title: "",
        mediumType: MediaType.IMAGE,
    };

    // todo process these metadata and get more (like author)
    // const alternateMangaTitles = metaRows.eq(0).find("li");
    // const mangaStatus = metaRows.eq(8).find(".col-lg-9.col-xl-10").first();

    const endReg = /^END$/i;
    const volChapReg = /^\s*Vol\.?\s*((\d+)(\.(\d+))?)\s*Ch\.?\s*((\d+)(\.(\d+))?)\s*((-\s*)?(.+))?/i;
    const chapReg = /^\s*Ch\.?\s*((\d+)(\.(\d+))?)\s*((-\s*)?(.+))?/i;

    if (await scrapeTocPage(toc, endReg, volChapReg, chapReg, indexPartMap, uri, urlString)) {
        return [];
    }

    toc.content = toc.content.filter((value) => value);
    return [toc];
}

async function scrapeTocPage(toc: Toc, endReg: RegExp, volChapReg: RegExp, chapReg: RegExp,
                             indexPartMap: Map<number, TocPart>, uri: string, urlString: string): Promise<boolean> {
    const $ = await queueCheerioRequest(urlString);
    const contentElement = $("#content");
    if (contentElement.find(".alert-danger").text().match(/Manga .+? (not available)|(does not exist)/i)) {
        throw new MissingResourceError("Missing ToC on MangaDex", urlString);
    }
    const mangaTitle = sanitizeString(contentElement.find("h6.card-header").first().text());
    // const metaRows = contentElement.find(".col-xl-9.col-lg-8.col-md-7 > .row");
    if (!mangaTitle) {
        logger.warn("toc link with no novel title: " + urlString);
        return true;
    }

    toc.title = mangaTitle;
    const ignoreTitles = /(oneshot)|(special.+chapter)/i;

    const chapters = contentElement.find(".chapter-container .chapter-row");

    if (!chapters.length) {
        logger.warn("toc link with no chapters: " + urlString);
        return true;
    }

    for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters.eq(i);

        if (!chapter.has(".flag-gb").length) {
            continue;
        }
        const columns = chapter.children();
        const timeString = columns.eq(3).attr("title") as string;
        const time = new Date(timeString);

        if (!timeString || Number.isNaN(time.getTime())) {
            logger.warn("no time in title in mangadex toc for " + urlString);
            return true;
        }
        const chapterTitleElement = columns.eq(1);
        const endBadgeElement = chapterTitleElement.find(".badge").first().remove();

        if (endBadgeElement.length && endReg.test(sanitizeString(endBadgeElement.text()))) {
            toc.end = true;
        }
        const chapterTitle = sanitizeString(chapterTitleElement.text());
        const volChapGroups = volChapReg.exec(chapterTitle);
        const chapGroups = chapReg.exec(chapterTitle);

        if (volChapGroups) {
            const volIndices = extractIndices(volChapGroups, 1, 2, 4);

            if (!volIndices) {
                throw Error(`changed format on mangadex, got no indices for: '${chapterTitle}'`);
            }

            const chapIndices = extractIndices(volChapGroups, 5, 6, 8);

            const link = url.resolve(uri, chapterTitleElement.find("a").first().attr("href") as string);

            let part: TocPart | undefined = indexPartMap.get(volIndices.combi);


            if (!chapIndices) {
                logger.warn("changed episode format on mangadex toc: got no index " + urlString);
                return true;
            }
            const title = `Chapter ${chapIndices.combi}${volChapGroups[9] ? " - " + volChapGroups[11] : ""}`;

            if (!part) {
                part = {
                    episodes: [],
                    combiIndex: volIndices.combi,
                    totalIndex: volIndices.total,
                    partialIndex: volIndices.fraction,
                    title: "Vol." + volIndices.combi
                };
                checkTocContent(part, true);
                indexPartMap.set(volIndices.combi, part);
                toc.content.push(part);
            }
            const chapterContent = {
                title,
                combiIndex: chapIndices.combi,
                totalIndex: chapIndices.total,
                partialIndex: chapIndices.fraction,
                url: link,
                releaseDate: time
            };
            checkTocContent(chapterContent);
            part.episodes.push(chapterContent);
        } else if (chapGroups) {
            const chapIndices = extractIndices(chapGroups, 1, 2, 4);

            if (!chapIndices) {
                throw Error(`changed format on mangadex, got no indices for: '${chapterTitle}'`);
            }
            const link = url.resolve(uri, chapterTitleElement.find("a").first().attr("href") as string);

            const title = `Chapter ${chapIndices.combi}${chapGroups[5] ? " - " + chapGroups[7] : ""}`;

            const chapterContent = {
                title,
                combiIndex: chapIndices.combi,
                totalIndex: chapIndices.total,
                partialIndex: chapIndices.fraction,
                url: link,
                releaseDate: time
            } as TocEpisode;
            checkTocContent(chapterContent);
            toc.content.push(chapterContent);
        } else {
            if (chapterTitle.match(ignoreTitles)) {
                continue;
            }
            logger.warn(`volume - chapter format changed on mangadex: recognized neither of them: '${chapterTitle}', ${urlString}`);
            return true;
        }
    }
    const nextPaging = $(".page-item:last-child:not(.disabled)");

    if (nextPaging.length) {
        const link = nextPaging.find("a").attr("href") as string;
        const nextPage = url.resolve(uri, link);
        return scrapeTocPage(toc, endReg, volChapReg, chapReg, indexPartMap, uri, nextPage);
    }
    return false;
}

scrapeNews.link = "https://mangadex.org/";

export function getHook(): Hook {
    return {
        name: "mangadex",
        medium: MediaType.IMAGE,
        domainReg: /^https?:\/\/mangadex\.org/,
        contentDownloadAdapter,
        newsAdapter: scrapeNews,
        tocAdapter: scrapeToc
    };
}
