import { Options } from "cloudscraper";
import { MediaType } from "enterprise-core/dist/tools";

export interface NewsNested {
  type: "nested";
  _$: string;
  _request: RequestConfig;
  mediumTitle: string;
  mediumTocLink: string;

  releases: {
    _$: string;
    partIndex: string;
    partTotalIndex: string;
    partPartialIndex: string;
    episodeTotalIndex: string;
    episodePartialIndex: string;
    episodeIndex: string;
    episodeTitle: string;
    link: string;
    date: string;
  };
}

export interface NewsSingle {
  type: "single";
  _$: string;
  _request: RequestConfig;
  mediumTitle: string;
  mediumTocLink: string;
  partIndex: string;
  partTotalIndex: string;
  partPartialIndex: string;
  episodeTotalIndex: string;
  episodePartialIndex: string;
  episodeIndex: string;
  episodeTitle: string;
  link: string;
  date: string;
}

interface SearchSingle {
  _$: string;
  _request: RequestConfig;
  coverUrl?: string;
  link: string;
  title: string;
  author?: string;
  medium: string;
}

interface DownloadSingle {
  _$: string;
  _request: RequestConfig;
  mediumTitle: string;
  episodeTitle: string;
  index?: string;
  locked?: string;
  content: string;
}

interface TocSingle {
  _$: string;
  _request: RequestConfig;
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
  mediumId?: string;
  synonyms?: string;
  mediumType: string;
  partsOnly?: string;
  end?: string;
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
  options?: Omit<Options, "url" | "uri">;
}

interface NewsConfig {
  data: Array<NewsNested | NewsSingle>;
  regexes: Record<string, JsonRegex>;
  newsUrl: string;
}

interface SearchConfig {
  regexes: Record<string, JsonRegex>;
}

interface TocConfig {
  regexes: Record<string, JsonRegex>;
  data: TocSingle[];
}

interface DownloadConfig {
  regexes: Record<string, JsonRegex>;
}

export interface Config {
  name: string;
  base: string;
  medium: MediaType;
  news?: NewsConfig;
  search?: SearchConfig;
  toc?: TocConfig;
  download?: DownloadConfig;
}
