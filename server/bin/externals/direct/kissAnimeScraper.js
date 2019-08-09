import * as url from "url";
import { queueCheerioRequest } from "../queueManager";
import logger from "../../logger";
import { extractIndices, MediaType, sanitizeString } from "../../tools";
import * as request from "cloudscraper";
// @ts-ignore
const jar = request.jar();
// @ts-ignore
const defaultRequest = request.defaults({
    jar
});
function loadBody(urlString, options) {
    // @ts-ignore
    return queueCheerioRequest(urlString, options, defaultRequest);
}
async function scrapeNews() {
    const uri = "https://kissanime.ru/";
    // const $ = await loadBody("https://kissanime.ru/Home/GetNextUpdatedAnime", {method: "POST"});
    const $ = await loadBody(uri);
    const newsRows = $(".bigBarContainer .barContent a");
    const news = [];
    const titlePattern = /(Episode\s*((\d+)(\.(\d+))?))|(movie)/i;
    for (let i = 0; i < newsRows.length; i++) {
        const newsRow = newsRows.eq(i);
        const link = url.resolve(uri, newsRow.attr("href"));
        const span = newsRow.children("span").eq(0);
        span.remove();
        const mediumTitle = sanitizeString(newsRow.text());
        const groups = titlePattern.exec(span.text());
        if (!groups) {
            // TODO: 19.07.2019 log or just ignore?, kissAnime has news designated with 'episode', ona or ova only
            console.log(`Unknown KissAnime News Format: '${span.text()}' for '${mediumTitle}'`);
            continue;
        }
        let episodeIndex;
        let episodeTotalIndex;
        let episodePartialIndex;
        let episodeTitle;
        if (groups[1]) {
            episodeTitle = sanitizeString(groups[1]);
            episodeIndex = Number(groups[2]);
            episodeTotalIndex = Number(groups[3]);
            episodePartialIndex = Number(groups[5]) || undefined;
        }
        else if (groups[6]) {
            episodeTitle = mediumTitle;
            episodeIndex = episodeTotalIndex = 1;
        }
        else {
            continue;
        }
        news.push({
            link,
            mediumType: MediaType.VIDEO,
            mediumTocLink: link,
            mediumTitle,
            episodeTitle,
            episodeIndex,
            episodeTotalIndex,
            episodePartialIndex,
            date: new Date()
        });
    }
    if (!news.length) {
        return {};
    }
    return { episodes: news };
}
/*
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

            if (item.episodeTitle === latestNews[0].title) {
                let allMatch = true;
                // if there are less than 3 items left to compare the latest news with
                // a precise statement cannot be made, so just take the date of this item
                if ((i + 3) >= news.length) {
                    endDate = item.date;
                    break;
                }
                for (let j = i; j < i + 9; j++) {
                    const latestItem = latestNews[j - i];

                    if (item.episodeTitle !== latestItem.title) {
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
 */
async function scrapeToc(urlString) {
    const $ = await queueCheerioRequest(urlString);
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
    const content = [];
    const chapReg = /Episode\s*((\d+)(\.(\d+))?)(\s*(.+))?/i;
    for (let i = 0; i < episodeElements.length; i++) {
        const episodeElement = episodeElements.eq(i);
        const columns = episodeElement.children();
        const date = new Date(columns.eq(1).text());
        const titleElement = columns.eq(0).find("a");
        const titleString = sanitizeString(titleElement.text());
        const episodeGroups = chapReg.exec(titleString);
        if (Number.isNaN(date.getDate()) || !episodeGroups) {
            logger.warn("changed episode format on kissAnime toc");
            return [];
        }
        const link = url.resolve(uri, titleElement.attr("href"));
        const indices = extractIndices(episodeGroups, 1, 2, 4);
        if (!indices) {
            throw Error(`changed format on kissAnime, got no indices for: '${titleString}'`);
        }
        let title = "Episode " + indices.combi;
        if (episodeGroups[6]) {
            title += " - " + episodeGroups[6];
        }
        content.push({
            title,
            combiIndex: indices.combi,
            totalIndex: indices.total,
            partialIndex: indices.fraction,
            url: link,
            releaseDate: date
        });
    }
    const toc = {
        link: urlString,
        content,
        title: animeTitle,
        mediumType: MediaType.VIDEO
    };
    return [toc];
}
scrapeNews.link = "https://kissanime.ru/";
export function getHook() {
    return {
        domainReg: /^kissanime\.ru/,
        newsAdapter: scrapeNews,
        tocAdapter: scrapeToc
    };
}
//# sourceMappingURL=kissAnimeScraper.js.map