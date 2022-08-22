import { Options } from "cloudscraper";
import { BaseHookConfig } from "../custom/types";

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
  coverUrl?: string;
  link: string;
  title: string;
  author?: string;
  medium: string;
}

export interface DownloadSingle {
  _$: string;
  _request?: RequestConfig;
  mediumTitle: string;
  episodeTitle: string;
  index?: string;
  locked?: string;
  content: string;
}

export interface TocSingle {
  _$: string;
  _request?: RequestConfig;
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
  options?: Omit<Options, "url" | "uri">;
}

export interface NewsConfig {
  regexes: Record<string, JsonRegex>;
  data: Array<NewsNested | NewsSingle>;
  newsUrl: string;
}

export interface SearchConfig {
  regexes: Record<string, JsonRegex>;
  data: SearchSingle[];
  searchUrl: string;
}

export interface TocConfig {
  regexes: Record<string, JsonRegex>;
  data: TocSingle[];
}

export interface DownloadConfig {
  regexes: Record<string, JsonRegex>;
  data: DownloadSingle[];
}

export interface HookConfig extends BaseHookConfig {
  version: 2;
  news?: NewsConfig;
  search?: SearchConfig;
  toc?: TocConfig;
  download?: DownloadConfig;
}
