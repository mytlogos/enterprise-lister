import { EpisodeContent, TocContent, TocScraper } from "../types";
import { MediaType } from "../../tools";
import { ReleaseState, TocSearchMedium } from "../../types";
export declare function getTextContent(novelTitle: string, episodeTitle: string, urlString: string, content: string): EpisodeContent[];
export declare function searchTocCheerio(medium: TocSearchMedium, tocScraper: TocScraper, uri: string, searchLink: (parameter: string) => string, linkSelector: string): Promise<import("../types").Toc | undefined>;
export interface SearchResult {
    value?: string;
    done: boolean;
}
export declare function searchToc(medium: TocSearchMedium, tocScraper: TocScraper, uri: string, searchLink: (searchString: string) => Promise<SearchResult>): Promise<import("../types").Toc | undefined>;
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
    readonly authors?: Array<{
        name: string;
        link: string;
    }>;
    readonly artists?: Array<{
        name: string;
        link: string;
    }>;
}
export interface TocContentPiece extends TocPiece {
    readonly url?: string;
}
export interface EpisodePiece extends TocContentPiece {
    readonly url: string;
    readonly releaseDate: Date;
}
export interface PartPiece extends TocContentPiece {
    readonly episodes: any[];
}
export declare function scrapeToc(pageGenerator: AsyncGenerator<TocPiece, void>): Promise<TocContent[]>;
