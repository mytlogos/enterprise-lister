import { EpisodeContent, TocScraper } from "../types";
import { TocSearchMedium } from "../../types";
export declare function getTextContent(novelTitle: string, episodeTitle: string, urlString: string, content: string): EpisodeContent[];
export declare function searchTocCheerio(medium: TocSearchMedium, tocScraper: TocScraper, uri: string, searchLink: (parameter: string) => string, linkSelector: string): Promise<import("../types").Toc | undefined>;
export interface SearchResult {
    value?: string;
    done: boolean;
}
export declare function searchToc(medium: TocSearchMedium, tocScraper: TocScraper, uri: string, searchLink: (searchString: string) => Promise<SearchResult>): Promise<import("../types").Toc | undefined>;
