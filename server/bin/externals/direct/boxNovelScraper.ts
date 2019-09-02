import {EpisodeContent, Hook, Toc, TocContent, TocEpisode} from "../types";
import {EpisodeNews, News, TocSearchMedium} from "../../types";
import {queueCheerioRequest, queueRequest} from "../queueManager";
import * as url from "url";
import {equalsIgnore, extractIndices, MediaType, relativeToAbsoluteTime, sanitizeString} from "../../tools";
import logger from "../../logger";
import {getTextContent, searchToc} from "./directTools";
import {checkTocContent} from "../scraperTools";

interface NovelSearchResponse {
    success: boolean;
    data: NovelSearchData[];
}

interface NovelSearchData {
    title: string;
    url: string;
}

async function tocSearch(medium: TocSearchMedium): Promise<Toc | undefined> {
    return searchToc(
        medium,
        tocAdapter,
        "https://boxnovel.com/",
        (parameter) => `https://boxnovel.com/?s=${parameter}&post_type=wp-manga`,
        ".post-title a"
    );
}

async function searchAjax(searchWords: string, medium: TocSearchMedium) {
    const urlString = "https://boxnovel.com/wp-admin/admin-ajax.php";
    let response: string;
    // TODO: 19.08.2019 this may work, forgot to set http method before
    // TODO: 26.08.2019 this does not work for any reason
    try {
        const body = "action=wp-manga-search-mangatitle=" + searchWords;
        response = await queueRequest(urlString, {
            url: urlString,
            headers: {
                "Content-Length": body.length,
                "Accept": "*/*",
                "Content-Type": "application/x-www-form-urlencoded"
            },
            method: "POST",
            body
        });
    } catch (e) {
        console.log(e);
        return;
    }
    const parsed: NovelSearchResponse = JSON.parse(response);

    if (parsed.success && parsed.data && parsed.data.length) {
        const foundItem = parsed.data.find((value) =>
            equalsIgnore(value.title, medium.title)
            || medium.synonyms.some((s) => equalsIgnore(value.title, s))
        );
        if (foundItem) {
            return foundItem.url;
        }
    }
}

async function contentDownloadAdapter(urlString: string): Promise<EpisodeContent[]> {
    if (!urlString.match(/https:\/\/boxnovel\.com\/novel\/.+\/chapter-.+/)) {
        return [];
    }

    const $ = await queueCheerioRequest(urlString);
    const mediumTitleElement = $("ol.breadcrumb li:nth-child(2) a");
    const novelTitle = sanitizeString(mediumTitleElement.text());

    const chaTit = $(".cha-tit h3");
    let directContentElement: Cheerio;
    let episodeTitle: string;

    if (chaTit.length) {
        directContentElement = $(".cha-content .cha-words");
        const firstChild = directContentElement.children().first();

        if (firstChild.is(".cha-words")) {
            directContentElement = firstChild;
        }
        episodeTitle = sanitizeString(chaTit.text());
    } else {
        const entryTitle = $("h1.entry-title").remove();

        if (!entryTitle.length) {
            const currentChapter = $("option[selected]").first();

            if (!currentChapter.length) {
                logger.warn("changed title format for chapters on boxNovel for " + urlString);
                return [];
            }
            episodeTitle = sanitizeString(currentChapter.text());
        } else {
            episodeTitle = sanitizeString(entryTitle.text());
        }
        directContentElement = $(".reading-content");
    }

    const content = directContentElement.html();

    if (!content) {
        logger.warn("changed content format for chapters on boxNovel: " + urlString);
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

    const titleRegex = /ch(\.|a?.?p?.?t?.?e?.?r?.?)?\s*((\d+)(\.(\d+))?)/i;
    const linkRegex = /ch(\.|a?.?p?.?t?.?e?.?r?.?)?-((\d+)(\.(\d+))?)/i;
    let end;
    for (let i = 0; i < items.length; i++) {
        const newsRow = items.eq(i);

        const titleElement = newsRow.find("a");
        const link = url.resolve(uri, titleElement.attr("href"));

        let episodeTitle = sanitizeString(titleElement.text());

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
            logger.warn("changed time format on boxNovel: " + tocLink);
            return [];
        }
        let regexResult = titleRegex.exec(episodeTitle);

        if (!regexResult) {
            regexResult = linkRegex.exec(link);

            if (!regexResult) {
                const lowerTitle = episodeTitle.toLowerCase();
                // for now just skip all these extra chapters
                if (lowerTitle.startsWith("extra")) {
                    continue;
                }
                logger.warn("changed title format on boxNovel: " + tocLink);
                return [];
            }
        } else if (regexResult.index) {
            const titleIndices = extractIndices(regexResult, 2, 3, 5);
            const linkRegexResult = linkRegex.exec(link);

            if (linkRegexResult) {
                const linkIndices = extractIndices(linkRegexResult, 2, 3, 5);

                if (linkIndices && titleIndices && linkIndices.combi > titleIndices.combi) {
                    regexResult = linkRegexResult;
                    const partialIndexPart = linkIndices.fraction ? "." + linkIndices.fraction : "";
                    episodeTitle = `Chapter ${linkIndices.total}${partialIndexPart} ${episodeTitle}`;
                }
            }
        }
        const episodeIndices = extractIndices(regexResult, 2, 3, 5);

        if (episodeTitle.endsWith("(END)")) {
            end = true;
        }

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
        end,
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
                logger.warn("changed time format on boxNovel: news");
                return;
            }
            const regexResult = titleRegex.exec(episodeTitle);
            if (!regexResult) {
                logger.warn("changed title format on boxNovel: news");
                return;
            }
            let partIndices;

            if (regexResult[3]) {
                partIndices = extractIndices(regexResult, 3, 4, 6);

                if (!partIndices) {
                    logger.info(`unknown news format on boxnovel: ${episodeTitle}`);
                    continue;
                }
            }
            let episodeIndices;

            if (regexResult[8]) {
                episodeIndices = extractIndices(regexResult, 8, 9, 11);

                if (!episodeIndices) {
                    logger.info(`unknown news format on boxnovel: ${episodeTitle}`);
                    continue;
                }
            }
            if (episodeIndices == null || episodeIndices.combi == null) {
                logger.warn("changed title format on boxNovel: news");
                return;
            }
            episodeNews.push({
                mediumTocLink: tocLink,
                mediumTitle,
                mediumType: MediaType.TEXT,
                partIndex: partIndices ? partIndices.combi : undefined,
                partTotalIndex: partIndices ? partIndices.combi : undefined,
                partPartialIndex: partIndices ? partIndices.combi : undefined,
                episodeTotalIndex: episodeIndices.total,
                episodePartialIndex: episodeIndices.fraction,
                episodeIndex: episodeIndices.combi,
                episodeTitle,
                link,
                date,
            });
        }
    }
    return {episodes: episodeNews};
}

newsAdapter.link = "https://boxnovel.com";
tocSearch.link = "https://boxnovel.com";
tocSearch.medium = MediaType.TEXT;
tocSearch.blindSearch = true;


export function getHook(): Hook {
    return {
        name: "boxnovel",
        medium: MediaType.TEXT,
        domainReg: /https:\/\/boxnovel\.com/,
        contentDownloadAdapter,
        tocAdapter,
        tocSearchAdapter: tocSearch,
        newsAdapter,
    };
}
