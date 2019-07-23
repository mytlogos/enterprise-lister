import {Hook, TextEpisodeContent, Toc, TocPart} from "../types";
import {EpisodeNews, News, TocSearchMedium} from "../../types";
import logger from "../../logger";
import * as url from "url";
import {queueCheerioRequest, queueRequest} from "../queueManager";
import {countOccurrence, equalsIgnore, MediaType, sanitizeString} from "../../tools";

async function scrapeNews(): Promise<{ news?: News[], episodes?: EpisodeNews[] } | undefined> {
    const uri = "https://www.wuxiaworld.com/";

    const $ = await queueCheerioRequest(uri);
    const newsRows = $(".table-novels tbody tr");

    const episodeNews: EpisodeNews[] = [];
    // todo somestimes instead of chapter the Abbrev. of medium
    const titleRegex = /((vol(\.|ume)|book)?\s*((\d+)(\.(\d+))?).+)?ch(\.|apter)?\s*((\d+)(\.(\d+))?)/i;
    const abbrevTitleRegex = "|^)\\s*((\\d+)(\\.(\\d+))?)";

    for (let i = 0; i < newsRows.length; i++) {
        const newsRow = newsRows.eq(i);

        const mediumLinkElement = newsRow.find("td:first-child .title a:first-child");
        const tocLink = url.resolve(uri, mediumLinkElement.attr("href"));
        const mediumTitle = sanitizeString(mediumLinkElement.text());

        const titleLink = newsRow.find("td:nth-child(2) a:first-child");
        const link = url.resolve(uri, titleLink.attr("href"));

        const episodeTitle = sanitizeString(titleLink.text());

        const timeStampElement = newsRow.find("td:last-child [data-timestamp]");
        const date = new Date(Number(timeStampElement.attr("data-timestamp")) * 1000);

        if (date > new Date()) {
            logger.warn("changed time format on wuxiaworld");
            return;
        }
        let regexResult: string[] | null = titleRegex.exec(episodeTitle);

        if (!regexResult) {
            let abbrev = "";
            for (const word of mediumTitle.split(/\W+/)) {
                if (word) {
                    abbrev += word[0];
                }
            }
            // workaround, as some titles have the abbreviation instead of chapter before the chapter index
            const match = episodeTitle.match(new RegExp(`(${abbrev}${abbrevTitleRegex}`, "i"));

            if (!abbrev || !match) {
                logger.warn("changed title format on wuxiaworld");
                return;
            }
            regexResult = [];
            regexResult[9] = match[2];
            regexResult[10] = match[3];
            regexResult[12] = match[5];
        }
        let partIndex;
        let partTotalIndex;
        let partPartialIndex;

        if (regexResult[4]) {
            partIndex = Number(regexResult[4]);

            if (regexResult[5]) {
                partTotalIndex = Number(regexResult[5]);
            }
            if (regexResult[7]) {
                partPartialIndex = Number(regexResult[7]) || undefined;
            }
        }
        let episodeIndex;
        let episodeTotalIndex;
        let episodePartialIndex;

        if (regexResult[9]) {
            episodeIndex = Number(regexResult[9]);

            if (regexResult[10]) {
                episodeTotalIndex = Number(regexResult[10]);
            }
            if (regexResult[12]) {
                episodePartialIndex = Number(regexResult[12]) || undefined;
            }
        }
        if (episodeIndex == null || episodeTotalIndex == null) {
            logger.warn("changed title format on wuxiaworld");
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

    const news: News[] = [];
    const translatorNewsElements = $(".section >.section-content .col-sm-6.clearfix");
    for (let i = 0; i < translatorNewsElements.length; i++) {
        const tlNews = translatorNewsElements.eq(i);
    }
    const pageNewsElements = $(".section >.section-content .col-sm-6 > .caption > div:not([class])");
    for (let i = 0; i < pageNewsElements.length; i++) {
        const pageNewsElement = pageNewsElements.eq(i);
    }
    // TODO: 07.07.2019 scrape news (not new episodes)
    return {episodes: episodeNews, news};
}

async function scrapeToc(urlString: string): Promise<Toc[]> {
    const $ = await queueCheerioRequest(urlString);
    const contentElement = $(".content");
    const novelTitle = sanitizeString(contentElement.find("h4").first().text());
    const volumes = contentElement.find("#accordion > .panel");

    if (!volumes.length) {
        logger.warn("toc link with no volumes: " + urlString);
        return [];
    }
    if (!novelTitle) {
        logger.warn("toc link with no novel title: " + urlString);
        return [];
    }
    const uri = "https://www.wuxiaworld.com/";

    const content: TocPart[] = [];

    for (let vIndex = 0; vIndex < volumes.length; vIndex++) {
        const volumeElement = volumes.eq(vIndex);

        const volumeIndex = Number(volumeElement.find(".panel-heading .book").first().text().trim());
        const volumeTitle = volumeElement.find(".panel-heading .title").first().text().trim();
        const volumeChapters = volumeElement.find(".chapter-item a");

        if (Number.isNaN(volumeIndex)) {
            logger.warn("could not find volume index on: " + urlString);
            return [];
        }
        const volume: TocPart = {
            title: volumeTitle,
            episodes: [],
            totalIndex: volumeIndex
        };

        for (let cIndex = 0; cIndex < volumeChapters.length; cIndex++) {
            const chapterElement = volumeChapters.eq(cIndex);
            const link = url.resolve(uri, chapterElement.attr("href"));
            const title = chapterElement.text().trim();

            const chapterGroups = /^\s*Chapter\s*(\d+(\.\d+)?)/.exec(title);

            if (chapterGroups) {
                const index = Number(chapterGroups[1]);

                if (!Number.isNaN(index)) {
                    volume.episodes.push({url: link, title, totalIndex: index});
                }
            }
        }

        content.push(volume);
    }
    // check whether they have common prefixes (except a minority)
    const firstWords = content.map((value) => value.title.split(" ")[0]);
    const occurrence = countOccurrence(firstWords);

    let filteredContent: TocPart[] = [];

    const partsLength = content.length;

    if (occurrence.size) {
        let maxEntry;
        for (const entry of occurrence.entries()) {
            if (!maxEntry) {
                maxEntry = entry;
                continue;
            }
            if (maxEntry[1] < entry[1]) {
                maxEntry = entry;
            }
        }

        if (maxEntry && partsLength && ((partsLength - maxEntry[1] / partsLength) < 0.3)) {
            const decrementIndices = [];

            for (const tocPart of content) {
                if (!tocPart.title.startsWith(maxEntry[0])) {
                    decrementIndices.push(tocPart.totalIndex);
                } else {
                    filteredContent.push(tocPart);

                    for (const decrementIndex of decrementIndices) {
                        if (decrementIndex < tocPart.totalIndex) {
                            tocPart.totalIndex--;
                        }
                    }
                }
            }
        }
    }
    if (!filteredContent.length && partsLength) {
        filteredContent = content;
    }
    const toc: Toc = {
        link: urlString,
        content: filteredContent,
        partsOnly: true,
        title: novelTitle,
        mediumType: MediaType.TEXT
    };
    return [toc];
}

async function scrapeContent(urlString: string): Promise<TextEpisodeContent[]> {
    const $ = await queueCheerioRequest(urlString);
    const mainElement = $(".content");
    const novelTitle = mainElement.find(".top-bar-area .caption a").first().text().trim();
    const episodeTitle = mainElement.find(".panel .caption h4").first().text().trim();
    const directContentElement = mainElement.find(".top-bar-area + .panel .fr-view").first();
    // remove teaser (especially the teaser button)
    directContentElement.find("button, img, div#spoiler_teaser").remove();

    const content = directContentElement.html();

    if (!novelTitle || !episodeTitle) {
        logger.warn("episode link with no novel or episode title: " + urlString);
        return [];
    }
    if (!content) {
        logger.warn("episode link with no content: " + urlString);
        return [];
    }
    const volChapterGroups = /^\s*Volume\s*(\d+(\.\d+)?), Chapter\s*(\d+(\.\d+)?)/.exec(episodeTitle);
    const chapterGroups = /^\s*Chapter\s*(\d+(\.\d+)?)/.exec(episodeTitle);

    let index;
    if (volChapterGroups) {
        index = Number(volChapterGroups[3]);
    } else if (chapterGroups) {
        index = Number(chapterGroups[1]);
    }
    if (index == null || Number.isNaN(index)) {
        index = undefined;
    }
    const textEpisodeContent: TextEpisodeContent = {
        contentType: MediaType.TEXT,
        content,
        episodeTitle,
        mediumTitle: novelTitle,
        index
    };

    return [textEpisodeContent];
}

async function tocSearcher(medium: TocSearchMedium): Promise<Toc | undefined> {
    const words = medium.title.split(/\s+/).filter((value) => value);
    let tocLink = "";

    for (let wordsCount = 1; wordsCount <= words.length; wordsCount++) {
        const word = encodeURIComponent(words[0]);
        const responseJson = await queueRequest("https://www.wuxiaworld.com/api/novels/search?query=" + word);
        const parsed: NovelSearchResponse = JSON.parse(responseJson);

        if (parsed.result && parsed.items && parsed.items.length) {
            const foundItem = parsed.items.find((value) =>
                equalsIgnore(value.name, medium.title)
                || medium.synonyms.some((s) => equalsIgnore(value.name, s))
            );
            if (foundItem) {
                tocLink = "https://www.wuxiaworld.com/novel/" + foundItem.slug;
                break;
            }
        } else {
            break;
        }
    }
    if (tocLink) {
        const tocs = await scrapeToc(tocLink);
        // we succeeded in scraping
        if (tocs.length === 1) {
            return tocs[0];
        }
    }
}

interface NovelSearchResponse {
    result: boolean;
    items: NovelSearchItem[];
}

interface NovelSearchItem {
    id: number;
    name: string;
    slug: string;
    coverUrl: string;
    abbreviation: string;
    synopsis: string;
    language: string;
    timeCreated: number;
    status: number;
    chapterCount: number;
    tags: string[];
}

scrapeNews.link = "https://www.wuxiaworld.com/";

export function getHook(): Hook {
    return {
        domainReg: /^https:\/\/(www\.)?wuxiaworld\.com/,
        newsAdapter: scrapeNews,
        tocAdapter: scrapeToc,
        contentDownloadAdapter: scrapeContent,
        tocSearchAdapter: tocSearcher,
    };
}
