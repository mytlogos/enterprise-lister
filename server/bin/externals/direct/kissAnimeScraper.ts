import {Hook, Toc, TocEpisode} from "../types";
import {News} from "../../types";
import cheerio from "cheerio";
import {Storage} from "../../database/database";
import * as url from "url";
import {queueRequest} from "../queueManager";
import logger from "../../logger";
import {MediaType} from "../../tools";


async function scrapeNews(): Promise<News[]> {
    const uri = "https://kissanime.ru/";
    const body: string = await queueRequest(uri);

    const $ = cheerio.load(body);
    const newsRows = $(".scrollable> .items a");

    const news: News[] = [];

    for (let i = 0; i < newsRows.length; i++) {
        const newsRow = newsRows.eq(i);

        const link = url.resolve(uri, newsRow.attr("href"));
        const title = newsRow.text().trim().replace(/\s+/g, " ");

        news.push({
            title,
            link,
            date: new Date(),
        });
    }
    if (!news.length) {
        return news;
    }

    // the latest 10 news for the given domain
    const latestNews = await Storage.getLatestNews("kissanime.ru");

    let endDate;
    // if there are no other news yet, set duration for this news batch to 10 hours
    if (!latestNews.length) {
        endDate = new Date();
        endDate.setHours(endDate.getHours() - 10);
    } else {
        for (let i = 0; i < news.length; i++) {
            const item = news[i];

            if (item.title === latestNews[0].title) {
                let allMatch = true;
                // if there are less than 3 items left to compare the latest news with
                // a precise statement cannot be made, so just take the date of this item
                if ((i + 3) >= news.length) {
                    endDate = item.date;
                    break;
                }
                for (let j = i; j < i + 9; j++) {
                    const latestItem = latestNews[j - i];

                    if (item.title !== latestItem.title) {
                        allMatch = false;
                        break;
                    }
                    endDate = latestItem.date;
                }
                if (!allMatch) {
                    endDate = null;
                }
            }
        }
    }
    if (endDate) {
        const duration = Date.now() - endDate.getTime();
        const itemDuration = duration / news.length;

        for (let i = 0; i < news.length; i++) {
            const date = news[i].date;
            date.setMilliseconds(date.getMilliseconds() - i * itemDuration);
        }
    } else {
        // if there is an open end, just pretend as if every 15 min one release happened
        for (let i = 0; i < news.length; i++) {
            const date = news[i].date;
            date.setMinutes(date.getMinutes() - i * 15);
        }
    }
    return news;
}

async function scrapeToc(urlString: string): Promise<Toc[]> {
    const body: string = await queueRequest(urlString);
    const $ = cheerio.load(body);
    const contentElement = $("#container > #leftside");
    const animeTitle = contentElement
        .find(".bigBarContainer > .barContent > div > a:first-child")
        .first()
        .text()
        .trim();

    const episodeElements = contentElement.find(".episodeList .listing > tbody > tr:has(td)");

    if (episodeElements.length <= 1) {
        logger.warn("toc link with no episodes: " + urlString);
        return [];
    }
    if (!animeTitle) {
        logger.warn("toc link with no title: " + urlString);
        return [];
    }
    const uri = "https://kissanime.ru/";

    const content: TocEpisode[] = [];

    const chapReg = /Episode\s*(\d+(\.\d+)?)(\s*.+)?/i;

    for (let i = 0; i < episodeElements.length; i++) {
        const episodeElement = episodeElements.eq(i);
        const columns = episodeElement.children();

        const date = new Date(columns.eq(1).text());

        const titleElement = columns.eq(0).find("a");
        const episodeGroups = chapReg.exec(titleElement.text());

        if (Number.isNaN(date.getDate()) || !episodeGroups) {
            logger.warn("changed episode format on kissAnime toc");
            return [];
        }

        const link = url.resolve(uri, titleElement.attr("href"));
        const episodeIndex = Number(episodeGroups[1]);
        const title = episodeGroups[3] || "Episode " + episodeIndex;

        if (Number.isNaN(episodeIndex)) {
            logger.warn("changed episode format on kissAnime toc: got no index");
            return [];
        }
        content.push({
            title,
            index: episodeIndex,
            url: link,
            releaseDate: date
        });
    }

    const toc: Toc = {
        link: urlString,
        content,
        title: animeTitle,
        mediumType: MediaType.VIDEO
    };

    return [toc];
}

scrapeNews.link = "https://kissanime.ru/";

export function getHook(): Hook {
    return {
        domainReg: /^kissanime\.ru/,
        newsAdapter: scrapeNews,
        tocAdapter: scrapeToc
    };
}
