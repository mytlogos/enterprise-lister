import {EpisodeContent, Hook, Toc, TocEpisode, TocPart} from "../types";
import {EpisodeNews, News} from "../../types";
import * as url from "url";
import {queueCheerioRequest} from "../queueManager";
import logger from "../../logger";
import {extractIndices, MediaType, sanitizeString} from "../../tools";
import {checkTocContent} from "../scraperTools";

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
            console.log(`Unknown News Format: '${title}' for '${mediumTitle}'`);
            continue;
        }

        let episodeIndex;
        let episodeTotalIndex;
        let episodePartialIndex;
        let episodeTitle = "";

        if (groups[11]) {
            episodeTitle = sanitizeString(groups[11]);
        }

        if (groups[6]) {
            episodeIndex = Number(groups[6]);
            episodeTotalIndex = Number(groups[7]);
            episodePartialIndex = Number(groups[9]) || undefined;

            if (episodeTitle) {
                episodeTitle = `Ch. ${episodeIndex} - ` + episodeTitle;
            } else {
                episodeTitle = `Ch. ${episodeIndex}`;
            }
        } else {
            logger.info(`unknown news format on mangahasu: ${title}`);
            continue;
        }
        let partIndex;
        let partTotalIndex;
        let partPartialIndex;
        let partTitle;

        if (groups[2]) {
            partIndex = Number(groups[2]);
            partTitle = `Vol. ${partIndex}`;
            partTotalIndex = Number(groups[3]);
            partPartialIndex = Number(groups[5]) || undefined;
        }

        news.push({
            mediumTitle,
            mediumTocLink,
            mediumType: MediaType.IMAGE,
            episodeTitle,
            episodeIndex,
            episodeTotalIndex,
            episodePartialIndex,
            partIndex,
            partTotalIndex,
            partPartialIndex,
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
        logger.warn("chapter format changed on mangahasu, did not find any titles for content extraction");
        return [];
    }
    const chapReg = /Chapter\s*(\d+(\.\d+)?)(:\s*(.+))?/i;
    const exec = chapReg.exec(episodeTitle);

    if (!exec || !mediumTitle) {
        logger.warn("chapter format changed on mangahasu, did not find any titles for content extraction");
        return [];
    }
    const index = Number(exec[1]);
    const images = $(".img img");
    const imageUrls = [];
    const imageUrlReg = /^http:\/\/img\.mangahasu\.se\/.+\.\w+/;

    for (let i = 0; i < images.length; i++) {
        const imageElement = images.eq(i);
        const src = imageElement.attr("src");

        if (!src || !imageUrlReg.test(src)) {
            logger.warn("image link format changed on mangahasu");
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
    let hasVolumes;

    for (let i = 0; i < chapters.length; i++) {
        const chapterElement = chapters.eq(i);

        const timeString = chapterElement.find(".date-updated").text().trim();
        const time = new Date(timeString);

        if (!timeString || Number.isNaN(time.getTime())) {
            logger.warn("no time in title in mangahasu toc");
            return [];
        }
        const chapterTitleElement = chapterElement.find(".name");
        const chapterTitle = sanitizeString(chapterTitleElement.text());

        if (endReg.test(chapterTitle)) {
            toc.end = true;
        }
        const volChapGroups = volChapReg.exec(chapterTitle);
        const chapGroups = chapReg.exec(chapterTitle);

        if (i && !hasVolumes && volChapGroups && !chapGroups) {
            logger.warn("changed volume - chapter format on mangahasu toc: expected chapter, got volume");
        }

        if (i && hasVolumes && chapGroups && !volChapGroups) {
            logger.warn("changed volume - chapter format on mangahasu toc: expected volume, got chapter");
        }
        if (!i && volChapGroups) {
            hasVolumes = true;
        }

        if (volChapGroups) {
            const volIndices = extractIndices(volChapGroups, 1, 2, 4);

            if (!volIndices) {
                throw Error(`changed format on mangahasu, got no indices for: '${chapterTitle}'`);
            }

            const chapIndices = extractIndices(volChapGroups, 5, 6, 8);

            const link = url.resolve(uri, chapterTitleElement.find("a").first().attr("href"));

            if (!chapIndices) {
                logger.warn("changed episode format on mangaHasu toc: got no index");
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
            logger.warn("volume - chapter format changed on mangahasu: recognized neither of them");
            return [];
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

scrapeNews.link = "http://mangahasu.se/";

export function getHook(): Hook {
    return {
        domainReg: /^https?:\/\/mangahasu\.se/,
        newsAdapter: scrapeNews,
        contentDownloadAdapter,
        tocAdapter: scrapeToc
    };
}
