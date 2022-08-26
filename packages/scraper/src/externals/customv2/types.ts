import { BaseHookConfig } from "../custom/types";
import { RequestConfig as RequestOptions } from "../request";

export interface NewsNestedResult {
  mediumTitle: string;
  mediumTocLink: string;

  releases: Array<{
    partIndex?: number;
    partTotalIndex?: number;
    partPartialIndex?: number;
    episodeTotalIndex: number;
    episodePartialIndex?: number;
    episodeIndex: number;
    episodeTitle: string;
    link: string;
    date: Date;
  }>;
}

export interface NewsSingleResult {
  mediumTitle: string;
  mediumTocLink: string;
  partIndex?: number;
  partTotalIndex?: number;
  partPartialIndex?: number;
  episodeTotalIndex: number;
  episodePartialIndex?: number;
  episodeIndex: number;
  episodeTitle: string;
  link: string;
  date: Date;
}

export interface NewsNested {
  type: "nested";
  _$: string;
  _request?: RequestConfig;
  _contextSelectors: Record<string, string>;
  mediumTitle: string;
  mediumTocLink: string;

  releases: {
    _$: string;
    partIndex?: string;
    partTotalIndex?: string;
    partPartialIndex?: string;
    episodeTotalIndex: string;
    episodePartialIndex?: string;
    episodeIndex: string;
    episodeTitle: string;
    link: string;
    date: string;
  };
}

export interface NewsSingle {
  type: "single";
  _$: string;
  _request?: RequestConfig;
  _contextSelectors: Record<string, string>;
  mediumTitle: string;
  mediumTocLink: string;
  partIndex?: string;
  partTotalIndex?: string;
  partPartialIndex?: string;
  episodeTotalIndex: string;
  episodePartialIndex?: string;
  episodeIndex: string;
  episodeTitle: string;
  link: string;
  date: string;
}

export interface SearchSingle {
  _$: string;
  _request?: RequestConfig;
  _contextSelectors: Record<string, string>;
  coverUrl?: string;
  link: string;
  title: string;
  author?: string;
  medium: string;
}

export interface DownloadSingle {
  _$: string;
  _request?: RequestConfig;
  _contextSelectors: Record<string, string>;
  mediumTitle: string;
  episodeTitle: string;
  index?: string;
  locked?: string;
  content: string;
}

export interface TocGenerator {
  _$: string;
  _request?: RequestConfig;
  _contextSelectors: Record<string, string>;
  _generator: {
    maxIndex: string; // x-ray selector
    urlRegex: JsonRegex;
    urlTemplate: string; // regex replace and context template
    titleTemplate: string;
  };
  title: string;
  synonyms?: string;
  link: string;
  langCOO?: string;
  langTL?: string;
  statusCOO?: string;
  statusTl?: string;
  authors?: string;
  artists?: string;
}

export interface TocSingle {
  _$: string;
  _request?: RequestConfig;
  _contextSelectors: Record<string, string>;
  title: string;
  content: {
    _$: string;
    title: string;
    combiIndex: string;
    totalIndex: string;
    partialIndex?: string;
    url: string;
    releaseDate?: string;
    noTime?: string;
    locked?: string;
    tocId?: string;
  };
  synonyms?: string;
  link: string;
  langCOO?: string;
  langTL?: string;
  statusCOO?: string;
  statusTl?: string;
  authors?: string;
  artists?: string;
}

export interface JsonRegex {
  flags: string;
  pattern: string;
}

export interface RequestConfig {
  regexUrl?: JsonRegex;
  transformUrl?: string;
  templateUrl?: string;
  templateBody?: string;
  jsonResponse?: boolean;
  fullResponse?: boolean;
  options?: Omit<RequestOptions<any>, "url" | "uri">;
}

export interface BaseScrapeConfig {
  regexes: Record<string, JsonRegex>;
  data: Record<string, any> | Array<Record<string, any>>;
}

export interface NewsConfig extends BaseScrapeConfig {
  data: Array<NewsNested | NewsSingle>;
  newsUrl: string;
}

export interface SearchConfig extends BaseScrapeConfig {
  data: SearchSingle[];
  searchUrl: string;
}

export interface TocConfig extends BaseScrapeConfig {
  data: Array<TocSingle | TocGenerator>;
}

export interface DownloadConfig extends BaseScrapeConfig {
  data: DownloadSingle[];
}

export interface HookConfig extends BaseHookConfig {
  version: 2;
  news?: NewsConfig;
  search?: SearchConfig;
  toc?: TocConfig;
  download?: DownloadConfig;
}
