"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var queueManager_1 = require("../queueManager");
var url = require("url");
var tools_1 = require("../../tools");
var logger_1 = require("../../logger");
var directTools_1 = require("./directTools");
var scraperTools_1 = require("../scraperTools");
function tocSearch(medium) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/];
        });
    });
}
function contentDownloadAdapter(urlString) {
    return __awaiter(this, void 0, void 0, function () {
        var $, mediumTitleElement, novelTitle, episodeTitle, directContentElement, content;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!urlString.match(/http:\/\/novelfull\.com\/.+\/chapter-.+/)) {
                        return [2 /*return*/, []];
                    }
                    return [4 /*yield*/, queueManager_1.queueCheerioRequest(urlString)];
                case 1:
                    $ = _a.sent();
                    mediumTitleElement = $("ol.breadcrumb li:nth-child(2) a");
                    novelTitle = tools_1.sanitizeString(mediumTitleElement.text());
                    episodeTitle = tools_1.sanitizeString($(".chapter-title").text());
                    directContentElement = $("#chapter-content");
                    directContentElement.find("script, ins").remove();
                    content = directContentElement.html();
                    if (!content) {
                        return [2 /*return*/, []];
                    }
                    return [2 /*return*/, directTools_1.getTextContent(novelTitle, episodeTitle, urlString, content)];
            }
        });
    });
}
function tocAdapter(tocLink) {
    return __awaiter(this, void 0, void 0, function () {
        var uri, linkMatch, toc, i, $, tocSnippet;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    uri = "http://novelfull.com";
                    linkMatch = tocLink.match("^https?://novelfull\\.com/([\\w-]+.html)$");
                    if (!linkMatch) {
                        return [2 /*return*/, []];
                    }
                    toc = {
                        link: tocLink,
                        mediumType: tools_1.MediaType.TEXT
                    };
                    tocLink = "http://novelfull.com/index.php/" + linkMatch[1] + "?page=";
                    i = 1;
                    _c.label = 1;
                case 1: return [4 /*yield*/, queueManager_1.queueCheerioRequest(tocLink + i)];
                case 2:
                    $ = _c.sent();
                    return [4 /*yield*/, scrapeTocPage($, uri)];
                case 3:
                    tocSnippet = _c.sent();
                    if (!tocSnippet) {
                        return [3 /*break*/, 5];
                    }
                    if (!toc.title) {
                        toc.title = tocSnippet.title;
                    }
                    else if (tocSnippet.title && tocSnippet.title !== toc.title) {
                        logger_1["default"].warn("Mismatched Title on Toc Pages on novelFull: '" + toc.title + "' and '" + tocSnippet.title + "'");
                        return [2 /*return*/, []];
                    }
                    if (!toc.content) {
                        toc.content = tocSnippet.content;
                    }
                    else {
                        (_a = toc.content).push.apply(_a, tocSnippet.content);
                    }
                    if (!toc.synonyms) {
                        toc.synonyms = tocSnippet.synonyms;
                    }
                    else if (tocSnippet.synonyms) {
                        (_b = toc.synonyms).push.apply(_b, tocSnippet.synonyms);
                    }
                    if ($(".pagination .last.disabled, .pagination .next.disabled").length) {
                        return [3 /*break*/, 5];
                    }
                    // no novel has more than 300 toc pages (300 * 50 -> 15000 Chapters)
                    if (i > 300) {
                        logger_1["default"].error("Could not reach end of TOC '" + toc.link + "'");
                        return [3 /*break*/, 5];
                    }
                    _c.label = 4;
                case 4:
                    i++;
                    return [3 /*break*/, 1];
                case 5:
                    if (!toc.content || !toc.title) {
                        return [2 /*return*/, []];
                    }
                    return [2 /*return*/, [toc]];
            }
        });
    });
}
function scrapeTocPage($, uri) {
    return __awaiter(this, void 0, void 0, function () {
        var mediumTitleElement, mediumTitle, content, indexPartMap, items, titleRegex, i, newsRow, link, episodeTitle, regexResult, partIndices, episodeIndices, episode, part;
        return __generator(this, function (_a) {
            mediumTitleElement = $(".desc .title").first();
            mediumTitle = tools_1.sanitizeString(mediumTitleElement.text());
            content = [];
            indexPartMap = new Map();
            items = $(".list-chapter li a");
            titleRegex = /(vol(\.|ume)?\s*((\d+)(\.(\d+))?).+)?((ch(\.|a?.?p?.?t?.?e?.?r?.?)?)|-)\s*((\d+)(\.(\d+))?)/i;
            // TODO: 24.07.2019 has volume, 'intermission', 'gossips', 'skill introduction', 'summary'
            //  for now it skips those, maybe do it with lookAheads in the rows or sth similar
            for (i = 0; i < items.length; i++) {
                newsRow = items.eq(i);
                link = url.resolve(uri, newsRow.attr("href"));
                episodeTitle = tools_1.sanitizeString(newsRow.text());
                regexResult = titleRegex.exec(episodeTitle);
                if (!regexResult) {
                    logger_1["default"].warn("changed title format on novelFull: '" + episodeTitle + "'");
                    continue;
                }
                partIndices = tools_1.extractIndices(regexResult, 3, 4, 6);
                episodeIndices = tools_1.extractIndices(regexResult, 10, 11, 13);
                if (!episodeIndices) {
                    throw Error("title format changed on fullNovel, got no indices for '" + episodeTitle + "'");
                }
                episode = {
                    combiIndex: episodeIndices.combi,
                    totalIndex: episodeIndices.total,
                    partialIndex: episodeIndices.fraction,
                    url: link,
                    title: episodeTitle
                };
                scraperTools_1.checkTocContent(episode);
                if (partIndices) {
                    part = indexPartMap.get(partIndices.combi);
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
            return [2 /*return*/, {
                    link: "",
                    content: content,
                    title: mediumTitle,
                    mediumType: tools_1.MediaType.TEXT
                }];
        });
    });
}
function newsAdapter() {
    return __awaiter(this, void 0, void 0, function () {
        var uri, $, items, episodeNews, titleRegex, abbrevTitleRegex, i, newsRow, mediumTitleElement, tocLink, mediumTitle, titleElement, link, episodeTitle, timeStampElement, date, regexResult, abbrev, _i, _a, word, match, episodeIndices;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    uri = "http://novelfull.com";
                    return [4 /*yield*/, queueManager_1.queueCheerioRequest(uri)];
                case 1:
                    $ = _b.sent();
                    items = $("#list-index .list-new .row");
                    episodeNews = [];
                    titleRegex = /((ch(\.|a?.?p?.?t?.?e?.?r?.?)?)|-)\s*((\d+)(\.(\d+))?)/i;
                    abbrevTitleRegex = "|^)\\s*((\\d+)(\\.(\\d+))?)";
                    for (i = 0; i < items.length; i++) {
                        newsRow = items.eq(i);
                        mediumTitleElement = newsRow.find(".col-title a");
                        tocLink = url.resolve(uri, mediumTitleElement.attr("href"));
                        mediumTitle = tools_1.sanitizeString(mediumTitleElement.text());
                        titleElement = newsRow.find(".col-chap a");
                        link = url.resolve(uri, titleElement.attr("href"));
                        episodeTitle = tools_1.sanitizeString(titleElement.text());
                        timeStampElement = newsRow.find(".col-time");
                        date = tools_1.relativeToAbsoluteTime(timeStampElement.text().trim());
                        if (!date || date > new Date()) {
                            logger_1["default"].warn("changed time format on novelFull: '" + date + "' from '" + timeStampElement.text().trim() + "'");
                            continue;
                        }
                        regexResult = titleRegex.exec(episodeTitle);
                        if (!regexResult) {
                            abbrev = "";
                            for (_i = 0, _a = mediumTitle.split(/[\W'´`’′‘]+/); _i < _a.length; _i++) {
                                word = _a[_i];
                                if (word) {
                                    abbrev += word[0];
                                }
                            }
                            match = episodeTitle.match(new RegExp("(" + abbrev + abbrevTitleRegex, "i"));
                            if (!abbrev || !match) {
                                if (!episodeTitle.startsWith("Side")) {
                                    logger_1["default"].warn("changed title format on novelFull: '" + episodeTitle + "'");
                                }
                                continue;
                            }
                            regexResult = [];
                            regexResult[10] = match[2];
                            regexResult[11] = match[3];
                            regexResult[13] = match[5];
                        }
                        episodeIndices = tools_1.extractIndices(regexResult, 4, 5, 7);
                        if (!episodeIndices) {
                            logger_1["default"].warn("changed title format on novelFull: '" + episodeTitle + "'");
                            continue;
                        }
                        episodeNews.push({
                            mediumTocLink: tocLink,
                            mediumTitle: mediumTitle,
                            mediumType: tools_1.MediaType.TEXT,
                            // partIndex: partIndices && partIndices.combi || undefined,
                            // partTotalIndex: partIndices && partIndices.total || undefined,
                            // partPartialIndex: partIndices && partIndices.fraction || undefined,
                            episodeTotalIndex: episodeIndices.total,
                            episodePartialIndex: episodeIndices.fraction,
                            episodeIndex: episodeIndices.combi,
                            episodeTitle: episodeTitle,
                            link: link,
                            date: date,
                        });
                    }
                    return [2 /*return*/, { episodes: episodeNews }];
            }
        });
    });
}
newsAdapter.link = "http://novelfull.com";
function getHook() {
    return {
        domainReg: /https?:\/\/novelfull\.com/,
        contentDownloadAdapter: contentDownloadAdapter,
        tocAdapter: tocAdapter,
        newsAdapter: newsAdapter,
    };
}
exports.getHook = getHook;
