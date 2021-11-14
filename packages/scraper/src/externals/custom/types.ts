import { EpisodeNews } from "enterprise-core/dist/types";
import { Toc } from "../types";

export type AttributeSelector = BasicAttributeSelector | AttributeRegexSelector;

interface BasicAttributeSelector {
  attribute: string;
  resolve?: string | true;
}

interface AttributeRegexSelector extends BasicAttributeSelector {
  regex: RegExp | JsonRegex;
  replace: string;
}

type Transfer<Target> = SimpleTransfer<Target> | RegexTransfer<Target>;
export type TransferType = "string" | "decimal" | "integer" | "date";

interface BasicTransfer<Target> {
  targetKey: keyof Target;
  type: TransferType;
  optional?: boolean;
}

export interface SimpleTransfer<Target> extends BasicTransfer<Target> {
  extract?: AttributeSelector;
}

export interface RegexTransfer<Target> extends BasicTransfer<Target> {
  extract: string | AttributeSelector;
}

export type Selector<Target> = SimpleSelector<Target> | RegexSelector<Target>;

interface BasicSelector<Target, T extends Transfer<Target>> {
  selector: string;
  multiple?: boolean;

  children?: Array<Selector<Target>>;
  transfers?: T[];
}

export type SimpleSelector<Target> = BasicSelector<Target, SimpleTransfer<Target>>;

export interface RegexSelector<Target> extends BasicSelector<Target, RegexTransfer<Target>> {
  regex: RegExp | JsonRegex;
}

export interface SearchConfig {
  searchUrl: string;
  base?: string;
}

export interface DownloadConfig {
  prefix?: string;
  base?: string;
}

export interface TocConfig {
  prefix?: string;
  base?: string;

  /**
   * Selector which selects the "best" element container for each news item.
   */
  container: Selector<Toc>;
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
  toc?: TocConfig;
  news?: NewsConfig;
}
