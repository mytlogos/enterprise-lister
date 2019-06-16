import { ListScrapeResult } from "./listManager";
import { Episode, News } from "../types";
import { Dependant, DownloadContent, Hook, Toc } from "./types";
export declare const scrapeTypes: {
    LIST: number;
    FEED: number;
    NEWS: number;
    TOC: number;
};
/**
 *
 * @return {Promise<void>}
 */
export declare function setup(): Promise<void>;
export declare function add(dependant: Dependant): void;
export declare function downloadEpisodes(episodes: Episode[]): Promise<DownloadContent[]>;
/**
 *
 * @param {Dependant} dependant
 */
export declare function remove(dependant: Dependant): void;
export declare function registerHooks(hook: Hook[] | Hook): void;
/**
 *
 */
export declare function pause(): void;
/**
 *
 */
export declare function start(): void;
export declare function on(event: "toc", callback: (value: {
    uuid: string;
    toc: Toc[];
}) => void): void;
export declare function on(event: "feed" | "news", callback: (value: {
    link: string;
    result: News[];
}) => void): void;
export declare function on(event: "list", callback: (value: {
    external: {
        cookies: string;
        uuid: string;
        userUuid: string;
        type: number;
    };
    lists: ListScrapeResult;
}) => void): void;
export declare function on(event: "toc:error", callback: (errorValue: any) => void): void;
export declare function on(event: "news:error", callback: (errorValue: any) => void): void;
export declare function on(event: "feed:error", callback: (errorValue: any) => void): void;
export declare function on(event: "list:error", callback: (errorValue: any) => void): void;
