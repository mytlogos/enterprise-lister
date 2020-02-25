"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const queueManager_1 = require("../queueManager");
const url = tslib_1.__importStar(require("url"));
const tools_1 = require("../../tools");
const logger_1 = tslib_1.__importStar(require("../../logger"));
const directTools_1 = require("./directTools");
const scraperTools_1 = require("../scraperTools");
async function tocSearch(medium) {
    return directTools_1.searchTocCheerio(medium, tocAdapter, "http://novelfull.com/", (parameter) => "http://novelfull.com/search?keyword=" + parameter, ".truyen-title a");
}
async function search(text) {
    const encodedText = encodeURIComponent(text);
    const $ = await queueManager_1.queueCheerioRequest("http://novelfull.com/search?keyword=" + encodedText);
    const uri = "http://novelfull.com/";
    const results = $(".col-truyen-main .row");
    const searchResults = [];
    for (let i = 0; i < results.length; i++) {
        const resultElement = results.eq(i);
        const linkElement = resultElement.find(".truyen-title a");
        const authorElement = resultElement.find(".author");
        const coverElement = resultElement.find("img.cover");
        const coverLink = url.resolve(uri, coverElement.attr("src"));
        const author = tools_1.sanitizeString(authorElement.text());
        const title = tools_1.sanitizeString(linkElement.text());
        let tocLink = linkElement.attr("href");
        tocLink = url.resolve(uri, tocLink);
        searchResults.push({ title, link: tocLink, author, coverUrl: coverLink });
    }
    return searchResults;
}
async function contentDownloadAdapter(urlString) {
    if (!urlString.match(/^http:\/\/novelfull\.com\/.+\/.+\d+.+/)) {
        logger_1.default.warn("invalid chapter link for novelFull: " + urlString);
        return [];
    }
    const $ = await queueManager_1.queueCheerioRequest(urlString);
    const mediumTitleElement = $("ol.breadcrumb li:nth-child(2) a");
    const novelTitle = tools_1.sanitizeString(mediumTitleElement.text());
    const episodeTitle = tools_1.sanitizeString($(".chapter-title").text());
    const directContentElement = $("#chapter-content");
    directContentElement.find("script, ins").remove();
    const content = directContentElement.html();
    if (!content) {
        logger_1.default.warn("no content on novelFull for " + urlString);
        return [];
    }
    return directTools_1.getTextContent(novelTitle, episodeTitle, urlString, content);
}
async function tocAdapter(tocLink) {
    const uri = "http://novelfull.com";
    const linkMatch = tocLink.match("^https?://novelfull\\.com/([\\w-]+.html)$");
    if (!linkMatch) {
        return [];
    }
    const toc = {
        link: tocLink,
        mediumType: tools_1.MediaType.TEXT
    };
    tocLink = `http://novelfull.com/index.php/${linkMatch[1]}?page=`;
    for (let i = 1;; i++) {
        const $ = await queueManager_1.queueCheerioRequest(tocLink + i);
        if ($(".info a[href=\"/status/Completed\"]").length) {
            toc.end = true;
        }
        const tocSnippet = await scrapeTocPage($, uri);
        if (!tocSnippet) {
            break;
        }
        if (!toc.title) {
            toc.title = tocSnippet.title;
        }
        else if (tocSnippet.title && tocSnippet.title !== toc.title) {
            logger_1.default.warn(`Mismatched Title on Toc Pages on novelFull: '${toc.title}' and '${tocSnippet.title}': ` + tocLink);
            return [];
        }
        if (!toc.content) {
            toc.content = tocSnippet.content;
        }
        else {
            toc.content.push(...tocSnippet.content);
        }
        if (!toc.synonyms) {
            toc.synonyms = tocSnippet.synonyms;
        }
        else if (tocSnippet.synonyms) {
            toc.synonyms.push(...tocSnippet.synonyms);
        }
        if ($(".pagination .last.disabled, .pagination .next.disabled").length) {
            break;
        }
        // no novel has more than 300 toc pages (300 * 50 -> 15000 Chapters)
        if (i > 300) {
            logger_1.logError(new Error(`Could not reach end of TOC '${toc.link}'`));
            break;
        }
    }
    if (!toc.content || !toc.title) {
        return [];
    }
    return [toc];
}
async function scrapeTocPage($, uri) {
    // TODO: 20.07.2019 scrape alternative titles and author too
    const mediumTitleElement = $(".desc .title").first();
    const mediumTitle = tools_1.sanitizeString(mediumTitleElement.text());
    const content = [];
    const indexPartMap = new Map();
    const items = $(".list-chapter li a");
    const titleRegex = /(vol(\.|ume)?\s*((\d+)(\.(\d+))?).+)?((ch(\.|a?.?p?.?t?.?e?.?r?.?)?)|-)\s*((\d+)(\.(\d+))?)/i;
    // TODO: 24.07.2019 has volume, 'intermission', 'gossips', 'skill introduction', 'summary'
    //  for now it skips those, maybe do it with lookAheads in the rows or sth similar
    for (let i = 0; i < items.length; i++) {
        const newsRow = items.eq(i);
        const link = url.resolve(uri, newsRow.attr("href"));
        const episodeTitle = tools_1.sanitizeString(newsRow.text());
        const regexResult = titleRegex.exec(episodeTitle);
        if (!regexResult) {
            logger_1.default.warn(`changed title format on novelFull: '${episodeTitle}': ` + uri);
            continue;
        }
        const partIndices = tools_1.extractIndices(regexResult, 3, 4, 6);
        const episodeIndices = tools_1.extractIndices(regexResult, 10, 11, 13);
        if (!episodeIndices) {
            throw Error(`title format changed on fullNovel, got no indices for '${episodeTitle}'`);
        }
        const episode = {
            combiIndex: episodeIndices.combi,
            totalIndex: episodeIndices.total,
            partialIndex: episodeIndices.fraction,
            url: link,
            title: episodeTitle
        };
        scraperTools_1.checkTocContent(episode);
        if (partIndices) {
            let part = indexPartMap.get(partIndices.combi);
            if (!part) {
                part = {
                    episodes: [],
                    combiIndex: partIndices.combi,
                    totalIndex: partIndices.total,
                    partialIndex: partIndices.fraction,
                    title: "Vol." + partIndices.combi
                };
                scraperTools_1.checkTocContent(part, true);
                indexPartMap.set(partIndices.combi, part);
                content.push(part);
            }
            part.episodes.push(episode);
        }
        else {
            content.push(episode);
        }
    }
    return {
        link: "",
        content,
        title: mediumTitle,
        mediumType: tools_1.MediaType.TEXT
    };
}
async function newsAdapter() {
    const uri = "http://novelfull.com";
    const $ = await queueManager_1.queueCheerioRequest(uri);
    const items = $("#list-index .list-new .row");
    const episodeNews = [];
    // some people just cant get it right to write 'Chapter' right so just allow a character error margin
    const titleRegex = /((ch(\.|a?.?p?.?t?.?e?.?r?.?)?)|-|^)\s*((\d+)(\.(\d+))?)/i;
    const abbrevTitleRegex = "|^)\\s*((\\d+)(\\.(\\d+))?)";
    for (let i = 0; i < items.length; i++) {
        const newsRow = items.eq(i);
        const mediumTitleElement = newsRow.find(".col-title a");
        const tocLink = url.resolve(uri, mediumTitleElement.attr("href"));
        const mediumTitle = tools_1.sanitizeString(mediumTitleElement.text());
        const titleElement = newsRow.find(".col-chap a");
        const link = url.resolve(uri, titleElement.attr("href"));
        const episodeTitle = tools_1.sanitizeString(titleElement.text());
        const timeStampElement = newsRow.find(".col-time");
        const date = tools_1.relativeToAbsoluteTime(timeStampElement.text().trim());
        if (!date || date > new Date()) {
            logger_1.default.warn(`changed time format on novelFull: '${date}' from '${timeStampElement.text().trim()}': news`);
            continue;
        }
        let regexResult = titleRegex.exec(episodeTitle);
        if (!regexResult) {
            let abbrev = "";
            for (const word of mediumTitle.split(/[\W'´`’′‘]+/)) {
                if (word) {
                    abbrev += word[0];
                }
            }
            // workaround, as some titles have the abbreviation instead of chapter before the chapter index
            const match = episodeTitle.match(new RegExp(`(${abbrev}${abbrevTitleRegex}`, "i"));
            if (!abbrev || !match) {
                if (!episodeTitle.startsWith("Side")) {
                    logger_1.default.warn(`changed title format on novelFull: '${episodeTitle}': news`);
                }
                continue;
            }
            regexResult = [];
            regexResult[10] = match[2];
            regexResult[11] = match[3];
            regexResult[13] = match[5];
        }
        // const partIndices = extractIndices(regexResult, 3, 4, 6);
        const episodeIndices = tools_1.extractIndices(regexResult, 4, 5, 7);
        if (!episodeIndices) {
            logger_1.default.warn(`changed title format on novelFull: '${episodeTitle}': news`);
            continue;
        }
        episodeNews.push({
            mediumTocLink: tocLink,
            mediumTitle,
            mediumType: tools_1.MediaType.TEXT,
            // partIndex: partIndices && partIndices.combi || undefined,
            // partTotalIndex: partIndices && partIndices.total || undefined,
            // partPartialIndex: partIndices && partIndices.fraction || undefined,
            episodeTotalIndex: episodeIndices.total,
            episodePartialIndex: episodeIndices.fraction,
            episodeIndex: episodeIndices.combi,
            episodeTitle,
            link,
            date,
        });
    }
    return { episodes: episodeNews };
}
newsAdapter.link = "http://novelfull.com";
tocSearch.link = "http://novelfull.com";
tocSearch.medium = tools_1.MediaType.TEXT;
tocSearch.blindSearch = true;
search.medium = tools_1.MediaType.TEXT;
function getHook() {
    return {
        name: "novelfull",
        medium: tools_1.MediaType.TEXT,
        domainReg: /https?:\/\/novelfull\.com/,
        contentDownloadAdapter,
        tocAdapter,
        newsAdapter,
        tocSearchAdapter: tocSearch,
        searchAdapter: search
    };
}
exports.getHook = getHook;
//# sourceMappingURL=novelFullScraper.js.map