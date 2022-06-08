import request from "request-promise-native";
import url from "url";
import { Errors, isString, MediaType, unique } from "enterprise-core/dist/tools";
import { queueCheerioRequest, queueRequest, queueRequestFullResponse } from "./queueManager";
import { CookieJar } from "tough-cookie";
import { Hook, Toc } from "./types";
import logger from "enterprise-core/dist/logger";
import * as cheerio from "cheerio";
import { ReleaseState, EmptyPromise, Optional } from "enterprise-core/dist/types";
import { ValidationError } from "enterprise-core/dist/error";
import { ScraperError } from "./errors";
import { getText } from "./direct/directTools";

interface SimpleReadingList {
  menu: string;
  data: string;
  similar: string;
}

class SimpleNovelUpdates implements ListManager {
  private static getListRelease(s: string): ListScrapeRelease {
    const episodeReg = /\s(v(\d+))?\s*(c(\d+)(-(\d+))?)?\s*(\(end\))?\s/;
    const partGroup = 2;
    const firstEpisodeGroup = 4;
    const lastEpisodeGroup = 6;
    const endGroup = 7;
    const exec = episodeReg.exec(s);

    if (!exec) {
      return {};
    } else {
      const lastEpisode = exec[lastEpisodeGroup];
      const firstEpisode = exec[firstEpisodeGroup];
      return {
        end: exec[endGroup] != null,
        partIndex: exec[partGroup] ? Number(exec[partGroup]) : undefined,
        episodeIndex: lastEpisode ? Number(lastEpisode) : firstEpisode ? Number(firstEpisode) : undefined,
      };
    }
  }

  private static loadCheerio(link: string): Promise<cheerio.CheerioAPI> {
    return queueCheerioRequest(link, { url: link });
  }

  private static getStatusCoo(s: string): ReleaseState {
    if (s.includes("\n")) {
      return ReleaseState.Unknown;
    }
    const lower = s.toLowerCase();
    if (lower.includes("discontinued")) {
      return ReleaseState.Discontinued;
    }
    if (lower.includes("complete")) {
      return ReleaseState.Complete;
    }
    if (lower.includes("ongoing")) {
      return ReleaseState.Ongoing;
    }
    if (lower.includes("hiatus")) {
      return ReleaseState.Hiatus;
    }
    if (lower.includes("dropped")) {
      return ReleaseState.Dropped;
    }
    return ReleaseState.Unknown;
  }

  private profile?: string;

  private id?: string;

  public parseAndReplaceCookies(cookies?: string): void {
    this.profile = cookies;
    if (cookies) {
      const exec = /^https?:\/\/www\.novelupdates\.com\/user\/(\d+)/.exec(cookies);
      if (!exec) {
        logger.error("data that is not profile link");
      } else {
        this.id = exec[1];
      }
    }
  }

  public async scrapeLists(): Promise<ListScrapeResult> {
    if (!this.profile || !this.id) {
      throw new ValidationError("no valid user data injected");
    }
    const result: ListScrapeResult = { feed: [], lists: [], media: [] };
    const [list, numberLists] = await this.scrapeList(0);
    result.media.push(...(list.media as ScrapeMedium[]));
    result.lists.push(list);

    for (let i = 1; i < numberLists; i++) {
      const [otherList] = await this.scrapeList(i);
      result.media.push(...(otherList.media as ScrapeMedium[]));
      result.lists.push(otherList);
    }
    return result;
  }

  public async scrapeMedia(media: ScrapeMedium[]): Promise<ScrapeMedium[]> {
    if (!media) {
      return Promise.resolve([]);
    }
    return Promise.all(
      media.map(async (value) => {
        await this.scrapeMedium(value);
        return value;
      }),
    );
  }

  public async scrapeMedium(medium: ScrapeMedium): EmptyPromise {
    const link = medium.title.link;

    const $ = await SimpleNovelUpdates.loadCheerio(link);
    medium.title.text = getText($(".seriestitlenu")).trim();
    const synonyms = $("#editassociated").contents();

    const lang = getText($("#showlang")).trim();
    const authors = $("#showauthors a");
    const artists = $("#showartists a");
    const statusCoo = getText($("#editstatus")).trim();
    const statusTL = getText($("#showtranslated")).trim();

    medium.synonyms = [];

    for (let i = 0; i < synonyms.length; i += 2) {
      const synonym = getText(synonyms.eq(i)).trim();
      medium.synonyms.push(synonym);
    }

    medium.langCOO = lang;
    medium.langTL = "English";
    const releaseStatusCoo: ReleaseState = SimpleNovelUpdates.getStatusCoo(statusCoo);
    if (statusTL.toLowerCase() === "yes") {
      medium.statusTl = ReleaseState.Complete;
      medium.statusCOO = releaseStatusCoo === ReleaseState.Unknown ? ReleaseState.Complete : releaseStatusCoo;
    } else {
      medium.statusTl = ReleaseState.Unknown;
      medium.statusCOO = releaseStatusCoo;
    }

    if (authors.length) {
      medium.authors = [];

      for (let i = 0; i < authors.length; i++) {
        const authorElement = authors.eq(i);
        const author = {
          link: authorElement.attr("href") as string,
          name: getText(authorElement).trim(),
        };
        medium.authors.push(author);
      }
    }
    if (artists.length) {
      medium.artists = [];

      for (let i = 0; i < artists.length; i++) {
        const artistElement = artists.eq(i);
        const artist = {
          link: artistElement.attr("href") as string,
          name: getText(artistElement).trim(),
        };
        medium.artists.push(artist);
      }
    }
    const tableData = $("table#myTable tbody tr td");

    if (!medium.latest) {
      medium.latest = NovelUpdates.scrapeListRow(3, tableData);
    }
    // @ts-expect-error
    medium.latest.date = getText(tableData.first()).trim();
  }

  public stringifyCookies(): string {
    return this.profile ? this.profile : "";
  }

  public async test(credentials: { identifier: string; password: string } | string): Promise<boolean> {
    const identifier = isString(credentials) ? credentials : credentials.identifier;
    const urlString = "https://www.novelupdates.com/readlist/?uname=" + encodeURIComponent(identifier);
    try {
      const response = await queueRequestFullResponse(urlString, {
        url: urlString,
        method: "POST",
      });
      const href = response.request.uri.href;
      if (href && /^https?:\/\/www\.novelupdates\.com\/user\/\d+/.test(href)) {
        this.profile = href;
        return true;
      }
    } catch (e) {
      logger.error(e);
      return false;
    }
    return false;
  }

  private async scrapeList(page: number): Promise<[ScrapeList, number]> {
    const uri = "https://www.novelupdates.com/wp-admin/admin-ajax.php";
    const response = await queueRequest(uri, {
      uri,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
      body: `action=nu_prevew&pagenum=${page}&intUserID=${this.id}&isMobile=`,
    });

    const lastIndexOf = response.lastIndexOf("}");
    if (!lastIndexOf) {
      throw new ScraperError("expected a json object contained in message, got " + response);
    }
    const listData: SimpleReadingList = JSON.parse(response.substring(0, lastIndexOf + 1));
    const nameReg = />\s*(\w+)\s*<\s*\/\s*span\s*>/g;
    const lists = [];
    let exec;
    // tslint:disable-next-line
    while ((exec = nameReg.exec(listData.menu))) {
      lists.push(exec[1]);
    }

    const rows = cheerio.load(listData.data)("table tbody tr");

    const currentMedia: ScrapeMedium[] = [];
    const progressReg = /\[(.+)\/(.+)]/;

    for (let i = 1; i < rows.length; i++) {
      const row = rows.eq(i);
      const tableData = row.children();

      const link = tableData.eq(1).children("a").first();
      const title = { text: getText(link).trim(), link: link.attr("href") as string };
      const stand = getText(tableData.eq(2));

      const progressExec = progressReg.exec(stand);

      if (!progressExec) {
        logger.warn("cannot match medium progress on Novelupdate Reading List: " + stand);
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
        medium: MediaType.TEXT,
      });
    }
    return [
      { link: this.profile as string, media: currentMedia, medium: MediaType.TEXT, name: lists[page] },
      lists.length,
    ];
  }
}

// tslint:disable-next-line
class NovelUpdates implements ListManager {
  public static scrapeListRow(i: number, tableData: cheerio.Cheerio<cheerio.Element>) {
    const link = tableData.eq(i).children("a").first();
    return { text: getText(link).trim(), link: link.attr("href") as string };
  }

  public jar: any;

  private defaults: any;
  private readonly baseURI: string;

  private constructor() {
    this.baseURI = "https://www.novelupdates.com/";
  }

  public test(credentials: { identifier: string; password: string } | string): Promise<boolean> {
    if (isString(credentials)) {
      // TODO: 10.03.2020 implement this maybe or scrap this class in favor of SimpleNovelUpdates class
      return Promise.resolve(false);
    }
    return (
      this.defaults
        .get(this.baseURI)
        .then(() =>
          this.defaults.post("https://www.novelupdates.com/login", {
            form: {
              log: credentials.identifier,
              pwd: credentials.password,
              _wp_original_http_referer: "https://www.novelupdates.com/",
              rememberme: "forever",
              "wp-submit": "Log In",
              redirect_to: "https://www.novelupdates.com/wp-admin/",
              instance: "",
              action: "login",
            },
          }),
        )
        // a successful login returns no body on novelUpdates (30.12.18)
        .then((body: any) => !body)
    );
  }

  public async scrapeLists() {
    const $ = await this.loadCheerio("https://www.novelupdates.com/reading-list/");

    const listElement = $(".l-content #cssmenu ul li");

    if (!listElement.length) {
      return Promise.reject(new ScraperError(Errors.INVALID_SESSION));
    }

    const lists = [];
    let currentList: Optional<ScrapeList>;

    for (let i = 1; i < listElement.length; i++) {
      const element = listElement.eq(i);
      const linkElement = element.children("a").first();
      let link = linkElement.attr("href") as string;
      link = new url.URL(link, this.baseURI).href;

      const list: ScrapeList = {
        name: getText(element).trim(),
        link,
        medium: MediaType.TEXT,
        media: [],
      };

      if (element.hasClass("active")) {
        currentList = list;
      }
      lists.push(list);
    }

    if (!currentList) {
      throw new ScraperError("Current Novelupdates List not found!");
    }

    const feed: string[] = [];

    let media: ScrapeMedium[] = [];
    currentList.media = this.scrapeList($, media, feed);

    const promises = lists.map((list) => {
      if (list === currentList) {
        return Promise.resolve();
      }
      return this.loadCheerio(list.link).then(
        (cheer: cheerio.CheerioAPI) => (list.media = this.scrapeList(cheer, media, feed)),
      );
    });

    media = unique(media, (a, b) => b.title.link === a.title.link);

    let feedLink = $(".l-content .seticon a:nth-child(3)").attr("href") as string;
    feedLink = new url.URL(feedLink, this.baseURI).href;
    feed.push(feedLink);

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
    return Promise.all(
      media.map(async (value) => {
        await this.scrapeMedium(value);
        return value;
      }),
    );
  }

  public async scrapeMedium(medium: ScrapeMedium): EmptyPromise {
    const link = medium.title.link;

    const $ = await this.loadCheerio(link);
    const synonyms = $("#editassociated").contents();

    const lang = getText($("#showlang")).trim();
    const authors = $("#showauthors a");
    const artists = $("#showartists a");
    // const statusCOO = getText($("#editstatus")).trim();

    medium.synonyms = [];

    for (let i = 0; i < synonyms.length; i += 2) {
      const synonym = getText(synonyms.eq(i)).trim();
      medium.synonyms.push(synonym);
    }

    medium.langCOO = lang;
    medium.langTL = "English";
    // TODO: parse statusCOO to ReleaseState
    // medium.statusCOO = statusCOO;

    if (authors.length) {
      medium.authors = [];

      for (let i = 0; i < authors.length; i++) {
        const authorElement = authors.eq(i);
        const author = {
          link: authorElement.attr("href") as string,
          name: getText(authorElement).trim(),
        };
        medium.authors.push(author);
      }
    }
    if (artists.length) {
      medium.artists = [];

      for (let i = 0; i < artists.length; i++) {
        const artistElement = artists.eq(i);
        const artist = {
          link: artistElement.attr("href") as string,
          name: getText(artistElement).trim(),
        };
        medium.artists.push(artist);
      }
    }
    const tableData = $("table#myTable tbody tr td");

    if (!medium.latest) {
      medium.latest = NovelUpdates.scrapeListRow(3, tableData);
    }
    // @ts-expect-error
    medium.latest.date = getText(tableData.first()).trim();
  }

  public stringifyCookies() {
    return JSON.stringify(this.jar.toJSON());
  }

  /**
   *
   * @param cookies
   */
  public parseAndReplaceCookies(cookies?: string): void {
    this.jar = cookies ? CookieJar.fromJSON(cookies) : new CookieJar();
    // TODO: remove this code when it is certainly unneeded
    // const notUsed = {
    //     "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
    //     "accept-encoding": "gzip, deflate, br",
    //     "accept-language": "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7",
    //     "cache-control": "no-cache",
    //     "pragma": "no-cache",
    //     "upgrade-insecure-requests": "1",
    //     "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    //         "(KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36",
    // };
    this.defaults = request.defaults({
      jar: request.jar(this.jar.store),
      simple: false,
    });
  }

  /**
   *
   * @param {string} link
   * @return {Promise<cheerio.CheerioAPI>}
   */
  public loadCheerio(link: string): Promise<cheerio.CheerioAPI> {
    return queueCheerioRequest(link, { url: link }, this.defaults);
  }

  public scrapeList($: cheerio.CheerioAPI, media: ScrapeMedium[], feed: string[]): ScrapeMedium[] {
    let feedLink = $(".l-content .seticon a:nth-child(1)").attr("href") as string;
    feedLink = new url.URL(feedLink, this.baseURI).href;
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

export enum ListType {
  NOVELUPDATES = 0x0,
}

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

interface ListScrapeRelease {
  partIndex?: number;
  episodeIndex?: number;
  end?: boolean;
}

export interface ScrapeMedium {
  title: RowResult;
  current: ListScrapeRelease | RowResult;
  latest: ListScrapeRelease | RowResult;
  medium: number;
  synonyms?: string[];
  langCOO?: string;
  langTL?: string;
  statusCOO?: ReleaseState;
  statusTl?: ReleaseState;
  authors?: Array<{ name: string; link: string }>;
  artists?: Array<{ name: string; link: string }>;
}

async function novelUpdatesTocAdapter(uri: string) {
  /*const pageInfo = await storage.getPageInfo(uri, "scraped");

    if (pageInfo.values) {
        const date = new Date(pageInfo.values[0]);
        if (!Number.isNaN(date.getTime()) && date.toDateString() === new Date().toDateString()) {
            // do not search a toc on novelupdates twice a day
            return [];
        }
    }*/
  const medium: ScrapeMedium = {
    current: {},
    latest: {},
    medium: MediaType.TEXT,
    title: { text: "", link: uri },
  };
  await new SimpleNovelUpdates().scrapeMedium(medium);
  // await storage.updatePageInfo(uri, "scraped", [new Date().toISOString()]);
  const toc: Toc = {
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

export function getListManagerHooks(): Hook[] {
  return [
    {
      name: "novelupdates",
      medium: MediaType.TEXT,
      redirectReg: /https?:\/\/www\.novelupdates\.com\/extnu\/\d+\/?/,
      domainReg: /^https?:\/\/www\.novelupdates\.com\//,
      tocAdapter: novelUpdatesTocAdapter,
    },
  ];
}

export interface ListManager {
  test(credentials: { identifier: string; password: string } | string): Promise<boolean>;

  scrapeLists(): Promise<ListScrapeResult>;

  scrapeMedium(medium: ScrapeMedium): EmptyPromise;

  scrapeMedia(media: ScrapeMedium[]): Promise<ScrapeMedium[]>;

  stringifyCookies(): string;

  parseAndReplaceCookies(cookies: string): void;
}

export function factory(type: number, cookies?: string): ListManager {
  let instance;
  if (type === ListType.NOVELUPDATES) {
    instance = new SimpleNovelUpdates();
  }
  if (!instance) {
    throw new ValidationError("unknown list manager");
  }
  instance.parseAndReplaceCookies(cookies);
  return instance;
}
