"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const logger_1 = tslib_1.__importDefault(require("../../logger"));
const url = tslib_1.__importStar(require("url"));
const queueManager_1 = require("../queueManager");
const tools_1 = require("../../tools");
const scraperTools_1 = require("../scraperTools");
async function scrapeNews() {
    const uri = "https://www.wuxiaworld.com/";
    const $ = await queueManager_1.queueCheerioRequest(uri);
    const newsRows = $(".table-novels tbody tr");
    const episodeNews = [];
    // todo somestimes instead of chapter the Abbrev. of medium
    const titleRegex = /((vol(\.|ume)|book)?\s*((\d+)(\.(\d+))?).+)?ch(\.|apter)?\s*((\d+)(\.(\d+))?)/i;
    const abbrevTitleRegex = "|^)\\s*((\\d+)(\\.(\\d+))?)";
    for (let i = 0; i < newsRows.length; i++) {
        const newsRow = newsRows.eq(i);
        const mediumLinkElement = newsRow.find("td:first-child .title a:first-child");
        const tocLink = url.resolve(uri, mediumLinkElement.attr("href"));
        const mediumTitle = tools_1.sanitizeString(mediumLinkElement.text());
        const titleLink = newsRow.find("td:nth-child(2) a:first-child");
        const link = url.resolve(uri, titleLink.attr("href"));
        let episodeTitle = tools_1.sanitizeString(titleLink.text());
        const timeStampElement = newsRow.find("td:last-child [data-timestamp]");
        const date = new Date(Number(timeStampElement.attr("data-timestamp")) * 1000);
        if (date > new Date()) {
            logger_1.default.warn("changed time format on wuxiaworld");
            return;
        }
        let regexResult = titleRegex.exec(episodeTitle);
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
                const linkGroup = /chapter-(\d+(\.(\d+))?)$/i.exec(link);
                if (linkGroup) {
                    regexResult = [];
                    regexResult[9] = linkGroup[1];
                    regexResult[10] = linkGroup[2];
                    regexResult[12] = linkGroup[4];
                    episodeTitle = linkGroup[2] + " - " + episodeTitle;
                }
                else {
                    logger_1.default.warn("changed title format on wuxiaworld");
                    return;
                }
            }
            else {
                regexResult = [];
                regexResult[9] = match[2];
                regexResult[10] = match[3];
                regexResult[12] = match[5];
            }
        }
        let partIndices;
        if (regexResult[3]) {
            partIndices = tools_1.extractIndices(regexResult, 4, 5, 7);
        }
        let episodeIndices;
        if (regexResult[9]) {
            episodeIndices = tools_1.extractIndices(regexResult, 9, 10, 12);
        }
        if (episodeIndices == null || episodeIndices.total == null) {
            logger_1.default.warn("changed title format on wuxiaworld");
            return;
        }
        episodeNews.push({
            mediumTocLink: tocLink,
            mediumTitle,
            mediumType: tools_1.MediaType.TEXT,
            partIndex: partIndices ? partIndices.total : undefined,
            partTotalIndex: partIndices ? partIndices.total : undefined,
            partPartialIndex: partIndices ? partIndices.total : undefined,
            episodeTotalIndex: episodeIndices.total,
            episodePartialIndex: episodeIndices.fraction,
            episodeIndex: episodeIndices.combi,
            episodeTitle,
            link,
            date,
        });
    }
    const news = [];
    const translatorNewsElements = $(".section >.section-content .col-sm-6.clearfix");
    for (let i = 0; i < translatorNewsElements.length; i++) {
        const tlNews = translatorNewsElements.eq(i);
    }
    const pageNewsElements = $(".section >.section-content .col-sm-6 > .caption > div:not([class])");
    for (let i = 0; i < pageNewsElements.length; i++) {
        const pageNewsElement = pageNewsElements.eq(i);
    }
    // TODO: 07.07.2019 scrape news (not new episodes)
    return { episodes: episodeNews, news };
}
async function scrapeToc(urlString) {
    if (urlString.endsWith("-preview")) {
        return [];
    }
    const $ = await queueManager_1.queueCheerioRequest(urlString);
    const contentElement = $(".content");
    const novelTitle = tools_1.sanitizeString(contentElement.find("h4").first().text());
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
        const volumeTitle = tools_1.sanitizeString(volumeElement.find(".panel-heading .title").first().text());
        const volumeChapters = volumeElement.find(".chapter-item a");
        if (Number.isNaN(volumeIndex)) {
            logger_1.default.warn("could not find volume index on: " + urlString);
            return [];
        }
        // TODO: 24.07.2019 check if there are volumes with fractional index like '5.1'
        const volume = {
            title: volumeTitle,
            episodes: [],
            combiIndex: volumeIndex,
            totalIndex: volumeIndex
        };
        scraperTools_1.checkTocContent(volume, true);
        for (let cIndex = 0; cIndex < volumeChapters.length; cIndex++) {
            const chapterElement = volumeChapters.eq(cIndex);
            const link = url.resolve(uri, chapterElement.attr("href"));
            const title = tools_1.sanitizeString(chapterElement.text());
            const chapterGroups = /^\s*Chapter\s*((\d+)(\.(\d+))?)/.exec(title);
            if (chapterGroups && chapterGroups[2]) {
                const indices = tools_1.extractIndices(chapterGroups, 1, 2, 4);
                if (!indices) {
                    throw Error(`changed format on wuxiaworld, got no indices for: '${title}'`);
                }
                const chapterContent = {
                    url: link,
                    title,
                    totalIndex: indices.total,
                    partialIndex: indices.fraction,
                    combiIndex: indices.combi
                };
                scraperTools_1.checkTocContent(chapterContent);
                volume.episodes.push(chapterContent);
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
                }
                else {
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
    const novelTitle = tools_1.sanitizeString(mainElement.find(".top-bar-area .caption a").first().text());
    const episodeTitle = tools_1.sanitizeString(mainElement.find(".panel .caption h4").first().text());
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
    const episodeContent = {
        content: [content],
        episodeTitle,
        mediumTitle: novelTitle,
        index
    };
    return [episodeContent];
}
async function tocSearcher(medium) {
    const words = medium.title.split(/\s+/).filter((value) => value);
    let tocLink = "";
    let searchWord = "";
    for (let wordsCount = 0; wordsCount <= words.length; wordsCount++) {
        const word = encodeURIComponent(words[wordsCount]);
        if (!word) {
            continue;
        }
        searchWord += " " + word;
        const responseJson = await queueManager_1.queueRequest("https://www.wuxiaworld.com/api/novels/search?query=" + searchWord);
        const parsed = JSON.parse(responseJson);
        if (parsed.result && parsed.items && parsed.items.length) {
            const foundItem = parsed.items.find((value) => tools_1.equalsIgnore(value.name, medium.title)
                || medium.synonyms.some((s) => tools_1.equalsIgnore(value.name, s)));
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
tocSearcher.link = "https://www.wuxiaworld.com/";
tocSearcher.medium = tools_1.MediaType.TEXT;
function getHook() {
    return {
        name: "wuxiaworld",
        medium: tools_1.MediaType.TEXT,
        domainReg: /^https:\/\/(www\.)?wuxiaworld\.com/,
        newsAdapter: scrapeNews,
        tocAdapter: scrapeToc,
        contentDownloadAdapter: scrapeContent,
        tocSearchAdapter: tocSearcher,
    };
}
exports.getHook = getHook;
//# sourceMappingURL=wuxiaworldScraper.js.map