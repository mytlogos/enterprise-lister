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
    const words = medium.title.split(/\s+/).filter((value) => value);
    let tocLink = "";
    let searchWords = "";
    const uri = "https://boxnovel.com/";
    for (let wordsCount = 0; wordsCount <= words.length; wordsCount++) {
        const word = encodeURIComponent(words[wordsCount]);
        if (!word) {
            continue;
        }
        searchWords = searchWords ? searchWords + "+" + word : word;
        if (searchWords.length < 4) {
            continue;
        }
        const $ = await queueManager_1.queueCheerioRequest(`https://boxnovel.com/?s=${searchWords}&post_type=wp-manga`);
        const links = $(".post-title a");
        console.log(links.length + " possible matches for " + medium.mediumId);
        for (let i = 0; i < links.length; i++) {
            const linkElement = links.eq(i);
            const text = tools_1.sanitizeString(linkElement.text());
            if (tools_1.equalsIgnore(text, medium.title) || medium.synonyms.some((s) => tools_1.equalsIgnore(text, s))) {
                tocLink = linkElement.attr("href");
                tocLink = url.resolve(uri, tocLink);
                break;
            }
        }
        let tryMore = false;
        for (let i = 0; i < links.length; i++) {
            const linkElement = links.eq(i);
            const text = tools_1.sanitizeString(linkElement.text());
            if (tools_1.contains(text, searchWords) || medium.synonyms.some((s) => tools_1.contains(text, s))) {
                tryMore = true;
                break;
            }
        }
        if (tocLink || !tryMore) {
            break;
        }
    }
    if (tocLink) {
        const tocs = await tocAdapter(tocLink);
        if (tocs && tocs.length) {
            return tocs[0];
        }
    }
    return;
}
async function searchAjax(searchWords, medium) {
    const urlString = "https://boxnovel.com/wp-admin/admin-ajax.php";
    let response;
    // TODO: 19.08.2019 this may work, forgot to set http method before
    try {
        const body = "action=wp-manga-search-mangatitle=" + searchWords;
        response = await queueManager_1.queueRequest(urlString, {
            url: urlString,
            headers: {
                "Content-Length": body.length,
                "Accept": "*/*",
                "Content-Type": "application/x-www-form-urlencoded"
            },
            method: "POST",
            body
        });
    }
    catch (e) {
        console.log(e);
        return;
    }
    const parsed = JSON.parse(response);
    if (parsed.success && parsed.data && parsed.data.length) {
        const foundItem = parsed.data.find((value) => tools_1.equalsIgnore(value.title, medium.title)
            || medium.synonyms.some((s) => tools_1.equalsIgnore(value.title, s)));
        if (foundItem) {
            return foundItem.url;
        }
    }
}
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
    const titleRegex = /ch(\.|apter)?\s*((\d+)(\.(\d+))?)/i;
    for (let i = 0; i < items.length; i++) {
        const newsRow = items.eq(i);
        const titleElement = newsRow.find("a");
        const link = url.resolve(uri, titleElement.attr("href"));
        const episodeTitle = tools_1.sanitizeString(titleElement.text());
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
        const regexResult = titleRegex.exec(episodeTitle);
        if (!regexResult) {
            logger_1.default.warn("changed title format on boxNovel: " + tocLink);
            return [];
        }
        const episodeIndices = tools_1.extractIndices(regexResult, 2, 3, 5);
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
            let partIndex;
            let partTotalIndex;
            let partPartialIndex;
            if (regexResult[3]) {
                partIndex = Number(regexResult[3]);
                if (regexResult[4]) {
                    partTotalIndex = Number(regexResult[4]);
                }
                if (regexResult[6]) {
                    partPartialIndex = Number(regexResult[6]) || undefined;
                }
            }
            let episodeIndex;
            let episodeTotalIndex;
            let episodePartialIndex;
            if (regexResult[8]) {
                episodeIndex = Number(regexResult[8]);
                if (regexResult[9]) {
                    episodeTotalIndex = Number(regexResult[9]);
                }
                if (regexResult[11]) {
                    episodePartialIndex = Number(regexResult[11]) || undefined;
                }
            }
            if (episodeIndex == null || episodeTotalIndex == null) {
                logger_1.default.warn("changed title format on boxNovel: news");
                return;
            }
            episodeNews.push({
                mediumTocLink: tocLink,
                mediumTitle,
                mediumType: tools_1.MediaType.TEXT,
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
    }
    return { episodes: episodeNews };
}
newsAdapter.link = "https://boxnovel.com";
tocSearch.medium = tools_1.MediaType.TEXT;
function getHook() {
    return {
        name: "boxnovel",
        medium: tools_1.MediaType.TEXT,
        domainReg: /https:\/\/boxnovel\.com/,
        contentDownloadAdapter,
        tocAdapter,
        tocSearchAdapter: tocSearch,
        newsAdapter,
    };
}
exports.getHook = getHook;
//# sourceMappingURL=boxNovelScraper.js.map