"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const queueManager_1 = require("../queueManager");
const url = tslib_1.__importStar(require("url"));
const tools_1 = require("../../tools");
const logger_1 = tslib_1.__importDefault(require("../../logger"));
const directTools_1 = require("./directTools");
const scraperTools_1 = require("../scraperTools");
async function tocSearch(medium) {
    return directTools_1.searchToc(medium, tocAdapter, "https://boxnovel.com/", (searchString) => searchAjax(searchString, medium));
}
async function search(text) {
    const urlString = "https://boxnovel.com/wp-admin/admin-ajax.php";
    let response;
    const searchResults = [];
    try {
        response = await queueManager_1.queueRequest(urlString, {
            url: urlString,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            method: "POST",
            body: "action=wp-manga-search-manga&title=" + text
        });
    }
    catch (e) {
        console.log(e);
        return searchResults;
    }
    const parsed = JSON.parse(response);
    if (parsed.success && parsed.data && parsed.data.length) {
        for (const datum of parsed.data) {
            searchResults.push({ link: datum.url, title: datum.title });
        }
    }
    return searchResults;
}
async function searchAjax(searchWords, medium) {
    const urlString = "https://boxnovel.com/wp-admin/admin-ajax.php";
    let response;
    try {
        response = await queueManager_1.queueRequest(urlString, {
            url: urlString,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            method: "POST",
            body: "action=wp-manga-search-manga&title=" + searchWords
        });
    }
    catch (e) {
        console.log(e);
        return { done: true };
    }
    const parsed = JSON.parse(response);
    if (parsed.success && parsed.data && parsed.data.length) {
        if (!parsed.data.length) {
            return { done: true };
        }
        for (const datum of parsed.data) {
            if (tools_1.equalsIgnore(datum.title, medium.title) || medium.synonyms.some((s) => tools_1.equalsIgnore(datum.title, s))) {
                return { value: datum.url, done: true };
            }
        }
        return { done: false };
    }
    else {
        return { done: true };
    }
}
exports.searchAjax = searchAjax;
async function contentDownloadAdapter(urlString) {
    if (!urlString.match(/https:\/\/boxnovel\.com\/novel\/.+\/chapter-.+/)) {
        return [];
    }
    const $ = await queueManager_1.queueCheerioRequest(urlString);
    const mediumTitleElement = $("ol.breadcrumb li:nth-child(2) a");
    const novelTitle = tools_1.sanitizeString(mediumTitleElement.text());
    const chaTit = $(".cha-tit h3");
    let directContentElement;
    let episodeTitle;
    if (chaTit.length) {
        directContentElement = $(".cha-content .cha-words");
        const firstChild = directContentElement.children().first();
        if (firstChild.is(".cha-words")) {
            directContentElement = firstChild;
        }
        episodeTitle = tools_1.sanitizeString(chaTit.text());
    }
    else {
        const entryTitle = $("h1.entry-title").remove();
        if (!entryTitle.length) {
            const currentChapter = $("option[selected]").first();
            if (!currentChapter.length) {
                logger_1.default.warn("changed title format for chapters on boxNovel for " + urlString);
                return [];
            }
            episodeTitle = tools_1.sanitizeString(currentChapter.text());
        }
        else {
            episodeTitle = tools_1.sanitizeString(entryTitle.text());
        }
        directContentElement = $(".reading-content");
    }
    const content = directContentElement.html();
    if (!content) {
        logger_1.default.warn("changed content format for chapters on boxNovel: " + urlString);
        return [];
    }
    return directTools_1.getTextContent(novelTitle, episodeTitle, urlString, content);
}
async function tocAdapter(tocLink) {
    const uri = "https://boxnovel.com";
    if (!tocLink.startsWith("https://boxnovel.com/novel/")) {
        return [];
    }
    const $ = await queueManager_1.queueCheerioRequest(tocLink);
    const mediumTitleElement = $(".post-title h3");
    mediumTitleElement.find("span").remove();
    const mediumTitle = tools_1.sanitizeString(mediumTitleElement.text());
    const content = [];
    const items = $(".wp-manga-chapter");
    const titleRegex = /ch(\.|a?.?p?.?t?.?e?.?r?.?)?\s*((\d+)(\.(\d+))?)/i;
    const linkRegex = /ch(\.|a?.?p?.?t?.?e?.?r?.?)?-((\d+)(\.(\d+))?)/i;
    let end;
    for (let i = 0; i < items.length; i++) {
        const newsRow = items.eq(i);
        const titleElement = newsRow.find("a");
        const link = url.resolve(uri, titleElement.attr("href"));
        let episodeTitle = tools_1.sanitizeString(titleElement.text());
        const timeStampElement = newsRow.find(".chapter-release-date");
        const dateString = timeStampElement.text().trim();
        const lowerDate = dateString.toLowerCase();
        let date;
        if (lowerDate.includes("now") || lowerDate.includes("ago")) {
            date = tools_1.relativeToAbsoluteTime(dateString);
        }
        else {
            date = new Date(dateString);
        }
        if (!date || date > new Date()) {
            logger_1.default.warn("changed time format on boxNovel: " + tocLink);
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
                logger_1.default.warn("changed title format on boxNovel: " + tocLink);
                return [];
            }
        }
        else if (regexResult.index) {
            const titleIndices = tools_1.extractIndices(regexResult, 2, 3, 5);
            const linkRegexResult = linkRegex.exec(link);
            if (linkRegexResult) {
                const linkIndices = tools_1.extractIndices(linkRegexResult, 2, 3, 5);
                if (linkIndices && titleIndices && linkIndices.combi > titleIndices.combi) {
                    regexResult = linkRegexResult;
                    const partialIndexPart = linkIndices.fraction ? "." + linkIndices.fraction : "";
                    episodeTitle = `Chapter ${linkIndices.total}${partialIndexPart} ${episodeTitle}`;
                }
            }
        }
        const episodeIndices = tools_1.extractIndices(regexResult, 2, 3, 5);
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
        };
        scraperTools_1.checkTocContent(chapterContent);
        content.push(chapterContent);
    }
    return [{
            link: tocLink,
            content,
            title: mediumTitle,
            end,
            mediumType: tools_1.MediaType.TEXT
        }];
}
async function newsAdapter() {
    const uri = "https://boxnovel.com";
    const $ = await queueManager_1.queueCheerioRequest(uri);
    const items = $(".page-item-detail");
    const episodeNews = [];
    const titleRegex = /(vol(\.|ume)?\s*((\d+)(\.(\d+))?).+)?ch(\.|apter)?\s*((\d+)(\.(\d+))?)/i;
    for (let i = 0; i < items.length; i++) {
        const newsRow = items.eq(i);
        const mediumTitleElement = newsRow.find(".post-title a");
        const tocLink = url.resolve(uri, mediumTitleElement.attr("href"));
        const mediumTitle = tools_1.sanitizeString(mediumTitleElement.text());
        const titleElement = newsRow.find(".chapter-item .chapter a");
        const timeElements = newsRow.find(".chapter-item .post-on");
        for (let j = 0; j < titleElement.length; j++) {
            const chapterTitleElement = titleElement.eq(j);
            const link = url.resolve(uri, chapterTitleElement.attr("href"));
            const episodeTitle = tools_1.sanitizeString(chapterTitleElement.text());
            const timeStampElement = timeElements.eq(j);
            const dateString = timeStampElement.text().trim();
            const lowerDate = dateString.toLowerCase();
            let date;
            if (lowerDate.includes("now") || lowerDate.includes("ago")) {
                date = tools_1.relativeToAbsoluteTime(dateString);
            }
            else {
                date = new Date(dateString);
            }
            if (!date || date > new Date()) {
                logger_1.default.warn("changed time format on boxNovel: news");
                return;
            }
            const regexResult = titleRegex.exec(episodeTitle);
            if (!regexResult) {
                logger_1.default.warn("changed title format on boxNovel: news");
                return;
            }
            let partIndices;
            if (regexResult[3]) {
                partIndices = tools_1.extractIndices(regexResult, 3, 4, 6);
                if (!partIndices) {
                    logger_1.default.info(`unknown news format on boxnovel: ${episodeTitle}`);
                    continue;
                }
            }
            let episodeIndices;
            if (regexResult[8]) {
                episodeIndices = tools_1.extractIndices(regexResult, 8, 9, 11);
                if (!episodeIndices) {
                    logger_1.default.info(`unknown news format on boxnovel: ${episodeTitle}`);
                    continue;
                }
            }
            if (episodeIndices == null || episodeIndices.combi == null) {
                logger_1.default.warn("changed title format on boxNovel: news");
                return;
            }
            episodeNews.push({
                mediumTocLink: tocLink,
                mediumTitle,
                mediumType: tools_1.MediaType.TEXT,
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
    return { episodes: episodeNews };
}
newsAdapter.link = "https://boxnovel.com";
tocSearch.link = "https://boxnovel.com";
tocSearch.medium = tools_1.MediaType.TEXT;
tocSearch.blindSearch = true;
search.medium = tools_1.MediaType.TEXT;
function getHook() {
    return {
        name: "boxnovel",
        medium: tools_1.MediaType.TEXT,
        domainReg: /https:\/\/boxnovel\.com/,
        contentDownloadAdapter,
        tocAdapter,
        tocSearchAdapter: tocSearch,
        newsAdapter,
        searchAdapter: search,
    };
}
exports.getHook = getHook;
//# sourceMappingURL=boxNovelScraper.js.map