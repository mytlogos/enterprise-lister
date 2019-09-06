"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const request_promise_native_1 = tslib_1.__importDefault(require("request-promise-native"));
const url_1 = tslib_1.__importDefault(require("url"));
const tools_1 = require("../tools");
const queueManager_1 = require("./queueManager");
const tough_cookie_1 = require("tough-cookie");
class NovelUpdates {
    static scrapeListRow(i, tableData) {
        const link = tableData.eq(i).children("a").first();
        return { text: link.text().trim(), link: link.attr("href") };
    }
    constructor() {
        this.baseURI = "https://www.novelupdates.com/";
    }
    test(credentials) {
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
        medium.statusCOO = statusCOO;
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
function getListManagerHooks() {
    return [
        {
            name: "novelupdates",
            medium: tools_1.MediaType.TEXT,
            redirectReg: /https?:\/\/www\.novelupdates\.com\/extnu\/\d+\/?/
        }
    ];
}
exports.getListManagerHooks = getListManagerHooks;
function factory(type, cookies) {
    let instance;
    if (type === ListType.NOVELUPDATES) {
        instance = new NovelUpdates();
    }
    if (!instance) {
        throw Error("unknown list manager");
    }
    instance.parseAndReplaceCookies(cookies);
    return instance;
}
exports.factory = factory;
//# sourceMappingURL=listManager.js.map