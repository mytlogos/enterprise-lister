import {Hook, TextEpisodeContent, Toc, TocEpisode, TocPart} from "../types";
import {News} from "../../types";
import {MediaType, relativeToAbsoluteTime} from "../../tools";
import logger from "../../logger";
import * as url from "url";
import {queueCheerioRequest, queueRequest} from "../queueManager";
import * as request from "request-promise-native";

const defaultRequest = request.defaults({
    jar: true
});

const initPromise = queueRequest("https://www.webnovel.com/", undefined, defaultRequest);

async function scrapeNews(): Promise<News[]> {
    const uri = "https://www.webnovel.com/";
    const $ = await queueCheerioRequest(uri);
    const newsRows = $("#LatUpdate tbody > tr");

    const news: News[] = [];
    for (let i = 0; i < newsRows.length; i++) {
        const newsRow = newsRows.eq(i);
        const tableData = newsRow.children("td");

        const mediumName = tableData.eq(1).text().trim();
        const titleElement = tableData.eq(2).children("a").first();
        const title = titleElement.text().trim();

        const link = url.resolve(uri, titleElement.attr("href"));
        const time = relativeToAbsoluteTime(tableData.eq(5).text().trim());

        if (!time) {
            logger.warn("could not parse time of webnovel news");
            continue;
        }
        news.push({
            date: time,
            link,
            title: `${mediumName} - ${title}`
        });
    }
    return news;
}

async function scrapeToc(urlString: string): Promise<Toc[]> {
    const bookId = /https?:\/\/(www\.)?webnovel\.com\/book\/(\d+)/.exec(urlString);

    if (!bookId || !bookId[2]) {
        logger.warn("WebNovel toc link has no bookId: " + urlString);
        return [];
    }
    const tocJson = await loadJson("https://www.webnovel.com/apiajax/chapter/GetChapterList?bookId=" + bookId[2]);

    if (tocJson.code !== 0) {
        logger.warn("WebNovel toc request was not successful for: " + urlString);
        return [];
    }

    const content: TocPart[] = tocJson.data.volumeItems.map((volume: any): TocPart => {
        const name = volume.name;

        const chapters: TocEpisode[] = volume.chapterItems.map((item: any): TocEpisode => {
            let date = new Date(item.createTime);

            if (Number.isNaN(date.getDate())) {
                date = relativeToAbsoluteTime(item.createTime) || new Date();
            }


            return {
                url: `https://www.webnovel.com/book/${bookId}/${item.id}/`,
                title: item.name,
                index: item.index,
                releaseDate: date
            };
        });
        return {
            episodes: chapters,
            title: name,
            index: volume.index,
        };
    });
    const toc: Toc = {
        link: urlString,
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

async function scrapeContent(urlString: string): Promise<TextEpisodeContent[]> {
    const $ = await loadBody(urlString);

    const contentElement = $(".chapter_content");
    const novelTitle = contentElement.find(".cha-hd-mn-text").first().text().trim();
    const episodeTitle = contentElement.find(".cha-tit h3").first().text().trim();
    const content = contentElement.find(".cha-words").first().html();

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
    if (index != null && Number.isNaN(index)) {
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

scrapeNews.link = "https://www.webnovel.com/";

export function getHook(): Hook {
    return {
        domainReg: /^https:\/\/(www\.)?webnovel\.com/,
        newsAdapter: scrapeNews,
        contentDownloadAdapter: scrapeContent,
        tocAdapter: scrapeToc
    };
}
