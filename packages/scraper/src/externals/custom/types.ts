import { Options } from "cloudscraper";
import { EpisodeNews, SearchResult } from "enterprise-core/dist/types";
import { EpisodeContent, Toc } from "../types";

export type AttributeSelector = BasicAttributeSelector | AttributeRegexSelector;

interface BasicAttributeSelector {
  attribute: string;
  resolve?: string | true;
}

interface AttributeRegexSelector extends BasicAttributeSelector {
  regex: RegExp | JsonRegex;
  replace: string;
}

type Transfer<Target extends object> = SimpleTransfer<Target> | RegexTransfer<Target>;
export type TransferType = "string" | "decimal" | "integer" | "date";
export type ArrayType = "[*]";

// @ts-expect-error
type NewType<K extends keyof O & (string | number), O extends object> = `${K}.${RecursiveKeyOf<O[K]>}`;

/**
 * Modified from https://stackoverflow.com/a/65333050
 * to infer element type of arrays.
 */
export type RecursiveKeyOf<TObj extends object> = {
  [TKey in keyof TObj & (string | number)]: TObj[TKey] extends Array<infer U>
    ? U extends object
      ? `${TKey}` | `${TKey}.${ArrayType}.${RecursiveKeyOf<U>}`
      : `${TKey}`
    : TObj[TKey] extends object
    ? `${TKey}` | NewType<TKey, TObj>
    : `${TKey}`;
}[keyof TObj & (string | number)];

export interface JSONTransfer<Target extends object, Source extends object> {
  sourceKey: RecursiveKeyOf<Source>;
  targetKey: RecursiveKeyOf<Target>;
  optional?: boolean;
  mapping?: TransferMapping;
}

export interface TransferMapping {
  include: Record<string, string>;
}

export interface BasicTransfer<Target extends object> {
  targetKey: RecursiveKeyOf<Target>;
  type: TransferType;
  optional?: boolean;
  html?: boolean;
  mapping?: TransferMapping;
}

export interface SimpleTransfer<Target extends object> extends BasicTransfer<Target> {
  extract?: AttributeSelector;
}

export interface RegexTransfer<Target extends object> extends BasicTransfer<Target> {
  extract: string | AttributeSelector;
}

export interface JsonSelector<Target extends object, Source extends object> {
  selector: string;
  multiple?: boolean;

  children?: Array<JsonSelector<Target, Source>>;
  transfers?: Array<JSONTransfer<Target, Source>>;
  variables?: VariableExtractor[];
}

export type Selector<Target extends object> = SimpleSelector<Target> | RegexSelector<Target>;

export interface VariableExtractor {
  variableName: string;
  value?: string; // for regex selector, else the full text is taken
  extract?: AttributeSelector;
}

interface BasicSelector<Target extends object, T extends Transfer<Target>> {
  selector: string;
  multiple?: boolean;

  children?: Array<Selector<Target>>;
  transfers?: T[];
  variables?: VariableExtractor[];
}

export type SimpleSelector<Target extends object> = BasicSelector<Target, SimpleTransfer<Target>>;

export interface RegexSelector<Target extends object> extends BasicSelector<Target, RegexTransfer<Target>> {
  regex: RegExp | JsonRegex;
}

export interface BasicScraperConfig<T> {
  /**
   * TODO: For what is this?
   */
  prefix?: string;
  /**
   * Base to resolve all extracted links against.
   */
  base?: string;
  /**
   * Modify the way a request is done
   */
  request?: RequestConfig;
  /**
   * Select Values from Response Data into Result or Context Variables
   */
  selector: T | T[];
}

export interface SearchConfig<Source extends object = Record<any, any>>
  extends BasicScraperConfig<JsonSelector<SearchResult, Source>> {
  searchUrl: string;
}

export type DownloadConfig = BasicScraperConfig<Selector<EpisodeContent>>;

export interface RequestConfig {
  regexUrl?: JsonRegex;
  transformUrl?: string;
  templateUrl?: string;
  templateBody?: string;
  jsonResponse?: boolean;
  fullResponse?: boolean;
  options?: Omit<Options, "url" | "uri">;
}

export type TocConfig = BasicScraperConfig<Selector<Toc>>;

export interface NewsConfig extends BasicScraperConfig<Selector<EpisodeNews>> {
  /**
   * URL to query for the news page.
   */
  newsUrl: string;
}

export interface JsonRegex {
  flags: string;
  pattern: string;
}

export type HookDomain = string | JsonRegex | RegExp;

export interface HookConfig {
  name: string;
  medium: number;
  base: string;
  domain: JsonRegex;
  search?: SearchConfig;
  download?: DownloadConfig;
  toc?: TocConfig | TocConfig[];
  news?: NewsConfig;
}
