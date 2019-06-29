"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const logger_1 = tslib_1.__importDefault(require("../../logger"));
const url = tslib_1.__importStar(require("url"));
const emoji_strip_1 = tslib_1.__importDefault(require("emoji-strip"));
const queueManager_1 = require("../queueManager");
const tools_1 = require("../../tools");
async function scrapeNews() {
    const uri = "https://www.wuxiaworld.com/";
    const $ = await queueManager_1.queueCheerioRequest(uri);
    const newsRows = $(".table-novels tbody tr");
    const news = [];
    for (let i = 0; i < newsRows.length; i++) {
        const newsRow = newsRows.eq(i);
        const children = newsRow.children("td");
        const titleElement = children.eq(1);
        const link = url.resolve(uri, titleElement.children("a").attr("href"));
        const mediumElement = children.eq(0).children(".title");
        const title = emoji_strip_1.default(`${mediumElement.text().trim()} - ${titleElement.text().trim()}`);
        const timeStampElement = children.eq(3).children("[data-timestamp]").first();
        const date = new Date(Number(timeStampElement.attr("data-timestamp")) * 1000);
        if (date > new Date()) {
            logger_1.default.warn("changed time format on wuxiaworld");
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
async function scrapeToc(urlString) {
    const $ = await queueManager_1.queueCheerioRequest(urlString);
    const contentElement = $(".content");
    const novelTitle = contentElement.find("h4").first().text().trim();
    const volumes = contentElement.find("#accordion > .panel");
    if (!volumes.length) {
        logger_1.default.warn("toc link with no volumes: " + urlString);
        return [];
    }
    if (!novelTitle) {
        logger_1.default.warn("toc link with no novel title: " + urlString);
        return [];
    }
    const uri = "https://www.wuxiaworld.com/";
    const content = [];
    for (let vIndex = 0; vIndex < volumes.length; vIndex++) {
        const volumeElement = volumes.eq(vIndex);
        const volumeIndex = Number(volumeElement.find(".panel-heading .book").first().text().trim());
        const volumeTitle = volumeElement.find(".panel-heading .title").first().text().trim();
        const volumeChapters = volumeElement.find(".chapter-item a");
        if (Number.isNaN(volumeIndex)) {
            logger_1.default.warn("could not find volume index on: " + urlString);
            return [];
        }
        const volume = {
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
                    volume.episodes.push({ url: link, title, index });
                }
            }
        }
        content.push(volume);
    }
    // check whether they have common prefixes (except a minority)
    const firstWords = content.map((value) => value.title.split(" ")[0]);
    const occurrence = tools_1.countOccurrence(firstWords);
    let filteredContent = [];
    const partsLength = content.length;
    if (occurrence.size) {
        let maxEntry;
        for (const entry of occurrence.entries()) {
            if (!maxEntry) {
                maxEntry = entry;
            }
            else if (maxEntry[1] < entry[1]) {
                maxEntry = entry;
            }
        }
        if (maxEntry && partsLength && ((partsLength - maxEntry[1] / partsLength) < 0.3)) {
            const decrementIndices = [];
            for (const tocPart of content) {
                if (!tocPart.title.startsWith(maxEntry[0])) {
                    decrementIndices.push(tocPart.index);
                }
                else {
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
    const toc = {
        link: urlString,
        content: filteredContent,
        partsOnly: true,
        title: novelTitle,
        mediumType: tools_1.MediaType.TEXT
    };
    return [toc];
}
async function scrapeContent(urlString) {
    const $ = await queueManager_1.queueCheerioRequest(urlString);
    const mainElement = $(".content");
    const novelTitle = mainElement.find(".top-bar-area .caption a").first().text().trim();
    const episodeTitle = mainElement.find(".panel .caption h4").first().text().trim();
    const directContentElement = mainElement.find(".top-bar-area + .panel .fr-view").first();
    // remove teaser (especially the teaser button)
    directContentElement.find("button, img, div#spoiler_teaser").remove();
    const content = directContentElement.html();
    if (!novelTitle || !episodeTitle) {
        logger_1.default.warn("episode link with no novel or episode title: " + urlString);
        return [];
    }
    if (!content) {
        logger_1.default.warn("episode link with no content: " + urlString);
        return [];
    }
    const volChapterGroups = /^\s*Volume\s*(\d+(\.\d+)?), Chapter\s*(\d+(\.\d+)?)/.exec(episodeTitle);
    const chapterGroups = /^\s*Chapter\s*(\d+(\.\d+)?)/.exec(episodeTitle);
    let index;
    if (volChapterGroups) {
        index = Number(volChapterGroups[3]);
    }
    else if (chapterGroups) {
        index = Number(chapterGroups[1]);
    }
    if (index == null || Number.isNaN(index)) {
        index = undefined;
    }
    const textEpisodeContent = {
        contentType: tools_1.MediaType.TEXT,
        content,
        episodeTitle,
        mediumTitle: novelTitle,
        index
    };
    return [textEpisodeContent];
}
async function tocSearcher(medium) {
    const words = medium.title.split(/\s+/).filter((value) => value);
    let tocLink = "";
    for (let wordsCount = 1; wordsCount <= words.length; wordsCount++) {
        let searchQuery = "";
        for (let i = 0; i < wordsCount; i++) {
            searchQuery = `${searchQuery}+${encodeURIComponent(words[i])}`;
        }
        const responseJson = await queueManager_1.queueRequest("https://www.wuxiaworld.com/api/novels/search?query=" + words[0]);
        const parsed = JSON.parse(responseJson);
        if (parsed.result && parsed.items && parsed.items.length) {
            const foundItem = parsed.items.find((value) => tools_1.equalsIgnoreCase(value.name, medium.title)
                || medium.synonyms.some((s) => tools_1.equalsIgnoreCase(value.name, s)));
            if (foundItem) {
                tocLink = "https://www.wuxiaworld.com/novel/" + foundItem.slug;
                break;
            }
        }
        else {
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
scrapeNews.link = "https://www.wuxiaworld.com/";
function getHook() {
    return {
        domainReg: /^https:\/\/(www\.)?wuxiaworld\.com/,
        newsAdapter: scrapeNews,
        tocAdapter: scrapeToc,
        contentDownloadAdapter: scrapeContent,
        tocSearchAdapter: tocSearcher,
    };
}
exports.getHook = getHook;
//# sourceMappingURL=wuxiaworldScraper.js.map