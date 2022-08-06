import { ScrapeName } from "enterprise-core/dist/types";
import { ScrapeEvent } from "../externals/scraperTools";
import { checkTocsJob } from "../jobs/checkToc";
import { feed } from "../jobs/feed";
import { news, scrapeNewsJob } from "../jobs/news";
import { list } from "../jobs/oneTimeUser";
import { queueExternalUser } from "../jobs/queueExternalUser";
import { queueTocsJob } from "../jobs/queueTocs";
import { remapMediaParts } from "../jobs/remapMediumParts";
import { searchForTocJob } from "../jobs/searchForToc";
import { toc, oneTimeToc } from "../jobs/toc";

export class ScrapeJob {
  public static readonly toc = new ScrapeJob(ScrapeName.toc, toc, ScrapeEvent.TOC);
  public static readonly oneTimeToc = new ScrapeJob(ScrapeName.oneTimeToc, oneTimeToc, ScrapeEvent.TOC);
  public static readonly searchForToc = new ScrapeJob(ScrapeName.searchForToc, searchForTocJob, ScrapeEvent.TOC);
  public static readonly feed = new ScrapeJob(ScrapeName.feed, feed, ScrapeEvent.FEED);
  public static readonly news = new ScrapeJob(ScrapeName.news, news, ScrapeEvent.NEWS);
  public static readonly newsAdapter = new ScrapeJob(ScrapeName.newsAdapter, scrapeNewsJob, ScrapeEvent.NEWS);
  public static readonly oneTimeUser = new ScrapeJob(ScrapeName.oneTimeUser, list, ScrapeEvent.LIST);
  public static readonly checkTocs = new ScrapeJob(ScrapeName.checkTocs, checkTocsJob);
  public static readonly queueTocs = new ScrapeJob(ScrapeName.queueTocs, queueTocsJob);
  public static readonly remapMediaParts = new ScrapeJob(ScrapeName.remapMediaParts, remapMediaParts);
  public static readonly queueExternalUser = new ScrapeJob(ScrapeName.queueExternalUser, queueExternalUser);

  private constructor(
    public readonly name: ScrapeName,
    public readonly func: (...args: any[]) => any,
    public readonly event?: ScrapeEvent,
  ) {}

  public toString(): ScrapeName {
    return this.name;
  }
}
