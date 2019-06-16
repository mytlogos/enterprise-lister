import {Hook, TextEpisodeContent, Toc, TocPart} from "../types";
import {News, TocSearchMedium} from "../../types";
import cheerio from "cheerio";
import logger from "../../logger";
import * as url from "url";
import emojiStrip from "emoji-strip";
import {queueRequest} from "../queueManager";
import {countOccurrence, equalsIgnoreCase, MediaType} from "../../tools";

async function scrapeNews(): Promise<News[]> {
    const uri = "https://www.wuxiaworld.com/";

    const body: string = await queueRequest(uri);
    const $ = cheerio.load(body);
    const newsRows = $(".table-novels tbody tr");

    const news: News[] = [];

    for (let i = 0; i < newsRows.length; i++) {
        const newsRow = newsRows.eq(i);
        const children = newsRow.children("td");

        const titleElement = children.eq(1);
        const link = url.resolve(uri, titleElement.children("a").attr("href"));

        const mediumElement = children.eq(0).children(".title");
        const title = emojiStrip(`${mediumElement.text().trim()} - ${titleElement.text().trim()}`);

        const timeStampElement = children.eq(3).children("[data-timestamp]").first();
        const date = new Date(Number(timeStampElement.attr("data-timestamp")) * 1000);

        if (date > new Date()) {
            logger.warn("changed time format on wuxiaworld");
            return [];
        }
        news.push({
            title,
            link,
            date,
        });
    }
    return news;
}

async function scrapeToc(urlString: string): Promise<Toc[]> {
    const body: string = await queueRequest(urlString);
    const $ = cheerio.load(body);
    const contentElement = $(".content");
    const novelTitle = contentElement.find("h4").first().text().trim();
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
            index: volumeIndex
        };

        for (let cIndex = 0; cIndex < volumeChapters.length; cIndex++) {
            const chapterElement = volumeChapters.eq(cIndex);
            const link = url.resolve(uri, chapterElement.attr("href"));
            const title = chapterElement.text().trim();

            const chapterGroups = /^\s*Chapter\s*(\d+(\.\d+)?)/.exec(title);

            if (chapterGroups) {
                const index = Number(chapterGroups[1]);

                if (!Number.isNaN(index)) {
                    volume.episodes.push({url: link, title, index});
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
            } else if (maxEntry[1] < entry[1]) {
                maxEntry = entry;
            }
        }

        if (maxEntry && partsLength && ((partsLength - maxEntry[1] / partsLength) < 0.3)) {
            const decrementIndices = [];

            for (const tocPart of content) {
                if (!tocPart.title.startsWith(maxEntry[0])) {
                    decrementIndices.push(tocPart.index);
                } else {
                    filteredContent.push(tocPart);

                    for (const decrementIndex of decrementIndices) {
                        if (decrementIndex < tocPart.index) {
                            tocPart.index--;
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
    const body: string = await queueRequest(urlString);
    const $ = cheerio.load(body);
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
        let searchQuery = "";

        for (let i = 0; i < wordsCount; i++) {
            searchQuery = `${searchQuery}+${encodeURIComponent(words[i])}`;
        }

        const responseJson = await queueRequest("https://www.wuxiaworld.com/api/novels/search?query=" + words[0]);
        const parsed: NovelSearchResponse = JSON.parse(responseJson);

        if (parsed.result && parsed.items && parsed.items.length) {
            const foundItem = parsed.items.find((value) =>
                equalsIgnoreCase(value.name, medium.title)
                || medium.synonyms.some((s) => equalsIgnoreCase(value.name, s))
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
