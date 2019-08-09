import {EpisodeContent, Hook, Toc, TocContent, TocEpisode} from "../types";
import {EpisodeNews, News, TocSearchMedium} from "../../types";
import {queueCheerioRequest} from "../queueManager";
import * as url from "url";
import {extractIndices, MediaType, relativeToAbsoluteTime, sanitizeString} from "../../tools";
import logger from "../../logger";
import {getTextContent} from "./directTools";
import {checkTocContent} from "../scraperTools";

async function tocSearch(medium: TocSearchMedium): Promise<Toc | undefined> {
    return;
}

async function contentDownloadAdapter(urlString: string): Promise<EpisodeContent[]> {
    if (!urlString.match(/https:\/\/boxnovel\.com\/novel\/.+\/chapter-.+/)) {
        return [];
    }

    const $ = await queueCheerioRequest(urlString);
    const mediumTitleElement = $("ol.breadcrumb li:nth-child(2) a");
    const novelTitle = sanitizeString(mediumTitleElement.text());

    const episodeTitle = sanitizeString($(".cha-tit h3").text());
    const directContentElement = $(".cha-content .cha-words .cha-words");

    const content = directContentElement.html();

    if (!content) {
        return [];
    }

    return getTextContent(novelTitle, episodeTitle, urlString, content);
}

async function tocAdapter(tocLink: string): Promise<Toc[]> {
    const uri = "https://boxnovel.com";

    if (!tocLink.startsWith("https://boxnovel.com/novel/")) {
        return [];
    }
    const $ = await queueCheerioRequest(tocLink);

    const mediumTitleElement = $(".post-title h3");
    mediumTitleElement.find("span").remove();
    const mediumTitle = sanitizeString(mediumTitleElement.text());

    const content: TocContent[] = [];
    const items = $(".wp-manga-chapter");

    const titleRegex = /ch(\.|apter)?\s*((\d+)(\.(\d+))?)/i;

    for (let i = 0; i < items.length; i++) {
        const newsRow = items.eq(i);

        const titleElement = newsRow.find("a");
        const link = url.resolve(uri, titleElement.attr("href"));

        const episodeTitle = sanitizeString(titleElement.text());

        const timeStampElement = newsRow.find(".chapter-release-date");
        const dateString = timeStampElement.text().trim();
        const lowerDate = dateString.toLowerCase();

        let date;
        if (lowerDate.includes("now") || lowerDate.includes("ago")) {
            date = relativeToAbsoluteTime(dateString);
        } else {
            date = new Date(dateString);
        }

        if (!date || date > new Date()) {
            logger.warn("changed time format on boxNovel");
            return [];
        }
        const regexResult = titleRegex.exec(episodeTitle);

        if (!regexResult) {
            logger.warn("changed title format on boxNovel");
            return [];
        }
        const episodeIndices = extractIndices(regexResult, 2, 3, 5);


        if (!episodeIndices) {
            throw Error(`title format changed on boxNovel, got no indices for '${episodeTitle}'`);
        }
        const chapterContent = {
            combiIndex: episodeIndices.combi,
            totalIndex: episodeIndices.total,
            partialIndex: episodeIndices.fraction,
            url: link,
            releaseDate: date,
            title: episodeTitle
        } as TocEpisode;
        checkTocContent(chapterContent);
        content.push(chapterContent);
    }
    return [{
        link: tocLink,
        content,
        title: mediumTitle,
        mediumType: MediaType.TEXT
    }];
}

async function newsAdapter(): Promise<{ news?: News[], episodes?: EpisodeNews[] } | undefined> {
    const uri = "https://boxnovel.com";
    const $ = await queueCheerioRequest(uri);
    const items = $(".page-item-detail");

    const episodeNews: EpisodeNews[] = [];
    const titleRegex = /(vol(\.|ume)?\s*((\d+)(\.(\d+))?).+)?ch(\.|apter)?\s*((\d+)(\.(\d+))?)/i;

    for (let i = 0; i < items.length; i++) {
        const newsRow = items.eq(i);

        const mediumTitleElement = newsRow.find(".post-title a");
        const tocLink = url.resolve(uri, mediumTitleElement.attr("href"));
        const mediumTitle = sanitizeString(mediumTitleElement.text());

        const titleElement = newsRow.find(".chapter-item .chapter a");
        const timeElements = newsRow.find(".chapter-item .post-on");

        for (let j = 0; j < titleElement.length; j++) {
            const chapterTitleElement = titleElement.eq(j);
            const link = url.resolve(uri, chapterTitleElement.attr("href"));

            const episodeTitle = sanitizeString(chapterTitleElement.text());
            const timeStampElement = timeElements.eq(j);
            const dateString = timeStampElement.text().trim();
            const lowerDate = dateString.toLowerCase();

            let date: Date | null;

            if (lowerDate.includes("now") || lowerDate.includes("ago")) {
                date = relativeToAbsoluteTime(dateString);
            } else {
                date = new Date(dateString);
            }

            if (!date || date > new Date()) {
                logger.warn("changed time format on boxNovel");
                return;
            }
            const regexResult = titleRegex.exec(episodeTitle);
            if (!regexResult) {
                logger.warn("changed title format on boxNovel");
                return;
            }
            let partIndex;
            let partTotalIndex;
            let partPartialIndex;

            if (regexResult[3]) {
                partIndex = Number(regexResult[3]);

                if (regexResult[4]) {
                    partTotalIndex = Number(regexResult[4]);
                }
                if (regexResult[6]) {
                    partPartialIndex = Number(regexResult[6]) || undefined;
                }
            }
            let episodeIndex;
            let episodeTotalIndex;
            let episodePartialIndex;

            if (regexResult[8]) {
                episodeIndex = Number(regexResult[8]);

                if (regexResult[9]) {
                    episodeTotalIndex = Number(regexResult[9]);
                }
                if (regexResult[11]) {
                    episodePartialIndex = Number(regexResult[11]) || undefined;
                }
            }
            if (episodeIndex == null || episodeTotalIndex == null) {
                logger.warn("changed title format on boxNovel");
                return;
            }
            episodeNews.push({
                mediumTocLink: tocLink,
                mediumTitle,
                mediumType: MediaType.TEXT,
                partIndex,
                partTotalIndex,
                partPartialIndex,
                episodeTotalIndex,
                episodePartialIndex,
                episodeIndex,
                episodeTitle,
                link,
                date,
            });
        }
    }
    return {episodes: episodeNews};
}

newsAdapter.link = "https://boxnovel.com";

export function getHook(): Hook {
    return {
        domainReg: /https:\/\/boxnovel\.com/,
        contentDownloadAdapter,
        tocAdapter,
        newsAdapter,
    };
}
