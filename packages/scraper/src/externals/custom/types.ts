import { Options } from "cloudscraper";
import { EpisodeNews } from "enterprise-core/dist/types";
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
    ? `${TKey}` | `${TKey}.${RecursiveKeyOf<TObj[TKey]>}`
    : `${TKey}`;
}[keyof TObj & (string | number)];

export interface BasicTransfer<Target extends object> {
  targetKey: RecursiveKeyOf<Target>;
  type: TransferType;
  optional?: boolean;
  html?: boolean;
  mapping?: {
    include: Record<string, string>;
  };
}

export interface SimpleTransfer<Target extends object> extends BasicTransfer<Target> {
  extract?: AttributeSelector;
}

export interface RegexTransfer<Target extends object> extends BasicTransfer<Target> {
  extract: string | AttributeSelector;
}

export type Selector<Target extends object> = SimpleSelector<Target> | RegexSelector<Target>;

export interface VariableExtractor {
  variableName: string;
  value?: string;
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

export interface SearchConfig {
  searchUrl: string;
  base?: string;
}

export interface DownloadConfig {
  prefix?: string;
  base?: string;
  request?: RequestConfig;

  /**
   * Selector which selects the "best" element container for each news item.
   */
  selector: Selector<EpisodeContent> | Array<Selector<EpisodeContent>>;
}

export interface RequestConfig {
  regexUrl?: RegExp;
  transformUrl?: string;
  templateUrl?: string;
  options?: Omit<Options, "url" | "uri">;
}

export interface TocConfig {
  prefix?: string;
  base?: string;
  request?: RequestConfig;

  /**
   * Selector which selects the "best" element container for each news item.
   */
  selector: Selector<Toc> | Array<Selector<Toc>>;
}

export interface NewsConfig {
  /**
   * Base to resolve all extracted links against.
   */
  base?: string;

  /**
   * URL to query for the news page.
   */
  newsUrl: string;

  /**
   * Selector which selects the "best" element container for each news item.
   */
  container: Selector<EpisodeNews>;
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
  domain: string | HookDomain | HookDomain[];
  search?: SearchConfig;
  download?: DownloadConfig;
  toc?: TocConfig | TocConfig[];
  news?: NewsConfig;
}
