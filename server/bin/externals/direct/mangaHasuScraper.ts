import {Hook, Toc, TocEpisode, TocPart} from "../types";
import {News} from "../../types";
import cheerio from "cheerio";
import {Storage} from "../../database/database";
import * as url from "url";
import {queueRequest} from "../queueManager";
import logger from "../../logger";
import {MediaType} from "../../tools";

async function scrapeNews(): Promise<News[]> {
    // todo scrape more than just the first page if there is an open end
    const baseUri = "http://mangahasu.se/";
    const body: string = await queueRequest(baseUri + "latest-releases.html");
    const $ = cheerio.load(body);
    const newsRows = $("ul.list_manga  .info-manga");

    const news: News[] = [];

    for (let i = 0; i < newsRows.length; i++) {
        const newsRow = newsRows.eq(i);

        const children = newsRow.children("a");

        const mediumElement = children.eq(0);
        const titleElement = children.eq(1);
        const link = url.resolve(baseUri, titleElement.attr("href"));
        const title = `${mediumElement.text().trim()} - ${titleElement.text().trim()}`;

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
    const latestNews = await Storage.getLatestNews("mangahasu.se");

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
    const contentElement = $(".wrapper_content");
    const mangaTitle = contentElement.find(".info-title h1").first().text().trim();
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
    const chapterContents: TocEpisode[] = [];

    const toc: Toc = {
        link: urlString,
        content: [],
        title: mangaTitle,
        mediumType: MediaType.IMAGE
    };

    const endReg = /\[END]\s*$/i;
    const volChapReg = /Vol\.?\s*(\d+(\.\d+)?)\s*Chapter\s*(\d+(\.\d+)?)(:\s*(.+))?/i;
    const chapReg = /Chapter\s*(\d+(\.\d+)?)(:\s*(.+))?/i;
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

        if (endReg.test(chapterTitleElement.text())) {
            toc.end = true;
        }

        const chapterTitle = chapterTitleElement.text().trim();
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
            const volIndex = Number(volChapGroups[1]);
            const chapIndex = Number(volChapGroups[3]);
            const title = volChapGroups[4] || "Chapter " + chapIndex;
            const link = url.resolve(uri, chapterTitleElement.find("a").first().attr("href"));

            let part: TocPart = partContents[volIndex];


            if (Number.isNaN(chapIndex)) {
                logger.warn("changed episode format on mangaHasu toc: got no index");
                return [];
            }

            if (!part) {
                partContents[volIndex] = part = {
                    episodes: [],
                    index: volIndex,
                    title: "Vol." + volIndex
                };
            }

            part.episodes.push({
                title,
                index: chapIndex,
                url: link,
                releaseDate: time
            });
        } else if (chapGroups) {
            const chapIndex = Number(chapGroups[1]);
            const title = chapGroups[4] || "Chapter " + chapIndex;
            const link = url.resolve(uri, chapterTitleElement.find("a").first().attr("href"));


            if (Number.isNaN(chapIndex)) {
                logger.warn("changed episode format on mangaHasu toc: got no index");
                return [];
            }

            chapterContents.push({
                title,
                index: chapIndex,
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
        domainReg: /^mangahasu\.se/,
        newsAdapter: scrapeNews,
        tocAdapter: scrapeToc
    };
}
