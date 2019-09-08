import {EpisodeContent, Hook, Toc, TocEpisode, TocPart} from "../types";
import {EpisodeNews, News, TocSearchMedium} from "../../types";
import {equalsIgnore, ignore, MediaType, relativeToAbsoluteTime, sanitizeString} from "../../tools";
import logger from "../../logger";
import * as url from "url";
import {queueCheerioRequest, queueRequest} from "../queueManager";
import * as request from "request-promise-native";
import {checkTocContent} from "../scraperTools";

const jar = request.jar();
const defaultRequest = request.defaults({
    jar
});

const initPromise = queueRequest(
    "https://www.webnovel.com/",
    {
        method: "HEAD",
        uri: "https://www.webnovel.com/"
    },
    defaultRequest
).then(ignore);

async function scrapeNews(): Promise<{ news?: News[], episodes?: EpisodeNews[] } | undefined> {
    const uri = "https://www.webnovel.com/";
    const $ = await queueCheerioRequest(uri);
    const newsRows = $("#LatUpdate tbody > tr");

    const news: EpisodeNews[] = [];
    const titlePattern = /(\d+) .+/i;

    for (let i = 0; i < newsRows.length; i++) {
        const newsRow = newsRows.eq(i);
        const tableData = newsRow.children("td");

        const mediumElement = tableData.eq(1);
        const mediumTocLinkElement = mediumElement.children("a").first();
        const mediumTocLink = url.resolve(uri, mediumTocLinkElement.attr("href"));
        const mediumTitle = sanitizeString(mediumElement.text());

        const titleElement = tableData.eq(2).children("a").first();
        const episodeTitle = sanitizeString(titleElement.text());

        const textTime = tableData.eq(5).text().trim();
        const time = relativeToAbsoluteTime(textTime);

        if (!time) {
            logger.warn(`could not parse time of webnovel news: '${textTime}'`);
            continue;
        }

        const totalLink = url.resolve(uri, titleElement.attr("href"));
        const linkGroup = /(https:\/\/www\.webnovel\.com\/book\/\d+\/\d+\/).+/.exec(totalLink);
        if (!linkGroup) {
            logger.info(`unknown news url format on webnovel: ${totalLink}`);
            continue;
        }
        const link = linkGroup[1];
        const groups = titlePattern.exec(episodeTitle);

        if (!groups || !groups[1]) {
            logger.info(`unknown news format on webnovel: ${episodeTitle}`);
            continue;
        }
        const index = Number(groups[1]);
        news.push({
            mediumTitle,
            mediumTocLink,
            mediumType: MediaType.TEXT,
            episodeTitle,
            episodeIndex: index,
            episodeTotalIndex: index,
            date: time,
            link
        });
    }
    return {episodes: news};
}

async function scrapeToc(urlString: string): Promise<Toc[]> {
    // wait for a normal request, to get the right cookies
    await initPromise;

    const bookIdResult = /https?:\/\/(www\.)?webnovel\.com\/book\/(\d+)/.exec(urlString);

    if (!bookIdResult) {
        logger.warn("WebNovel toc link has no bookIdResult: " + urlString);
        return [];
    }

    const bookId = bookIdResult[2];

    return scrapeTocPage(bookId);
}

async function scrapeTocPage(bookId: string, mediumId?: number): Promise<Toc[]> {
    const csrfCookie = jar.getCookies("https://www.webnovel.com").find((value) => value.key === "_csrfToken");

    if (!csrfCookie) {
        logger.warn("csrf cookie not found for webnovel");
        return [];
    }
    const csrfValue = csrfCookie.value;
    const tocLink = `https://www.webnovel.com/apiajax/chapter/GetChapterList?bookId=${bookId}&_csrfToken=${csrfValue}`;
    const tocJson: TocResponse = await loadJson(tocLink);

    if (tocJson.code !== 0) {
        logger.warn("WebNovel toc request was not successful for: " + bookId);
        return [];
    }

    if (!tocJson.data || !tocJson.data.volumeItems || !tocJson.data.volumeItems.length) {
        logger.warn("no toc content on webnovel for " + bookId);
        return [];
    }
    const idPattern = /^\d+$/;

    const content: TocPart[] = tocJson.data.volumeItems.map((volume: any): TocPart => {
        if (!volume.name) {
            volume.name = "Volume " + volume.index;
        }
        const name = volume.name;

        const chapters: TocEpisode[] = volume.chapterItems.map((item: ChapterItem): TocEpisode => {
            let date = new Date(item.createTime);

            if (Number.isNaN(date.getDate())) {
                date = relativeToAbsoluteTime(item.createTime) || new Date();
            }

            if (!date) {
                throw Error(`invalid date: '${item.createTime}'`);
            }

            if (!idPattern.test(item.id)) {
                throw Error("invalid chapterId: " + item.id);
            }

            const chapterContent: TocEpisode = {
                url: `https://www.webnovel.com/book/${bookId}/${item.id}/`,
                title: item.name,
                combiIndex: item.index,
                totalIndex: item.index,
                releaseDate: date,
                locked: item.isVip !== 0
            };
            checkTocContent(chapterContent);
            return chapterContent;
        });
        const partContent = {
            episodes: chapters,
            title: name,
            combiIndex: volume.index,
            totalIndex: volume.index,
        };
        checkTocContent(partContent, true);
        return partContent;
    });
    const toc: Toc = {
        link: `https://www.webnovel.com/book/${bookId}/`,
        synonyms: [tocJson.data.bookInfo.bookSubName],
        mediumId,
        content,
        partsOnly: true,
        title: tocJson.data.bookInfo.bookName,
        mediumType: MediaType.TEXT
    };

    return [toc];
}

function loadBody(urlString: string): Promise<CheerioStatic> {
    return initPromise.then(() => queueCheerioRequest(urlString, undefined, defaultRequest));
}

function loadJson(urlString: string): Promise<any> {
    return initPromise
        .then(() => queueRequest(urlString, undefined, defaultRequest))
        .then((body) => JSON.parse(body));
}

async function scrapeContent(urlString: string): Promise<EpisodeContent[]> {
    let $: CheerioStatic;
    try {
        $ = await loadBody(urlString);
    } catch (e) {
        logger.warn("could not access: " + urlString);
        return [];
    }

    const contentElement = $(".chapter_content");

    const titleElement = $(".cha-hd-mn-text a").first();
    const novelTitle = sanitizeString(titleElement.text().replace(/\/\s*$/, ""));
    titleElement.remove();

    const episodeTitle = sanitizeString($(".cha-hd-mn-text").text());
    const content = contentElement.find(".cha-words").first().html();

    const chapterGroups = /^\s*Chapter\s*(\d+(\.\d+)?)/.exec(episodeTitle);

    let index;
    if (chapterGroups) {
        index = Number(chapterGroups[1]);
    }
    if (index != null && Number.isNaN(index)) {
        index = undefined;
    }

    if (!novelTitle || !episodeTitle) {
        logger.warn("episode link with no novel or episode title: " + urlString);
        return [];
    }

    const episodeContent: EpisodeContent = {
        content: [],
        episodeTitle,
        mediumTitle: novelTitle,
        index
    };

    // either normal premium locked or app locked
    if ($("._lock").length || !contentElement.children().length) {
        episodeContent.locked = true;
        return [episodeContent];
    } else if (!content) {
        logger.warn("episode link with no content: " + urlString);
        return [];
    }
    return [episodeContent];
}

interface ChapterItem {
    /**
     * if it is more than a week ago: M, dd,yyyy
     * else in relative time
     */
    createTime: string;
    id: string;
    index: number;
    /**
     * is 1 for everything?
     */
    isAuth: number;
    /**
     * 0 means not locked,
     * 2 means locked with stones
     */
    isVip: number;
    /**
     * 0: everyone can access them from browser
     * > 0: app locked chapters, probably
     */
    chapterLevel: number;
    name: string;
    /**
     * normally 0 when not logged in
     */
    userLevel: number;
}

interface VolumeItem {
    chapterCount: number;
    index: number;
    name: string;
    chapterItems: ChapterItem[];
}

interface BookInfo {
    bookId: string;
    bookName: string;
    bookSubName: string;
    newChapterId: string;
    newChapterName: string;
    newChapterTime: string;
    totalChapterNum: number;
    newChapterIndex: number;
}

interface TocData {
    bookInfo: BookInfo;
    volumeItems: VolumeItem[];
}

interface TocResponse {
    code: number;
    data: TocData;
    msg: string;
}

async function searchToc(searchMedium: TocSearchMedium): Promise<Toc | undefined> {
    console.log("start searching webnovel " + searchMedium.mediumId);
    const urlString = "https://www.webnovel.com/search?keywords=" + encodeURIComponent(searchMedium.title);
    const body = await loadBody(urlString);
    const titles = body("body > div.page  ul[class*=result] > li > h3 > a");

    let bookId: string | undefined;
    for (let i = 0; i < titles.length; i++) {
        const titleElement = titles.eq(i);
        const possibleTitles = [searchMedium.title, ...searchMedium.synonyms];

        const title = sanitizeString(titleElement.text());
        if (possibleTitles.some((value) => equalsIgnore(title, value))) {
            bookId = titleElement.attr("data-bookid");
            break;
        }
    }
    if (!bookId) {
        return;
    }

    const idPattern = /^\d+$/;

    if (!idPattern.test(bookId)) {
        throw Error("invalid bookId");
    }
    const [toc] = await scrapeTocPage(bookId, searchMedium.mediumId);
    console.log("scraping toc on webnovel successfully " + searchMedium.mediumId);
    return toc;
}

scrapeNews.link = "https://www.webnovel.com/";
searchToc.link = "https://www.webnovel.com/";
searchToc.medium = MediaType.TEXT;

export function getHook(): Hook {
    return {
        name: "webnovel",
        medium: MediaType.TEXT,
        domainReg: /^https:\/\/(www\.)?webnovel\.com/,
        // tslint:disable-next-line:max-line-length
        tocPattern: /^https:\/\/(paste\.tech-port\.de)|(priv\.atebin\.com)|(paste\.fizi\.ca)|(privatebin\.secured\.fi)\/$/,
        newsAdapter: scrapeNews,
        contentDownloadAdapter: scrapeContent,
        tocAdapter: scrapeToc,
        tocSearchAdapter: searchToc
    };
}
