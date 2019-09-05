import { Invalidation, MetaResult, Result, ScrapeItem, User } from "../../types";
import { Query } from "mysql";
import { ScrapeType } from "../../externals/types";
import { ContextCallback, ContextProvider } from "./storageTools";
import { ConnectionContext } from "../databaseTypes";
import { MediumStorage } from "./mediumStorage";
import { ExternalListStorage } from "./externalListStorage";
import { ExternalUserStorage } from "./externalUserStorage";
import { InternalListStorage } from "./internalListStorage";
import { JobStorage } from "./jobStorage";
import { UserStorage } from "./userStorage";
import { MediumInWaitStorage } from "./mediumInWaitStorage";
import { NewsStorage } from "./newsStorage";
import { EpisodeStorage } from "./episodeStorage";
import { PartStorage } from "./partStorage";
/**
 * Creates the context for QueryContext, to
 * query a single connection sequentially.
 */
export declare function storageInContext<T, C extends ConnectionContext>(callback: ContextCallback<T, C>, transaction: boolean | undefined, provider: ContextProvider<C>): Promise<T>;
export declare class Storage {
    /**
     * Closes the Storage.
     *
     * @return {Promise<void>}
     */
    stop(): Promise<void>;
    getPageInfo(link: string, key: string): Promise<{
        link: string;
        key: string;
        values: string[];
    }>;
    updatePageInfo(link: string, key: string, values: string[], toDeleteValues?: string[]): Promise<void>;
    removePageInfo(link: string, key?: string): Promise<void>;
    queueNewTocs(): Promise<void>;
    /**
     *
     * @param result
     */
    processResult(result: Result): Promise<MetaResult | MetaResult[]>;
    /**
     *
     * @param result
     */
    saveResult(result: Result): Promise<boolean>;
    /**
     *
     */
    addScrape(scrape: ScrapeItem | ScrapeItem[]): Promise<boolean>;
    /**
     *
     */
    getScrapes(): Promise<ScrapeItem[]>;
    /**
     *
     */
    removeScrape(link: string, type: ScrapeType): Promise<boolean>;
    updateScrape(link: string, type: ScrapeType, nextScrape: number): Promise<boolean>;
    /**
     *
     */
    showUser(): Promise<User[]>;
    /**
     *
     */
    getInvalidated(uuid: string): Promise<Invalidation[]>;
    /**
     *
     */
    getInvalidatedStream(uuid: string): Promise<Query>;
}
export declare const storage: Storage;
export declare const mediumStorage: MediumStorage;
export declare const partStorage: PartStorage;
export declare const episodeStorage: EpisodeStorage;
export declare const newsStorage: NewsStorage;
export declare const mediumInWaitStorage: MediumInWaitStorage;
export declare const userStorage: UserStorage;
export declare const jobStorage: JobStorage;
export declare const internalListStorage: InternalListStorage;
export declare const externalUserStorage: ExternalUserStorage;
export declare const externalListStorage: ExternalListStorage;
/**
 *
 */
export declare const startStorage: () => void;
