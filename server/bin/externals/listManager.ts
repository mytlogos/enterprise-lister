import request from "request-promise-native";
import cheerio from "cheerio";
import url from "url";
import {Errors, MediaType, unique} from "../tools";
import {queueRequest} from "./queueManager";
import CookieJar from "tough-cookie";
import {Hook} from "./types";

class NovelUpdates implements ListManager {

    public static scrapeListRow(i: number, tableData: Cheerio) {
        const link = tableData.eq(i).children("a").first();
        return {text: link.text().trim(), link: link.attr("href")};
    }

    public jar: any;

    private defaults: any;
    private readonly baseURI: string;

    constructor() {
        this.baseURI = "https://www.novelupdates.com/";
    }

    public test(credentials: { identifier: string; password: string; }): Promise<boolean> {
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
            .then((body: any) => !body);
    }

    public async scrapeLists() {
        const $ = await this.loadCheerio("https://www.novelupdates.com/reading-list/");

        const listElement = $(".l-content #cssmenu ul li");

        if (!listElement.length) {
            return Promise.reject(new Error(Errors.INVALID_SESSION));
        }

        const lists = [];
        let currentList: ScrapeList;

        for (let i = 1; i < listElement.length; i++) {
            const element = listElement.eq(i);
            const linkElement = element.children("a").first();
            let link = linkElement.attr("href");
            link = url.resolve(this.baseURI, link);

            const list: ScrapeList = {
                name: element.text().trim(),
                link,
                medium: MediaType.TEXT,
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

        const feed: string[] = [];

        let media: ScrapeMedium[] = [];
        currentList.media = this.scrapeList($, media, feed);

        const promises = lists.map((list) => {
            if (list === currentList) {
                return Promise.resolve();
            }
            return this
                .loadCheerio(list.link)
                .then((cheer: CheerioStatic) => list.media = this.scrapeList(cheer, media, feed));
        });

        media = unique(media, (a, b) => b.title.link === a.title.link);

        let feedLink = $(".l-content .seticon a:nth-child(3)").attr("href");
        feedLink = url.resolve(this.baseURI, feedLink);
        feed.push(feedLink);

        // @ts-ignore
        await Promise.all(promises);

        return {
            lists,
            media,
            feed,
        };
    }

    public scrapeMedia(media: ScrapeMedium[]): Promise<ScrapeMedium[]> {
        if (!media) {
            return Promise.resolve([]);
        }
        return Promise.all(media.map(async (value) => {
            await this.scrapeMedium(value);
            return value;
        }));
    }

    public async scrapeMedium(medium: ScrapeMedium): Promise<void> {
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


    public stringifyCookies() {
        return JSON.stringify(this.jar.toJSON());
    }

    /**
     *
     * @param cookies
     */
    public parseAndReplaceCookies(cookies?: string): void {
        // @ts-ignore
        this.jar = cookies ? CookieJar.fromJSON(cookies) : new CookieJar();
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
        this.defaults = request.defaults({
            jar: request.jar(this.jar.store),
            simple: false,
        });
    }

    /**
     *
     * @param {string} link
     * @return {Promise<CheerioStatic>}
     */
    public loadCheerio(link: string): Promise<CheerioStatic> {
        return queueRequest(link, {url: link}, this.defaults)
            .then((body: string) => cheerio.load(body));
    }

    public scrapeList($: CheerioStatic, media: ScrapeMedium[], feed: string[]): ScrapeMedium[] {
        let feedLink = $(".l-content .seticon a:nth-child(1)").attr("href");
        feedLink = url.resolve(this.baseURI, feedLink);
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
                medium: MediaType.TEXT,
            });
        }
        media.push(...currentMedia);
        return currentMedia;
    }
}

const listTypes = {
    NOVELUPDATES: 0x0,
};

export interface ListScrapeResult {
    lists: ScrapeList[];
    media: ScrapeMedium[];
    feed: string[];
}

export interface RowResult {
    text: string;
    link: string;
    date?: string;
}

export interface ScrapeList {
    name: string;
    link: string;
    medium: number;
    media: ScrapeMedium[] | number[];
}

export interface ScrapeMedium {
    title: RowResult;
    current: RowResult;
    latest: RowResult;
    medium: number;
    synonyms?: string[];
    langCOO?: string;
    langTL?: string;
    statusCOO?: string;
    authors?: Array<{ name: string, link: string }>;
    artists?: Array<{ name: string, link: string }>;
}

export function getListManagerHooks(): Hook[] {
    return [{redirectReg: /https?:\/\/www\.novelupdates\.com\/extnu\/\d+\/?/}];
}

export interface ListManager {
    test(credentials: { identifier: string, password: string }): Promise<boolean>;

    scrapeLists(): Promise<ListScrapeResult>;

    scrapeMedium(medium: ScrapeMedium): void;

    scrapeMedia(media: ScrapeMedium[]): Promise<ScrapeMedium[]>;

    stringifyCookies(): string;

    parseAndReplaceCookies(cookies: string): void;
}

export function factory(type: number, cookies?: string): ListManager {
    let instance;
    if (type === listTypes.NOVELUPDATES) {
        instance = new NovelUpdates();
    }
    if (!instance) {
        throw Error("unknown list manager");
    }
    instance.parseAndReplaceCookies(cookies);
    return instance;
}
