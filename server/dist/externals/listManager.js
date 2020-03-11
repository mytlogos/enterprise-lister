"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const request_promise_native_1 = tslib_1.__importDefault(require("request-promise-native"));
const url_1 = tslib_1.__importDefault(require("url"));
const tools_1 = require("../tools");
const queueManager_1 = require("./queueManager");
const tough_cookie_1 = require("tough-cookie");
const logger_1 = tslib_1.__importDefault(require("../logger"));
const cheerio_1 = tslib_1.__importDefault(require("cheerio"));
const types_1 = require("../types");
class SimpleNovelUpdates {
    static getListRelease(s) {
        const episodeReg = /\s(v(\d+))?\s*(c(\d+)(-(\d+))?)?\s*(\(end\))?\s/;
        const partGroup = 2;
        const firstEpisodeGroup = 4;
        const lastEpisodeGroup = 6;
        const endGroup = 7;
        const exec = episodeReg.exec(s);
        if (!exec) {
            return {};
        }
        else {
            const lastEpisode = exec[lastEpisodeGroup];
            const firstEpisode = exec[firstEpisodeGroup];
            return {
                end: exec[endGroup] != null,
                partIndex: exec[partGroup] ? Number(exec[partGroup]) : undefined,
                episodeIndex: lastEpisode ? Number(lastEpisode) : firstEpisode ? Number(firstEpisode) : undefined
            };
        }
    }
    static loadCheerio(link) {
        return queueManager_1.queueCheerioRequest(link, { url: link });
    }
    static getStatusCoo(s) {
        if (s.includes("\n")) {
            return types_1.ReleaseState.Unknown;
        }
        const lower = s.toLowerCase();
        if (lower.includes("discontinued")) {
            return types_1.ReleaseState.Discontinued;
        }
        if (lower.includes("complete")) {
            return types_1.ReleaseState.Complete;
        }
        if (lower.includes("ongoing")) {
            return types_1.ReleaseState.Ongoing;
        }
        if (lower.includes("hiatus")) {
            return types_1.ReleaseState.Hiatus;
        }
        if (lower.includes("dropped")) {
            return types_1.ReleaseState.Dropped;
        }
        return types_1.ReleaseState.Unknown;
    }
    parseAndReplaceCookies(cookies) {
        this.profile = cookies;
        if (cookies) {
            const exec = /^https?:\/\/www\.novelupdates\.com\/user\/(\d+)/.exec(cookies);
            if (!exec) {
                logger_1.default.error("data that is not profile link");
            }
            else {
                this.id = exec[1];
            }
        }
    }
    async scrapeLists() {
        if (!this.profile || !this.id) {
            throw Error("no valid user data injected");
        }
        const result = { feed: [], lists: [], media: [] };
        const [list, numberLists] = await this.scrapeList(0);
        result.media.push(...list.media);
        result.lists.push(list);
        for (let i = 1; i < numberLists; i++) {
            const [otherList, _] = await this.scrapeList(i);
            result.media.push(...otherList.media);
            result.lists.push(otherList);
        }
        return result;
    }
    async scrapeMedia(media) {
        if (!media) {
            return Promise.resolve([]);
        }
        return Promise.all(media.map(async (value) => {
            await this.scrapeMedium(value);
            return value;
        }));
    }
    async scrapeMedium(medium) {
        const link = medium.title.link;
        const $ = await SimpleNovelUpdates.loadCheerio(link);
        medium.title.text = $(".seriestitlenu").text().trim();
        const synonyms = $("#editassociated").contents();
        const lang = $("#showlang").text().trim();
        const authors = $("#showauthors a");
        const artists = $("#showartists a");
        const statusCoo = $("#editstatus").text().trim();
        const statusTL = $("#showtranslated").text().trim();
        medium.synonyms = [];
        for (let i = 0; i < synonyms.length; i += 2) {
            const synonym = synonyms.eq(i).text().trim();
            medium.synonyms.push(synonym);
        }
        medium.langCOO = lang;
        medium.langTL = "English";
        const releaseStatusCoo = SimpleNovelUpdates.getStatusCoo(statusCoo);
        if (statusTL.toLowerCase() === "yes") {
            medium.statusTl = types_1.ReleaseState.Complete;
            medium.statusCOO = releaseStatusCoo === types_1.ReleaseState.Unknown ? types_1.ReleaseState.Complete : releaseStatusCoo;
        }
        else {
            medium.statusTl = types_1.ReleaseState.Unknown;
            medium.statusCOO = releaseStatusCoo;
        }
        if (authors.length) {
            medium.authors = [];
            for (let i = 0; i < authors.length; i++) {
                const authorElement = authors.eq(i);
                const author = {
                    link: authorElement.attr("href"),
                    name: authorElement.text().trim(),
                };
                medium.authors.push(author);
            }
        }
        if (artists.length) {
            medium.artists = [];
            for (let i = 0; i < artists.length; i++) {
                const artistElement = artists.eq(i);
                const artist = {
                    link: artistElement.attr("href"),
                    name: artistElement.text().trim(),
                };
                medium.artists.push(artist);
            }
        }
        const tableData = $("table#myTable tbody tr td");
        if (!medium.latest) {
            medium.latest = NovelUpdates.scrapeListRow(3, tableData);
        }
        // @ts-ignore
        medium.latest.date = tableData.first().text().trim();
    }
    stringifyCookies() {
        return this.profile ? this.profile : "";
    }
    async test(credentials) {
        const identifier = tools_1.isString(credentials) ? credentials : credentials.identifier;
        const urlString = "https://www.novelupdates.com/readlist/?uname=" + encodeURIComponent(identifier);
        try {
            const response = await queueManager_1.queueRequestFullResponse(urlString, {
                url: urlString,
                method: "POST"
            });
            const href = response.request.uri.href;
            if (href && /^https?:\/\/www\.novelupdates\.com\/user\/\d+/.test(href)) {
                this.profile = href;
                return true;
            }
        }
        catch (e) {
            logger_1.default.error(e);
            return false;
        }
        return false;
    }
    async scrapeList(page) {
        const uri = "https://www.novelupdates.com/wp-admin/admin-ajax.php";
        const response = await queueManager_1.queueRequest(uri, {
            uri,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            method: "POST",
            body: `action=nu_prevew&pagenum=${page}&intUserID=${this.id}&isMobile=`
        });
        const lastIndexOf = response.lastIndexOf("}");
        if (!lastIndexOf) {
            throw Error("expected a json object contained in message, got " + response);
        }
        const listData = JSON.parse(response.substring(0, lastIndexOf + 1));
        const nameReg = />\s*(\w+)\s*<\s*\/\s*span\s*>/g;
        const lists = [];
        let exec;
        // tslint:disable-next-line
        while ((exec = nameReg.exec(listData.menu))) {
            lists.push(exec[1]);
        }
        const rows = cheerio_1.default.load(listData.data)("table tbody tr");
        const currentMedia = [];
        const progressReg = /\[(.+)\/(.+)]/;
        for (let i = 1; i < rows.length; i++) {
            const row = rows.eq(i);
            const tableData = row.children();
            const link = tableData.eq(1).children("a").first();
            const title = { text: link.text().trim(), link: link.attr("href") };
            const stand = tableData.eq(2).text();
            const progressExec = progressReg.exec(stand);
            if (!progressExec) {
                logger_1.default.warn("cannot match medium progress on Novelupdate Reading List: " + stand);
                continue;
            }
            const userProgress = progressExec[1];
            const tlProgress = progressExec[2];
            const userRelease = SimpleNovelUpdates.getListRelease(userProgress);
            const tlRelease = SimpleNovelUpdates.getListRelease(tlProgress);
            currentMedia.push({
                title,
                current: userRelease,
                latest: tlRelease,
                medium: tools_1.MediaType.TEXT,
            });
        }
        return [
            { link: this.profile, media: currentMedia, medium: tools_1.MediaType.TEXT, name: lists[page] },
            lists.length
        ];
    }
}
// tslint:disable-next-line
class NovelUpdates {
    constructor() {
        this.baseURI = "https://www.novelupdates.com/";
    }
    static scrapeListRow(i, tableData) {
        const link = tableData.eq(i).children("a").first();
        return { text: link.text().trim(), link: link.attr("href") };
    }
    test(credentials) {
        if (tools_1.isString(credentials)) {
            // TODO: 10.03.2020 implement this maybe or scrap this class in favor of SimpleNovelUpdates class
            return Promise.resolve(false);
        }
        return this.defaults
            .get(this.baseURI)
            .then(() => this.defaults.post("https://www.novelupdates.com/login", {
            form: {
                "log": credentials.identifier,
                "pwd": credentials.password,
                "_wp_original_http_referer": "https://www.novelupdates.com/",
                "rememberme": "forever",
                "wp-submit": "Log In",
                "redirect_to": "https://www.novelupdates.com/wp-admin/",
                "instance": "",
                "action": "login",
            },
        }))
            // a successful login returns no body on novelUpdates (30.12.18)
            .then((body) => !body);
    }
    async scrapeLists() {
        const $ = await this.loadCheerio("https://www.novelupdates.com/reading-list/");
        const listElement = $(".l-content #cssmenu ul li");
        if (!listElement.length) {
            return Promise.reject(new Error(tools_1.Errors.INVALID_SESSION));
        }
        const lists = [];
        let currentList;
        for (let i = 1; i < listElement.length; i++) {
            const element = listElement.eq(i);
            const linkElement = element.children("a").first();
            let link = linkElement.attr("href");
            link = url_1.default.resolve(this.baseURI, link);
            const list = {
                name: element.text().trim(),
                link,
                medium: tools_1.MediaType.TEXT,
                media: [],
            };
            if (element.hasClass("active")) {
                currentList = list;
            }
            lists.push(list);
        }
        // @ts-ignore
        if (!currentList) {
            throw Error();
        }
        const feed = [];
        let media = [];
        currentList.media = this.scrapeList($, media, feed);
        const promises = lists.map((list) => {
            if (list === currentList) {
                return Promise.resolve();
            }
            return this
                .loadCheerio(list.link)
                .then((cheer) => list.media = this.scrapeList(cheer, media, feed));
        });
        media = tools_1.unique(media, (a, b) => b.title.link === a.title.link);
        let feedLink = $(".l-content .seticon a:nth-child(3)").attr("href");
        feedLink = url_1.default.resolve(this.baseURI, feedLink);
        feed.push(feedLink);
        // @ts-ignore
        await Promise.all(promises);
        return {
            lists,
            media,
            feed,
        };
    }
    scrapeMedia(media) {
        if (!media) {
            return Promise.resolve([]);
        }
        return Promise.all(media.map(async (value) => {
            await this.scrapeMedium(value);
            return value;
        }));
    }
    async scrapeMedium(medium) {
        const link = medium.title.link;
        const $ = await this.loadCheerio(link);
        const synonyms = $("#editassociated").contents();
        const lang = $("#showlang").text().trim();
        const authors = $("#showauthors a");
        const artists = $("#showartists a");
        const statusCOO = $("#editstatus").text().trim();
        medium.synonyms = [];
        for (let i = 0; i < synonyms.length; i += 2) {
            const synonym = synonyms.eq(i).text().trim();
            medium.synonyms.push(synonym);
        }
        medium.langCOO = lang;
        medium.langTL = "English";
        // medium.statusCOO = statusCOO;
        if (authors.length) {
            medium.authors = [];
            for (let i = 0; i < authors.length; i++) {
                const authorElement = authors.eq(i);
                const author = {
                    link: authorElement.attr("href"),
                    name: authorElement.text().trim(),
                };
                medium.authors.push(author);
            }
        }
        if (artists.length) {
            medium.artists = [];
            for (let i = 0; i < artists.length; i++) {
                const artistElement = artists.eq(i);
                const artist = {
                    link: artistElement.attr("href"),
                    name: artistElement.text().trim(),
                };
                medium.artists.push(artist);
            }
        }
        const tableData = $("table#myTable tbody tr td");
        if (!medium.latest) {
            medium.latest = NovelUpdates.scrapeListRow(3, tableData);
        }
        // @ts-ignore
        medium.latest.date = tableData.first().text().trim();
    }
    stringifyCookies() {
        return JSON.stringify(this.jar.toJSON());
    }
    /**
     *
     * @param cookies
     */
    parseAndReplaceCookies(cookies) {
        // @ts-ignore
        this.jar = cookies ? tough_cookie_1.CookieJar.fromJSON(cookies) : new tough_cookie_1.CookieJar();
        const notUsed = {
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
            "accept-encoding": "gzip, deflate, br",
            "accept-language": "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7",
            "cache-control": "no-cache",
            "pragma": "no-cache",
            "upgrade-insecure-requests": "1",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
                "(KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36",
        };
        this.defaults = request_promise_native_1.default.defaults({
            jar: request_promise_native_1.default.jar(this.jar.store),
            simple: false,
        });
    }
    /**
     *
     * @param {string} link
     * @return {Promise<CheerioStatic>}
     */
    loadCheerio(link) {
        return queueManager_1.queueCheerioRequest(link, { url: link }, this.defaults);
    }
    scrapeList($, media, feed) {
        let feedLink = $(".l-content .seticon a:nth-child(1)").attr("href");
        feedLink = url_1.default.resolve(this.baseURI, feedLink);
        feed.push(feedLink);
        const rows = $(".l-content table tbody tr");
        const currentMedia = [];
        for (let i = 0; i < rows.length; i++) {
            const row = rows.eq(i);
            const tableData = row.children();
            const title = NovelUpdates.scrapeListRow(1, tableData);
            const current = NovelUpdates.scrapeListRow(2, tableData);
            const latest = NovelUpdates.scrapeListRow(3, tableData);
            currentMedia.push({
                title,
                current,
                latest,
                medium: tools_1.MediaType.TEXT,
            });
        }
        media.push(...currentMedia);
        return currentMedia;
    }
}
var ListType;
(function (ListType) {
    ListType[ListType["NOVELUPDATES"] = 0] = "NOVELUPDATES";
})(ListType = exports.ListType || (exports.ListType = {}));
async function novelUpdatesTocAdapter(uri) {
    /*const pageInfo = await storage.getPageInfo(uri, "scraped");

    if (pageInfo.values) {
        const date = new Date(pageInfo.values[0]);
        if (!Number.isNaN(date.getTime()) && date.toDateString() === new Date().toDateString()) {
            // do not search a toc on novelupdates twice a day
            return [];
        }
    }*/
    const medium = {
        current: {},
        latest: {},
        medium: tools_1.MediaType.TEXT,
        title: { text: "", link: uri }
    };
    await new SimpleNovelUpdates().scrapeMedium(medium);
    // await storage.updatePageInfo(uri, "scraped", [new Date().toISOString()]);
    const toc = {
        content: [],
        link: uri,
        mediumType: medium.medium,
        title: medium.title.text,
        langCOO: medium.langCOO,
        langTL: medium.langTL,
        statusCOO: medium.statusCOO,
        statusTl: medium.statusTl,
        authors: medium.authors,
        artists: medium.artists,
    };
    return [toc];
}
function getListManagerHooks() {
    return [
        {
            name: "novelupdates",
            medium: tools_1.MediaType.TEXT,
            redirectReg: /https?:\/\/www\.novelupdates\.com\/extnu\/\d+\/?/,
            domainReg: /^https?:\/\/www\.novelupdates\.com\//,
            tocAdapter: novelUpdatesTocAdapter
        }
    ];
}
exports.getListManagerHooks = getListManagerHooks;
function factory(type, cookies) {
    let instance;
    if (type === ListType.NOVELUPDATES) {
        instance = new SimpleNovelUpdates();
    }
    if (!instance) {
        throw Error("unknown list manager");
    }
    instance.parseAndReplaceCookies(cookies);
    return instance;
}
exports.factory = factory;
//# sourceMappingURL=listManager.js.map