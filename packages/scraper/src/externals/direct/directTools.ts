import logger, { LogLevel, LogMeta } from "enterprise-core/dist/logger";
import { EpisodeContent, TocContent, TocEpisode, TocPart, TocScraper, Toc, LinkablePerson } from "../types";
import {
  combiIndex,
  equalsIgnore,
  extractIndices,
  MediaType,
  sanitizeString,
  stringify,
} from "enterprise-core/dist/tools";
import * as url from "url";
import { ReleaseState, TocSearchMedium, Optional, Nullable } from "enterprise-core/dist/types";
import { checkTocContent } from "../scraperTools";
import * as cheerio from "cheerio";
import request from "../request";
import { ValidationError } from "enterprise-core/dist/error";

export enum LogType {
  INDEX_FORMAT = "unknown index format",
  TIME_FORMAT = "changed time format",
  TITLE_FORMAT = "changed title format",
  CONTENT_FORMAT = "changed content format",
  LINK_FORMAT = "changed link format",
  MEDIUM_TITLE_FORMAT = "changed medium title format",
  NO_EPISODES = "no episodes found",
  INVALID_LINK = "invalid link",
  API_CHANGED = "api changed",
}

/**
 * Get the text of element and all its descendants, except data nodes like style and script.
 */
export function getText(element: cheerio.Cheerio<cheerio.AnyNode>): string {
  // workaround till commit https://github.com/cheeriojs/cheerio/commit/03a28fa1d975685a9a07648bed5ba250e265fd64 lands
  if (!element.length) {
    return "";
  }
  return element.prop("innerText") || "";
}

export function scraperLog(level: LogLevel, value: LogType, scraper: string, meta?: LogMeta) {
  logger.log(level, value, {
    ...(meta || {}),
    scraper,
  });
}

export function getTextContent(
  novelTitle: string,
  episodeTitle: string,
  urlString: string,
  content: string,
): EpisodeContent[] {
  if (!novelTitle || !episodeTitle) {
    logger.warn("episode link with no novel or episode title", { url: urlString });
    return [];
  }
  if (!content) {
    logger.warn("episode link with no content", { url: urlString });
    return [];
  }
  const chapterGroups = /^\s*Chapter\s*(\d+(\.\d+)?)/.exec(episodeTitle);

  let index;
  if (chapterGroups) {
    index = Number(chapterGroups[1]);
  }
  if (index == null || Number.isNaN(index)) {
    index = undefined;
  }
  const episodeContent: EpisodeContent = {
    content: [content],
    episodeTitle,
    mediumTitle: novelTitle,
    index,
  };

  return [episodeContent];
}

/**
 * Extracts the Links described by the css selector into
 * each an Object of link text and href.
 *
 * @param $ the cheerio root of the document
 * @param selector a valid css selector
 * @param uri a valid base url
 */
export function extractLinkable($: cheerio.CheerioAPI, selector: string, uri: string): LinkablePerson[] {
  const elements = $(selector);
  const result = [];

  for (let i = 0; i < elements.length; i++) {
    const element = elements.eq(i);

    const name = sanitizeString(getText(element));
    const link = new url.URL(element.attr("href") as string, uri).href;

    result.push({ name, link });
  }
  return result;
}

export async function searchTocCheerio(
  medium: TocSearchMedium,
  tocScraper: TocScraper,
  uri: string,
  searchLink: (parameter: string) => string,
  linkSelector: string,
): Promise<undefined | Toc> {
  logger.info("searching for toc", { medium_title: medium.title, url: uri });
  const words = medium.title.split(/\s+/).filter((value) => value);
  let tocLink = "";
  let searchWords = "";

  for (let word of words) {
    word = encodeURIComponent(word);

    if (!word) {
      continue;
    }
    searchWords = searchWords ? searchWords + "+" + word : word;

    if (searchWords.length < 4) {
      continue;
    }
    const $ = await request.getCheerio({ url: searchLink(searchWords) });

    const links = $(linkSelector);

    if (!links.length) {
      break;
    }
    for (let i = 0; i < links.length; i++) {
      const linkElement = links.eq(i);

      const text = sanitizeString(getText(linkElement));

      if (equalsIgnore(text, medium.title) || medium.synonyms.some((s) => equalsIgnore(text, s))) {
        tocLink = linkElement.attr("href") as string;
        tocLink = new url.URL(tocLink, uri).href;
        break;
      }
    }

    if (tocLink) {
      break;
    }
  }
  if (tocLink) {
    const tocs = await tocScraper(tocLink);

    if (tocs?.length) {
      return tocs[0];
    } else {
      logger.warn("a possible toc link could not be scraped", { url: tocLink });
    }
  } else {
    logger.info("no toc link found", { medium_id: medium.mediumId, medium_title: medium.title, url: uri });
  }
}

export interface SearchResult {
  value?: string;
  done: boolean;
}

export async function searchToc(
  medium: TocSearchMedium,
  tocScraper: TocScraper,
  uri: string,
  searchLink: (searchString: string) => Promise<SearchResult>,
): Promise<undefined | Toc> {
  logger.info("searching for toc", { medium_title: medium.title, url: uri });
  const words = medium.title.split(/\s+/).filter((value) => value);
  let tocLink = "";
  let searchString = "";

  for (let word of words) {
    word = encodeURIComponent(word);

    if (!word) {
      continue;
    }
    searchString = searchString ? searchString + "+" + word : word;

    if (searchString.length < 4) {
      continue;
    }

    const result = await searchLink(searchString);
    if (result.value) {
      tocLink = new url.URL(result.value, uri).href;
    }
    if (result.done) {
      break;
    }
  }
  if (tocLink) {
    const tocs = await tocScraper(tocLink);

    if (tocs?.length) {
      return tocs[0];
    } else {
      logger.warn("a possible toc link could not be scraped", { url: tocLink });
    }
  } else {
    logger.info("no toc link found", { medium_id: medium.mediumId, medium_title: medium.title, url: uri });
  }
}

export interface TocPiece {
  readonly title: string;
}

export interface TocMetaPiece extends TocPiece {
  readonly mediumId?: number;
  readonly synonyms?: string[];
  readonly mediumType: MediaType;
  readonly end?: boolean;
  readonly link: string;
  readonly langCOO?: string;
  readonly langTL?: string;
  readonly statusCOO: ReleaseState;
  readonly statusTl: ReleaseState;
  readonly authors?: LinkablePerson[];
  readonly artists?: LinkablePerson[];
}

export interface TocContentPiece extends TocPiece {
  readonly url?: string;
}

class TocLinkedList implements Iterable<Node> {
  private start: Node = { type: "sentinel", next: { type: "dummy" } };
  private end: Node = { type: "sentinel", previous: { type: "dummy" } };
  private listLength = 0;

  public constructor() {
    this.start.next = this.end;
    this.end.previous = this.start;
  }

  public get length() {
    return this.listLength;
  }

  public get asArray() {
    return [...this];
  }

  public push(value: Node): void {
    this.remove(value);
    const oldPrevious = this.end.previous as Node;
    oldPrevious.next = value;
    value.previous = oldPrevious;
    value.next = this.end;
    this.end.previous = value;
    this.listLength++;
  }

  public unshift(value: Node): void {
    this.remove(value);
    const oldNext = this.start.next as Node;
    oldNext.previous = value;
    value.next = oldNext;
    value.previous = this.start;
    this.start.next = value;
    this.listLength++;
  }

  public insertAfter(value: Node, after: Node): void {
    if (value === after) {
      throw Error("cannot insert itself after itself");
    }
    this.remove(value);
    const afterNext = after.next as Node;
    after.next = value;
    value.previous = after;
    value.next = afterNext;
    afterNext.previous = value;
    this.listLength++;
  }

  public insertBefore(value: Node, before: Node): void {
    if (value === before) {
      throw Error("cannot insert itself after itself");
    }
    this.remove(value);
    const beforePrevious = before.previous as Node;
    before.previous = value;
    value.next = before;
    value.previous = beforePrevious;
    beforePrevious.next = value;
    this.listLength++;
  }

  public remove(value: Node): void {
    const next = value.next as Node;
    const previous = value.previous as Node;

    if (next && previous) {
      previous.next = next;
      next.previous = previous;
      this.listLength--;
    }
  }

  public replace(oldValue: Node, newValue: Node): void {
    const oldNext = oldValue.next as Node;
    const oldPrevious = oldValue.previous as Node;
    oldNext.previous = newValue;
    newValue.next = oldNext;
    oldPrevious.next = newValue;
    newValue.previous = oldPrevious;
  }

  public map<U>(mapFn: (value: Node, index: number, array: Node[]) => U, thisArg?: any): U[] {
    const resultList: U[] = [];
    const dummy: Node[] = [];
    let currentIndex = 0;
    for (const node of this) {
      resultList.push(mapFn.call(thisArg, node, currentIndex, dummy));
      currentIndex++;
    }
    return resultList;
  }

  public [Symbol.iterator](): Iterator<Node> {
    let node: Optional<Node> = this.start;
    return {
      next(): IteratorResult<Node> {
        if (node?.next) {
          node = node.next;
          if (node.next) {
            return { value: node };
          }
          return { value: node, done: true };
        }
        return { value: {}, done: true };
      },
    };
  }

  public iterate(forwards: boolean, from?: Node) {
    const nextKey = forwards ? "next" : "previous";
    const start = from || (forwards ? this.start : this.end);
    let node: Optional<Node> = start[nextKey] as Node;
    return {
      [Symbol.iterator](): Iterator<Node> {
        return {
          next(): IteratorResult<Node> {
            if (node) {
              const current = node;
              node = node[nextKey];

              if (node) {
                return { value: current };
              }
              return { value: undefined, done: true };
            }
            // should never reach here
            return { value: {}, done: true };
          },
        };
      },
    };
  }

  public backwards(from?: Node) {
    return this.iterate(false, from);
  }

  public forwards(from?: Node) {
    return this.iterate(true, from);
  }
}

interface Node {
  type: string;
  previous?: Node;
  next?: Node;
}

export interface EpisodePiece extends TocContentPiece {
  readonly url: string;
  readonly releaseDate: Date;
}

export interface PartPiece extends TocContentPiece {
  readonly episodes: any[];
}

interface InternalToc {
  title: string;
  content: InternalTocContent[];
  synonyms?: string[];
  mediumType: MediaType;
  partsOnly?: boolean;
  end?: boolean;
  link: string;
  langCOO?: string;
  langTL?: string;
  statusCOO: ReleaseState;
  statusTl: ReleaseState;
  authors?: LinkablePerson[];
  artists?: LinkablePerson[];
}

interface InternalTocContent extends Node {
  title: string;
  originalTitle: string;
  combiIndex: number;
  totalIndex: number;
  partialIndex?: number;
}

interface InternalTocEpisode extends InternalTocContent {
  type: "episode";
  url: string;
  releaseDate?: Date;
  locked?: boolean;
  match: Nullable<TocMatch>;
  partCount?: number;
  part?: InternalTocPart;
  episodeRange?: number;
  relativeIndices?: {
    combiIndex: number;
    totalIndex: number;
    partialIndex?: number;
  };
}

interface InternalTocPart extends InternalTocContent {
  type: "part";
  episodes: InternalTocEpisode[];
}

function isEpisodePiece(value: any): value is EpisodePiece {
  return value.releaseDate || value.locked;
}

function isUnusedPiece(value: Node): value is UnusedPiece {
  return value.type === "unusedPiece";
}

function isTocMetaPiece(value: any): value is TocMetaPiece {
  return Number.isInteger(value.mediumType);
}

function isInternalEpisode(value: Node): value is InternalTocEpisode {
  return value.type === "episode";
}

function isInternalPart(value: Node): value is InternalTocPart {
  return value.type === "part";
}

function externalizeTocEpisode(value: InternalTocEpisode): TocEpisode {
  return {
    title: value.title,
    combiIndex: combiIndex(value),
    partialIndex: value.partialIndex,
    totalIndex: value.totalIndex,
    url: value.url,
    locked: value.locked || false,
    releaseDate: value.releaseDate,
  };
}

function externalizeTocPart(internalTocPart: InternalTocPart): TocPart {
  return {
    title: internalTocPart.title,
    combiIndex: internalTocPart.combiIndex,
    partialIndex: internalTocPart.partialIndex,
    totalIndex: internalTocPart.totalIndex,
    episodes: internalTocPart.episodes.map(externalizeTocEpisode),
  };
}

export async function scrapeToc(pageGenerator: AsyncGenerator<TocPiece, void>): Promise<TocContent[]> {
  // const maybeEpisode = ["ova"];
  // const optionalEpisode = ["xxx special chapter", "other tales", "interlude", "bonus", "SKILL SUMMARY", "CHARACTER INTRODUCTION", "side story", "ss", "intermission", "extra", "omake", /*"oneshot"*/];
  // const start = ["prologue", "prolog"];
  // const end = ["Epilogue", "finale"];
  const contents = new TocLinkedList();
  const scrapeState: TocScrapeState = {
    ascendingCount: 0,
    descendingCount: 0,
    hasParts: false,
    volumeRegex:
      /(v[olume]{0,5}|(^|\d+|\B|\s+)s[eason]{0,5}|(^|\d+|\B|\s+)b[ok]{0,3})[\s.]*(((\d+)(\.(\d+))?)|\W*(delete|spam))/gi,
    separatorRegex: /[-:]/g,
    chapterRegex:
      /(^|(c[hapter]{0,6}|(ep[isode]{0,5})|(word)))[\s.]*((((\d+)(\.(\d+))?)(\s*-\s*((\d+)(\.(\d+))?))?)|\W*(delete|spam))/gi,
    volumeChapterRegex: /(^|\s)((\d+)(\.(\d+))?)\s*-(\s*((\d+)(\.(\d+))?)|\s)/gi,
    partRegex: /(P[art]{0,3}[.\s]*(\d+))|([[(]?(\d+)[/|](\d+)[)\]]?)/g,
    trimRegex: /(^[\s:–,.-]+)|([\s:–,.-]+$)/g,
    endRegex: /end/g,
    startRegex: /start/g,
    order: "unknown",
    volumeMap: new Map<number, InternalTocPart>(),
  };

  for await (const tocPiece of pageGenerator) {
    if (isTocMetaPiece(tocPiece)) {
      scrapeState.tocMeta = {
        artists: tocPiece.artists,
        authors: tocPiece.authors,
        content: [],
        end: tocPiece.end,
        langCOO: tocPiece.langCOO,
        langTL: tocPiece.langTL,
        link: tocPiece.link,
        mediumType: tocPiece.mediumType,
        statusCOO: tocPiece.statusCOO,
        statusTl: tocPiece.statusTl,
        synonyms: tocPiece.synonyms,
        title: tocPiece.title,
      };
      continue;
    }
    const tocContent = mark(tocPiece, scrapeState);
    for (const node of tocContent) {
      contents.push(node);
    }
  }
  adjustTocContentsLinked(contents, scrapeState);
  let result: TocLinkedList | Node[] = contents;

  if (scrapeState.hasParts) {
    result = [];
    for (const content of contents) {
      if (isInternalPart(content) || (isInternalEpisode(content) && !content.part)) {
        result.push(content);
      }
    }
  }
  return result.map((value): TocContent => {
    if (isInternalEpisode(value)) {
      return externalizeTocEpisode(value);
    } else if (isInternalPart(value)) {
      return externalizeTocPart(value);
    } else {
      throw TypeError();
    }
  });
}

type TocMatchType = "volume" | "separator" | "episode" | "part" | "volumeChapter";
type IndexCalc = (reg: RegExpExecArray) => number;

function markWithRegex(regExp: RegExp, title: string, type: TocMatchType, matches: TocMatch[], matchAfter?: IndexCalc) {
  if (!regExp.flags.includes("g")) {
    throw new ValidationError("Need a Regex with global Flag enabled, else it will crash");
  }
  for (let match = regExp.exec(title); match; match = regExp.exec(title)) {
    matches.push({
      match,
      from: match.index,
      to: match.index + match[0].length,
      ignore: false,
      remove: true,
      type,
    });
    if (matchAfter) {
      regExp.lastIndex = matchAfter(match);
    }
  }
}

interface TocMatch {
  match: RegExpExecArray;
  from: number;
  to: number;
  type: TocMatchType;
  ignore: boolean;
  remove: boolean;
}

interface TocScrapeState {
  lastExtracted?: InternalTocContent;
  lastCombiIndex?: number;
  ascendingCount: number;
  descendingCount: number;
  hasParts: boolean;
  volumeRegex: RegExp;
  chapterRegex: RegExp;
  volumeChapterRegex: RegExp;
  partRegex: RegExp;
  separatorRegex: RegExp;
  trimRegex: RegExp;
  startRegex: RegExp;
  endRegex: RegExp;
  order: "asc" | "desc" | "unknown";
  volumeMap: Map<number, InternalTocPart>;
  tocMeta?: InternalToc;
}

function convertToTocEpisode(totalIndex: number, partialIndex: number, index: number, value: UnusedPiece) {
  const episode: InternalTocEpisode = {
    type: "episode",
    combiIndex: 0,
    totalIndex,
    partialIndex: partialIndex + index,
    title: value.title,
    url: value.url,
    match: null,
    locked: false,
    releaseDate: value.releaseDate,
    originalTitle: value.title,
    part: value.part,
  };
  episode.combiIndex = combiIndex(episode);
  return episode;
}

function adjustPartialIndicesLinked(node: InternalTocEpisode, ascending: boolean, contents: TocLinkedList): void {
  const partialLimit = node.partCount as number;
  let currentPartialIndex = node.partialIndex as number;
  const increment = ascending ? 1 : -1;

  for (const content of contents.iterate(ascending, node)) {
    // do not try to change partial indices over volume boundaries
    if (isInternalPart(content)) {
      break;
    }
    if (!isInternalEpisode(content) || !content.match) {
      continue;
    }
    if (content.totalIndex !== node.totalIndex) {
      break;
    }
    currentPartialIndex = currentPartialIndex + increment;

    if (currentPartialIndex < 1 || currentPartialIndex > partialLimit) {
      break;
    }
    if (content.partialIndex != null && content.partialIndex !== currentPartialIndex) {
      logger.warn("trying to overwrite partialIndex on existing one", {
        newPartialIndex: currentPartialIndex,
        previous: stringify({
          ...content,
          next: null,
          previous: null,
        }),
      });
    } else {
      content.partialIndex = currentPartialIndex;
      content.combiIndex = combiIndex(content);
    }
  }
}

function adjustTocContentsLinked(contents: TocLinkedList, state: TocScrapeState) {
  const ascending = state.ascendingCount > state.descendingCount;

  if (state.ascendingCount > state.descendingCount) {
    state.order = "asc";
  } else {
    state.order = "desc";
  }
  const rangeInserter = ascending ? contents.insertAfter : contents.insertBefore;
  const nextNeighbourKey = ascending ? "next" : "previous";
  for (const content of contents.iterate(ascending)) {
    if (!isInternalEpisode(content)) {
      continue;
    }
    if (!content.episodeRange) {
      continue;
    }
    const next = content[nextNeighbourKey] as Node;
    if (isInternalEpisode(next) && next.combiIndex < content.episodeRange) {
      continue;
    }
    let insertNeighbour = content;
    for (let i = content.totalIndex + 1; i <= content.episodeRange; i++) {
      const episode: InternalTocEpisode = {
        ...content,
        next: undefined,
        previous: undefined,
      };
      episode.totalIndex = i;
      episode.combiIndex = combiIndex(episode);
      rangeInserter.call(contents, episode, insertNeighbour);
      insertNeighbour = episode;
    }
  }
  if (!state.tocMeta?.end) {
    let possibleStartNode: Optional<Node>;
    let volumeEncountered = false;
    for (const content of contents.iterate(ascending)) {
      if (!isUnusedPiece(content)) {
        if (isInternalPart(content)) {
          if (volumeEncountered) {
            possibleStartNode = content;
            break;
          } else {
            volumeEncountered = true;
          }
        } else {
          possibleStartNode = content;
          break;
        }
      }
    }
    if (possibleStartNode) {
      let startNode = possibleStartNode;
      const insert = ascending ? contents.insertBefore : contents.insertAfter;
      // iterate backwards against the current order
      for (const node of contents.iterate(!ascending)) {
        if (!isUnusedPiece(node)) {
          break;
        }
        insert.call(contents, node, startNode);
        startNode = node;
      }
    }
  }
  let minPartialIndex;
  for (const content of contents.iterate(ascending)) {
    if (isInternalEpisode(content)) {
      if (content.totalIndex === 0) {
        minPartialIndex = content.partialIndex;
      }
      break;
    }
  }
  let volumeEncountered = false;
  let index = 0;
  for (const content of contents.iterate(ascending)) {
    if (!isUnusedPiece(content)) {
      if (isInternalPart(content)) {
        if (volumeEncountered) {
          break;
        } else {
          volumeEncountered = true;
          continue;
        }
      } else {
        break;
      }
    }
    const tocEpisode = convertToTocEpisode(0, minPartialIndex ? minPartialIndex + 1 : 1, index, content);
    contents.replace(content, tocEpisode);
    index++;
  }
  let lastSeenEpisode: Optional<InternalTocEpisode>;
  let offset = 101;
  for (const content of contents.iterate(ascending)) {
    if (isInternalEpisode(content)) {
      lastSeenEpisode = content;
      offset = 101;
      continue;
    }
    if (lastSeenEpisode && isUnusedPiece(content)) {
      const partialIndex = (lastSeenEpisode.partialIndex || 0) * 100;
      if (offset % 10 === 0) {
        offset++;
      }
      const internalTocEpisode = convertToTocEpisode(lastSeenEpisode.totalIndex, partialIndex, offset, content);
      contents.replace(content, internalTocEpisode);
      offset++;
    }
  }
  let volume: Optional<InternalTocPart>;
  const volumeInserter = ascending ? TocLinkedList.prototype.insertBefore : TocLinkedList.prototype.insertAfter;
  for (const content of contents.iterate(!ascending)) {
    if (isInternalPart(content)) {
      volume = content;
    }
    if (!volume) {
      continue;
    }
    if (isInternalEpisode(content)) {
      if (!content.match && volume.title) {
        const volumeTitleIndex = content.title.indexOf(volume.title);

        if (volumeTitleIndex >= 0) {
          content.title = content.title.substring(volumeTitleIndex + volume.title.length).replace(state.trimRegex, "");

          volumeInserter.call(contents, volume, content);
        }
      } else if (content.part === volume) {
        volumeInserter.call(contents, volume, content);
      }
    }
  }
  volume = undefined;
  const episodeInserter = ascending ? Array.prototype.push : Array.prototype.unshift;
  let lastVolume: Optional<InternalTocPart>;
  let lastVolumeLastEpisode: Optional<InternalTocEpisode>;
  let currentVolumeChecked = false;
  let hasRelativeIndices = false;

  for (const node of contents.iterate(ascending)) {
    if (isInternalPart(node)) {
      lastVolume = volume;
      lastVolumeLastEpisode = lastVolume && lastVolume.episodes[lastVolume.episodes.length - 1];
      volume = node;
      currentVolumeChecked = false;
      checkTocContent(node);
    } else if (isInternalEpisode(node)) {
      if (node.partCount) {
        adjustPartialIndicesLinked(node, ascending, contents);
        adjustPartialIndicesLinked(node, !ascending, contents);
      }
      if (volume) {
        episodeInserter.call(volume.episodes, node);
        node.part = volume;
        const titleIndex = node.title.indexOf(volume.title);
        if (titleIndex >= 0) {
          node.title = node.title.substring(titleIndex + volume.title.length).replace(state.trimRegex, "");
        }
        if (node.match && !currentVolumeChecked) {
          if (lastVolumeLastEpisode) {
            hasRelativeIndices = lastVolumeLastEpisode.combiIndex > node.combiIndex;
          } else {
            hasRelativeIndices = false;
          }
          currentVolumeChecked = true;
        }
        const isPreviousVolume = lastVolume && lastVolume.combiIndex < volume.combiIndex;
        const previous = ascending ? node.previous : node.next;

        if (isPreviousVolume && hasRelativeIndices && !node.relativeIndices && previous && lastVolumeLastEpisode) {
          let lastEpisode: Optional<InternalTocEpisode>;
          if (isInternalPart(previous)) {
            lastEpisode = lastVolumeLastEpisode;
          } else if (isInternalEpisode(previous)) {
            lastEpisode = previous;
          }
          const difference = lastEpisode && Math.abs(lastEpisode.totalIndex - node.totalIndex) > 10;
          if (lastEpisode && (lastEpisode.combiIndex > node.combiIndex || difference)) {
            if (!node.match) {
              let unusedOnlyToVolume = false;
              for (const previousContent of contents.iterate(!ascending, node)) {
                if (isInternalEpisode(previousContent) && previousContent.match) {
                  unusedOnlyToVolume = false;
                  break;
                } else if (isInternalPart(previousContent)) {
                  unusedOnlyToVolume = true;
                  break;
                }
              }
              if (unusedOnlyToVolume) {
                node.totalIndex = 0;
                node.combiIndex = combiIndex(node);
              }
            }
            node.relativeIndices = {
              totalIndex: node.totalIndex,
              partialIndex: node.partialIndex,
              combiIndex: node.combiIndex,
            };
            node.totalIndex += lastVolumeLastEpisode.totalIndex;
            node.combiIndex += lastVolumeLastEpisode.totalIndex;
          }
        }
      }
      checkTocContent(node);
    }
  }
}

interface UnusedPiece extends Node, EpisodePiece {
  type: "unusedPiece";
  part?: InternalTocPart;
}

function mark(tocPiece: TocContentPiece, state: TocScrapeState): Node[] {
  const volumeRegex = state.volumeRegex;
  const chapterRegex = state.chapterRegex;
  const volumeChapterRegex = state.volumeChapterRegex;
  const partRegex = state.partRegex;
  const trimRegex = state.trimRegex;
  let title = tocPiece.title.replace(trimRegex, "");

  if (state.tocMeta) {
    const index = title.indexOf(state.tocMeta.title);

    if (index >= 0) {
      const before = title.substring(0, index).replace(trimRegex, "");
      const after = title.substring(index + state.tocMeta.title.length).replace(trimRegex, "");
      title = before + after;
    }
  }
  const matches: TocMatch[] = [];

  markWithRegex(volumeRegex, title, "volume", matches);
  markWithRegex(chapterRegex, title, "episode", matches);
  markWithRegex(volumeChapterRegex, title, "volumeChapter", matches, (reg) => {
    return reg.index + reg[2].length;
  });
  markWithRegex(partRegex, title, "part", matches);

  matches.sort((a, b) => a.from - b.from);
  const possibleEpisodes: InternalTocEpisode[] = [];
  let possibleVolume: Optional<InternalTocPart>;
  let newVolume = false;
  const usedMatches: TocMatch[] = [];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    if (match.type === "episode") {
      if (match.match[16]) {
        // it matches the pattern for an invalid episode
        return [];
      }
      const indices = extractIndices(match.match, 7, 8, 10);
      const secondaryIndices = extractIndices(match.match, 12, 13, 15);

      if (!indices) {
        continue;
      }
      if (!isEpisodePiece(tocPiece)) {
        continue;
      }
      if (possibleEpisodes.length) {
        let hasDirectVolume = false;
        for (let j = i - 1; j >= 0; j--) {
          const type = matches[j].type;
          if (type === "episode" || type === "part") {
            break;
          }
          if (type === "volume") {
            hasDirectVolume = true;
            break;
          }
        }
        if (hasDirectVolume) {
          for (const possibleEpisode of possibleEpisodes) {
            possibleEpisode.relativeIndices = {
              combiIndex: indices.combi,
              partialIndex: indices.fraction,
              totalIndex: indices.total,
            };
          }
        }
        match.ignore = true;
        usedMatches.push(match);
        continue;
      }
      usedMatches.push(match);
      const partialWrappingMatch = matches.find((value) => match.from <= value.from && value.to > match.to);

      const episode: InternalTocEpisode = {
        type: "episode",
        combiIndex: indices.combi,
        totalIndex: indices.total,
        partialIndex: indices.fraction,
        url: tocPiece.url,
        releaseDate: tocPiece.releaseDate || new Date(),
        title: "",
        originalTitle: tocPiece.title,
        match,
      };
      if (secondaryIndices && !partialWrappingMatch) {
        // for now ignore any fraction, normally it should only have the format of 1-4, not 1.1-1.4 or similar
        episode.episodeRange = secondaryIndices.total;
      }
      possibleEpisodes.push(episode);
    } else if (possibleEpisodes.length === 1 && match.type === "part") {
      const wrappingMatch = usedMatches.find((value) => value.from <= match.from && value.to >= match.to);
      // there exists a match which wraps the current one, so skip this one
      if (wrappingMatch) {
        continue;
      }
      const possibleEpisode = possibleEpisodes[0];
      let refersToCurrentEpisode = true;
      for (let j = i; j >= 0; j--) {
        const previousMatch = matches[j];
        if (previousMatch.type === "episode") {
          // noinspection JSUnusedAssignment
          refersToCurrentEpisode = previousMatch === possibleEpisode.match;
          break;
        }
      }
      const part = Number.parseInt(match.match[2] || match.match[4], 10);

      if (!refersToCurrentEpisode) {
        match.ignore = true;
        const previousMatch = usedMatches[usedMatches.length - 1];
        if (previousMatch && previousMatch.type === "episode" && previousMatch.to === match.from) {
          if (possibleEpisode.relativeIndices && Number.isInteger(part)) {
            possibleEpisode.relativeIndices.partialIndex = part;
          }
        }
        usedMatches.push(match);
        continue;
      }

      if (Number.isInteger(part)) {
        // noinspection JSUnusedAssignment
        if (possibleEpisode.partialIndex == null) {
          if (match.match[5]) {
            // noinspection JSUnusedAssignment
            possibleEpisode.partCount = Number.parseInt(match.match[5], 10);
          }
          // noinspection JSUnusedAssignment
          possibleEpisode.partialIndex = part;
          // noinspection JSUnusedAssignment
          possibleEpisode.combiIndex = combiIndex(possibleEpisode);
          usedMatches.push(match);
        } else if (part !== possibleEpisode.partialIndex) {
          logger.warn("Episode Part defined with existing EpisodePartialIndex");
        }
      }
    } else if (match.type === "volumeChapter") {
      if (matches[i + 1] && matches[i + 1].type === "volumeChapter") {
        continue;
      }
      const previousMatch = matches[i - 1];
      // it overlaps with a previous volume match like 'Book 15 - 15',
      // where 'Book 15' is a previous 'volume' match
      // and 15 - 15 would be the current match, this would be a misclassified match
      if (
        previousMatch &&
        previousMatch.type === "volume" &&
        previousMatch.from <= match.from &&
        previousMatch.to >= match.from
      ) {
        continue;
      }
      const wrappingMatch = matches.find((value) => {
        return value !== match && value.from <= match.from && match.to <= value.to;
      });

      if (wrappingMatch) {
        continue;
      }
      const volIndices = extractIndices(match.match, 2, 3, 5);
      const chapIndices = extractIndices(match.match, 7, 8, 10);

      if (!volIndices) {
        continue;
      }
      if (!isEpisodePiece(tocPiece)) {
        continue;
      }
      if (possibleEpisodes.length === 1 && possibleEpisodes[0].combiIndex === volIndices.combi && !chapIndices) {
        continue;
      }
      if (!possibleVolume) {
        state.hasParts = true;
        match.ignore = true;
        usedMatches.push(match);
        possibleVolume = state.volumeMap.get(volIndices.combi);

        if (!possibleVolume) {
          const internalTocPart: InternalTocPart = {
            type: "part",
            combiIndex: volIndices.combi,
            totalIndex: volIndices.total,
            partialIndex: volIndices.fraction,
            title: "",
            originalTitle: "",
            episodes: [],
          };
          // need to be valid to be acknowledged
          try {
            checkTocContent(internalTocPart);
          } catch (error) {
            continue;
          }
          possibleVolume = internalTocPart;
          newVolume = true;
          state.volumeMap.set(volIndices.combi, possibleVolume);
        }
      } else if (possibleVolume.combiIndex !== volIndices.combi) {
        continue;
      } else {
        usedMatches.push(match);
      }
      if (!chapIndices) {
        continue;
      }
      if (possibleEpisodes.length === 1) {
        possibleEpisodes[0].relativeIndices = {
          combiIndex: chapIndices.combi,
          totalIndex: chapIndices.total,
          partialIndex: chapIndices.fraction,
        };
      } else if (!possibleEpisodes.length) {
        possibleEpisodes.push({
          type: "episode",
          combiIndex: chapIndices.combi,
          totalIndex: chapIndices.total,
          partialIndex: chapIndices.fraction,
          url: tocPiece.url,
          releaseDate: tocPiece.releaseDate || new Date(),
          title: "",
          originalTitle: tocPiece.title,
          match,
        });
      }
    } else if (!possibleVolume && match.type === "volume") {
      if (match.match[9]) {
        // it matches the pattern for an invalid episode
        return [];
      }
      const volIndices = extractIndices(match.match, 5, 6, 7);

      if (volIndices) {
        state.hasParts = true;
        usedMatches.push(match);
        possibleVolume = state.volumeMap.get(volIndices.combi);

        if (!possibleVolume) {
          const internalTocPart: InternalTocPart = {
            type: "part",
            combiIndex: volIndices.combi,
            totalIndex: volIndices.total,
            partialIndex: volIndices.fraction,
            title: "",
            originalTitle: "",
            episodes: [],
          };
          // need to be valid to be acknowledged
          try {
            checkTocContent(internalTocPart);
          } catch (error) {
            continue;
          }
          possibleVolume = internalTocPart;
          newVolume = true;
          state.volumeMap.set(volIndices.combi, possibleVolume);
        }
      } else {
        logger.warn("got a volume match but no indices");
      }
    }
  }

  for (let i = 0; i < usedMatches.length; i++) {
    const usedMatch = usedMatches[i];

    if (!usedMatch.remove) {
      continue;
    }

    const before = title.substring(0, usedMatch.from).replace(trimRegex, "");
    const after = title.substring(usedMatch.to).replace(trimRegex, "");

    const removedLength = title.length - (before.length + after.length);

    if (!usedMatch.ignore) {
      let contentTitle: string;
      if (i + 1 < usedMatches.length) {
        const maxEnd = Math.max(usedMatches[i + 1].from, usedMatch.to);
        contentTitle = title.substring(usedMatch.to, maxEnd).replace(trimRegex, "");
      } else {
        contentTitle = after;
      }
      if (usedMatch.type === "volume" && possibleVolume) {
        if (!possibleVolume.title || possibleVolume.title.includes(contentTitle)) {
          possibleVolume.title = contentTitle;
        }
      } else if (usedMatch.type === "episode" && possibleEpisodes.length) {
        possibleEpisodes.forEach((value) => (value.title = contentTitle));
      }
    }

    for (let j = i + 1; j < usedMatches.length; j++) {
      const followingUsedMatch = usedMatches[j];

      followingUsedMatch.from -= removedLength;
      followingUsedMatch.to -= removedLength;
    }
    title = before + after;
  }
  possibleEpisodes.forEach((possibleEpisode) => {
    if (!possibleEpisode.title && title) {
      possibleEpisode.title = title.replace(trimRegex, "");
    }
  });
  if (possibleEpisodes.length) {
    if (state.lastCombiIndex != null) {
      if (state.lastCombiIndex < possibleEpisodes[0].combiIndex) {
        state.ascendingCount++;
      } else if (state.lastCombiIndex > possibleEpisodes[0].combiIndex) {
        state.descendingCount++;
      }
    }
    state.lastCombiIndex = possibleEpisodes[0].combiIndex;
  }

  const result: Node[] = [];
  if (possibleVolume) {
    if (possibleEpisodes.length) {
      possibleEpisodes.forEach((possibleEpisode) => (possibleEpisode.part = possibleVolume));
    }
    if (newVolume) {
      result.push(possibleVolume);
    }
  }
  if (possibleEpisodes.length) {
    result.push(...possibleEpisodes);
  } else if (isEpisodePiece(tocPiece)) {
    result.push({
      type: "unusedPiece",
      ...tocPiece,
      part: possibleVolume,
    } as UnusedPiece);
  }
  return result;
}
