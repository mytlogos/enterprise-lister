import { MediaType } from "enterprise-core/dist/tools";
import { ContentDownloader, NewsScraper, SearchScraper, TocScraper, TocSearchScraper } from "../types";
import { createDownloadScraper } from "./download";
import { createNewsScraper } from "./news";
import { createTocScraper } from "./toc";
import { HookConfig } from "./types";

type Conditional<T, R> = T extends undefined ? undefined : R;

export interface CustomHook<T extends HookConfig = HookConfig> {
  name: string;
  medium: MediaType;
  disabled?: boolean;
  domainReg?: RegExp;
  tocPattern?: RegExp;
  redirectReg?: RegExp;
  newsAdapter: Conditional<T["news"], NewsScraper>;
  tocAdapter: Conditional<T["toc"], TocScraper>;
  tocSearchAdapter: Conditional<T["news"], TocSearchScraper>;
  searchAdapter: Conditional<T["search"], SearchScraper>;
  contentDownloadAdapter: Conditional<T["download"], ContentDownloader>;
}

export function createHook<T extends HookConfig>(config: T): CustomHook<T> {
  return {
    medium: config.medium,
    name: config.name,
    // @ts-expect-error
    newsAdapter: createNewsScraper(config),
    // @ts-expect-error
    tocAdapter: createTocScraper(config),
    // @ts-expect-error
    contentDownloadAdapter: createDownloadScraper(config),
  };
}
