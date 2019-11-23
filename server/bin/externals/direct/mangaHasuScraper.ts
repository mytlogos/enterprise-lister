import {EpisodeContent, Hook, Toc, TocEpisode, TocPart} from "../types";
import {EpisodeNews, News, SearchResult, TocSearchMedium} from "../../types";
import * as url from "url";
import {queueCheerioRequest} from "../queueManager";
import logger from "../../logger";
import {equalsIgnore, extractIndices, MediaType, sanitizeString} from "../../tools";
import {checkTocContent} from "../scraperTools";
import {SearchResult as TocSearchResult, searchToc} from "./directTools";

async function scrapeNews(): Promise<{ news?: News[], episodes?: EpisodeNews[] } | undefined> {
    // todo scrape more than just the first page if there is an open end
    const baseUri = "http://mangahasu.se/";
    const $ = await queueCheerioRequest(baseUri + "latest-releases.html");
    const newsRows = $("ul.list_manga  .info-manga");

    const news: EpisodeNews[] = [];
    const titlePattern = /(vol\s*((\d+)(\.(\d+))?))?\s*chapter\s*((\d+)(\.(\d+))?)(\s*:\s*(.+))?/i;

    for (let i = 0; i < newsRows.length; i++) {
        const newsRow = newsRows.eq(i);

        const children = newsRow.children("a");

        const mediumElement = children.eq(0);
        const titleElement = children.eq(1);
        const link = url.resolve(baseUri, titleElement.attr("href"));
        const mediumTocLink = url.resolve(baseUri, mediumElement.attr("href"));
        const mediumTitle = sanitizeString(mediumElement.text());
        const title = sanitizeString(titleElement.text());

        // ignore oneshots, they are not 'interesting' enough, e.g. too short
        if (title === "Oneshot") {
            continue;
        }

        const groups = titlePattern.exec(title);

        if (!groups) {
            console.log(`Unknown News Format on mangahasu: '${title}' for '${mediumTitle}'`);
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
                logger.warn("unknown news title format on mangahasu: " + episodeTitle);
                continue;
            }

            if (episodeTitle) {
                episodeTitle = `Ch. ${episodeIndices.combi} - ` + episodeTitle;
            } else {
                episodeTitle = `Ch. ${episodeIndices.combi}`;
            }
        } else {
            logger.info(`unknown news format on mangahasu: ${title}`);
            continue;
        }
        let partIndices;
        let partTitle;

        if (groups[2]) {
            partIndices = extractIndices(groups, 2, 3, 5);

            if (!partIndices) {
                logger.warn("unknown news title format on mangahasu: " + episodeTitle);
                continue;
            }
            partTitle = `Vol. ${partIndices.combi}`;
        }

        news.push({
            mediumTitle,
            mediumTocLink,
            mediumType: MediaType.IMAGE,
            episodeTitle,
            episodeIndex: episodeIndices.combi,
            episodeTotalIndex: episodeIndices.total,
            episodePartialIndex: episodeIndices.fraction,
            partIndex: partIndices ? partIndices.combi : undefined,
            partTotalIndex: partIndices ? partIndices.total : undefined,
            partPartialIndex: partIndices ? partIndices.fraction : undefined,
            link,
            date: new Date()
        });
    }
    if (!news.length) {
        return {};
    }

    // if there is an open end, just pretend as if every 15 min one release happened
    for (let i = 0; i < news.length; i++) {
        const date = news[i].date;
        date.setMinutes(date.getMinutes() - i * 15);
    }
    return {episodes: news};
}

async function contentDownloadAdapter(chapterLink: string): Promise<EpisodeContent[]> {
    const $ = await queueCheerioRequest(chapterLink);
    const mediumTitleElement = $(".breadcrumb li:nth-child(2) a");
    const titleElement = $(".breadcrumb span");

    const episodeTitle = sanitizeString(titleElement.text());
    const mediumTitle = sanitizeString(mediumTitleElement.text());

    if (!episodeTitle || !mediumTitle) {
        logger.warn("chapter format changed on mangahasu, did not find any titles for content extraction: " + chapterLink);
        return [];
    }
    const chapReg = /Chapter\s*(\d+(\.\d+)?)(:\s*(.+))?/i;
    const exec = chapReg.exec(episodeTitle);

    if (!exec || !mediumTitle) {
        logger.warn("chapter format changed on mangahasu, did not find any titles for content extraction: " + chapterLink);
        return [];
    }
    const index = Number(exec[1]);
    const images = $(".img img");
    const imageUrls = [];
    const imageUrlReg = /\.(jpg|png)$/;

    for (let i = 0; i < images.length; i++) {
        const imageElement = images.eq(i);
        const src = imageElement.attr("src");

        if (!src || !imageUrlReg.test(src)) {
            logger.warn("image link format changed on mangahasu: " + chapterLink);
            return [];
        }
        imageUrls.push(src);
    }
    const episodeContent: EpisodeContent = {
        content: imageUrls,
        episodeTitle,
        index,
        mediumTitle
    };
    return [episodeContent];
}

async function scrapeToc(urlString: string): Promise<Toc[]> {
    if (!/http:\/\/mangahasu\.se\/[^/]+\.html/.test(urlString)) {
        logger.info("not a toc link for mangahasu: " + urlString);
        return [];
    }
    const $ = await queueCheerioRequest(urlString);
    const contentElement = $(".wrapper_content");
    const mangaTitle = sanitizeString(contentElement.find(".info-title h1").first().text());
    // todo process metadata and get more (like author)

    const chapters = contentElement.find(".list-chapter tbody > tr");

    if (!chapters.length) {
        logger.warn("toc link with no chapters: " + urlString);
        return [];
    }
    if (!mangaTitle) {
        logger.warn("toc link with no novel title: " + urlString);
        return [];
    }
    const uri = "http://mangahasu.se/";

    const partContents: TocPart[] = [];
    const indexPartMap: Map<number, TocPart> = new Map();
    const chapterContents: TocEpisode[] = [];

    const toc: Toc = {
        link: urlString,
        content: [],
        title: mangaTitle,
        mediumType: MediaType.IMAGE
    };

    const endReg = /\[END]\s*$/i;
    const volChapReg = /Vol\.?\s*((\d+)(\.(\d+))?)\s*Chapter\s*((\d+)(\.(\d+))?)(:\s*(.+))?/i;
    const chapReg = /Chapter\s*((\d+)(\.(\d+))?)(:\s*(.+))?/i;

    for (let i = 0; i < chapters.length; i++) {
        const chapterElement = chapters.eq(i);

        const timeString = chapterElement.find(".date-updated").text().trim();
        const time = new Date(timeString);

        if (!timeString || Number.isNaN(time.getTime())) {
            logger.warn("no time in title in mangahasu toc: " + urlString);
            return [];
        }
        const chapterTitleElement = chapterElement.find(".name");
        const chapterTitle = sanitizeString(chapterTitleElement.text());

        if (endReg.test(chapterTitle)) {
            toc.end = true;
        }
        const volChapGroups = volChapReg.exec(chapterTitle);
        const chapGroups = chapReg.exec(chapterTitle);

        if (volChapGroups) {
            const volIndices = extractIndices(volChapGroups, 1, 2, 4);

            if (!volIndices) {
                throw Error(`changed format on mangahasu, got no indices for: '${chapterTitle}'`);
            }

            const chapIndices = extractIndices(volChapGroups, 5, 6, 8);

            const link = url.resolve(uri, chapterTitleElement.find("a").first().attr("href"));

            if (!chapIndices) {
                logger.warn("changed episode format on mangaHasu toc: got no index " + urlString);
                return [];
            }
            let title = "Chapter " + chapIndices.combi;

            if (volChapGroups[10]) {
                title += " - " + volChapGroups[10];
            }
            let part: TocPart | undefined = indexPartMap.get(volIndices.combi);

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
                partContents.push(part);
            }

            const episodeContent = {
                title,
                combiIndex: chapIndices.combi,
                totalIndex: chapIndices.total,
                partialIndex: chapIndices.fraction,
                url: link,
                releaseDate: time
            };
            checkTocContent(episodeContent);
            part.episodes.push(episodeContent);
        } else if (chapGroups) {
            const chapIndices = extractIndices(chapGroups, 1, 2, 4);

            if (!chapIndices) {
                throw Error(`changed format on mangahasu, got no indices for: '${chapterTitle}'`);
            }
            const link = url.resolve(uri, chapterTitleElement.find("a").first().attr("href"));

            let title = "Chapter " + chapIndices.combi;

            if (chapGroups[6]) {
                title += " - " + chapGroups[6];
            }

            chapterContents.push({
                title,
                combiIndex: chapIndices.combi,
                totalIndex: chapIndices.total,
                partialIndex: chapIndices.fraction,
                url: link,
                releaseDate: time
            });
        } else {
            logger.warn(
                "volume - chapter format changed on mangahasu: recognized neither of them: "
                + chapterTitle + " on " + urlString
            );
        }
    }
    partContents.forEach((value) => {
        if (value) {
            toc.content.push(value);
        }
    });

    toc.content.push(...chapterContents);
    return [toc];
}

async function tocSearchAdapter(searchMedium: TocSearchMedium): Promise<Toc | undefined> {
    return searchToc(
        searchMedium,
        scrapeToc,
        "https://mangahasu.se/",
        (searchString) => scrapeSearch(searchString, searchMedium)
    );
}

async function scrapeSearch(searchWords: string, medium: TocSearchMedium): Promise<TocSearchResult> {
    const urlString = "http://mangahasu.se/search/autosearch";

    const body = "key=" + searchWords;
    // TODO: 26.08.2019 this does not work for any reason
    const $ = await queueCheerioRequest(urlString, {
        url: urlString,
        headers: {
            "Host": "mangahasu.se",
            "Content-Type": "application/x-www-form-urlencoded"
        },
        method: "POST",
        body
    });

    const links = $("a.a-item");

    if (!links.length) {
        return {done: true};
    }
    for (let i = 0; i < links.length; i++) {
        const linkElement = links.eq(i);

        const titleElement = linkElement.find(".name");
        const text = sanitizeString(titleElement.text());

        if (equalsIgnore(text, medium.title) || medium.synonyms.some((s) => equalsIgnore(text, s))) {
            const tocLink = linkElement.attr("href");
            return {value: tocLink, done: true};
        }
    }

    return {done: false};
}

async function search(searchWords: string): Promise<SearchResult[]> {
    const urlString = "http://mangahasu.se/search/autosearch";

    const body = "key=" + searchWords;
    // TODO: 26.08.2019 this does not work for any reason
    const $ = await queueCheerioRequest(urlString, {
        url: urlString,
        headers: {
            "Host": "mangahasu.se",
            "Content-Type": "application/x-www-form-urlencoded"
        },
        method: "POST",
        body
    });
    const searchResults: SearchResult[] = [];
    const links = $("a.a-item");

    if (!links.length) {
        return searchResults;
    }
    for (let i = 0; i < links.length; i++) {
        const linkElement = links.eq(i);

        const titleElement = linkElement.find(".name");
        const authorElement = linkElement.find(".author");
        const coverElement = linkElement.find("img");

        const text = sanitizeString(titleElement.text());
        const link = url.resolve("http://mangahasu.se/", linkElement.attr("href"));
        const author = sanitizeString(authorElement.text());
        const coverLink = coverElement.attr("src");

        searchResults.push({coverUrl: coverLink, author, link, title: text});
    }

    return searchResults;
}

scrapeNews.link = "http://mangahasu.se/";
tocSearchAdapter.link = "http://mangahasu.se/";
tocSearchAdapter.medium = MediaType.IMAGE;
tocSearchAdapter.blindSearch = true;
search.medium = MediaType.IMAGE;

export function getHook(): Hook {
    return {
        name: "mangahasu",
        medium: MediaType.IMAGE,
        domainReg: /^https?:\/\/mangahasu\.se/,
        newsAdapter: scrapeNews,
        contentDownloadAdapter,
        tocSearchAdapter,
        tocAdapter: scrapeToc,
        searchAdapter: search
    };
}
