import { Episode, EpisodeRelease, ExternalList, ExternalUser, Invalidation, LikeMedium, LikeMediumQuery, List, Medium, MetaResult, MultiSingle, News, Part, ProgressResult, Result, ScrapeItem, SimpleEpisode, SimpleMedium, Synonyms, TocSearchMedium, User } from "../types";
import { QueryContext } from "./queryContext";
declare type ContextCallback<T> = (context: QueryContext) => Promise<T>;
/**
 * Creates the context for QueryContext, to
 * query a single connection sequentially.
 */
export declare function inContext<T>(callback: ContextCallback<T>, transaction?: boolean, allowDatabase?: boolean): Promise<T>;
export interface Storage {
    getPageInfo(link: string, key: string): Promise<{
        link: string;
        key: string;
        values: string[];
    }>;
    updatePageInfo(link: string, key: string, values: string[], toDeleteValues?: string[]): Promise<void>;
    removePageInfo(link: string, key?: string): Promise<void>;
    addRelease(episodeId: number, releases: EpisodeRelease): Promise<EpisodeRelease>;
    addRelease(episodeId: number, releases: EpisodeRelease[]): Promise<EpisodeRelease[]>;
    updateRelease(episodeId: number, sourceType: string, releases: MultiSingle<EpisodeRelease>): Promise<void>;
    getSourcedReleases(sourceType: string, mediumId: number): Promise<Array<{
        sourceType: string;
        url: string;
        title: string;
        mediumId: number;
    }>>;
    addMedium(medium: SimpleMedium, uuid?: string): Promise<SimpleMedium>;
    getLikeMedium(likeMedia: LikeMediumQuery): Promise<LikeMedium>;
    getLikeMedium(likeMedia: LikeMediumQuery[]): Promise<LikeMedium[]>;
    updatePart(part: Part, uuid?: string): Promise<boolean>;
    userLoginStatus(ip: string): Promise<User | null>;
    removeSynonyms(synonyms: (Synonyms | Synonyms[]), uuid?: string): Promise<boolean>;
    updateExternalList(externalList: ExternalList, uuid?: string): Promise<boolean>;
    getProgress(uuid: string, episodeId: number): Promise<number>;
    moveMedium(oldListId: number, newListId: number, mediumId: number, uuid?: string): Promise<boolean>;
    getSimpleMedium(id: number | number[]): Promise<SimpleMedium | SimpleMedium[]>;
    removeMedium(listId: number, mediumId: number, uuid?: string): Promise<boolean>;
    addNews(news: (News | News[])): Promise<News | Array<News | undefined> | undefined>;
    getScrapes(): Promise<ScrapeItem[]>;
    createStandardPart(mediumId: number): Promise<Part>;
    deletePart(id: number, uuid?: string): Promise<boolean>;
    getList(listId: (number | number[]), media: number[], uuid: string): Promise<{
        list: List | List[];
        media: Medium[];
    }>;
    getSynonyms(mediumId: (number | number[])): Promise<Synonyms[]>;
    getScrapeExternalUser(): Promise<Array<{
        userUuid: string;
        type: number;
        uuid: string;
        cookies: string;
    }>>;
    removeProgress(uuid: string, episodeId: number): Promise<boolean>;
    linkNewsToEpisode(news: News[]): Promise<boolean>;
    addItemToExternalList(listId: number, mediumId: number, uuid?: string): Promise<boolean>;
    markEpisodeRead(uuid: string, result: Result): Promise<void>;
    getMediumParts(mediumId: number, uuid?: string): Promise<Part[]>;
    updateProgress(uuid: string, mediumId: number, progress: number, readDate: (Date | null)): Promise<boolean>;
    showUser(): Promise<User[]>;
    addScrape(scrape: (ScrapeItem | ScrapeItem[])): Promise<boolean>;
    processResult(result: Result): Promise<MetaResult | MetaResult[]>;
    getExternalList(id: number): Promise<ExternalList>;
    addProgress(uuid: string, episodeId: number, progress: number, readDate: (Date | null)): Promise<boolean>;
    logoutUser(uuid: string, ip: string): Promise<boolean>;
    stop(): Promise<void>;
    addEpisode(partId: number, episode: SimpleEpisode, uuid?: string): Promise<SimpleEpisode>;
    addEpisode(partId: number, episode: SimpleEpisode[], uuid?: string): Promise<SimpleEpisode[]>;
    updateEpisode(episode: SimpleEpisode, uuid?: string): Promise<boolean>;
    deleteUser(uuid: string): Promise<boolean>;
    addPart(mediumId: number, part: Part, uuid?: string): Promise<Part>;
    getLatestNews(domain: string): Promise<News[]>;
    getMedium(id: (number | number[]), uuid: string): Promise<Medium | Medium[]>;
    deleteList(listId: number, uuid: string): Promise<boolean>;
    updateMedium(medium: SimpleMedium, uuid?: string): Promise<boolean>;
    getExternalLists(uuid: string): Promise<ExternalList[]>;
    saveResult(result: Result): Promise<boolean>;
    setProgress(uuid: string, progressResult: (ProgressResult | ProgressResult[])): Promise<void>;
    getNews({ uuid, since, till, newsIds }: {
        uuid: string;
        since?: Date;
        till?: Date;
        newsIds?: number[];
    }): Promise<News[]>;
    checkUnreadNews(uuid: string): Promise<number>;
    getUserLists(uuid: string): Promise<List[]>;
    loginUser(userName: string, password: string, ip: string): Promise<User>;
    addExternalUser(localUuid: string, externalUser: ExternalUser): Promise<ExternalUser>;
    addList(uuid: string, list: {
        name: string;
        medium: number;
    }): Promise<List>;
    removeItemFromExternalList(listId: number, mediumId: number, uuid?: string): Promise<boolean>;
    updateList(list: List): Promise<boolean>;
    getMediumPartsPerIndex(mediumId: number, index: MultiSingle<number>, uuid?: string): Promise<Part[]>;
    getParts(partsId: (number | number[]), uuid: string): Promise<Part[] | Part>;
    getInvalidated(uuid: string): Promise<Invalidation[]>;
    markNewsRead(uuid: string, news: number[]): Promise<boolean>;
    updateExternalUser(externalUser: ExternalUser): Promise<boolean>;
    addItemToList(listId: number, mediumId: number, uuid?: string): Promise<boolean>;
    removeLinkNewsToMedium(newsId: number, mediumId: number): Promise<boolean>;
    clear(): Promise<boolean>;
    updateUser(uuid: string, user: {
        name?: string;
        newPassword?: string;
        password?: string;
    }): Promise<boolean>;
    getExternalUserWithCookies(uuid: string): Promise<{
        userUuid: string;
        type: number;
        uuid: string;
        cookies: string;
    }>;
    addExternalList(userUuid: string, externalList: ExternalList, uuid?: string): Promise<ExternalList>;
    removeScrape(link: string): Promise<boolean>;
    deleteEpisode(id: number, uuid?: string): Promise<boolean>;
    getLatestReleases(mediumId: number): Promise<SimpleEpisode[]>;
    addSynonyms(synonyms: (Synonyms | Synonyms[]), uuid?: string): Promise<boolean>;
    addToc(mediumId: number, link: string): Promise<void>;
    linkNewsToMedium(): Promise<boolean>;
    getPartEpisodePerIndex(partId: number, index: MultiSingle<number>): Promise<MultiSingle<SimpleEpisode>>;
    getEpisode(id: number, uuid: string): Promise<Episode>;
    getEpisode(id: number[], uuid: string): Promise<Episode[]>;
    getExternalUser(uuid: string): Promise<ExternalUser>;
    deleteExternalUser(externalUuid: string, uuid?: string): Promise<boolean>;
    register(userName: string, password: string, ip: string): Promise<User>;
    removeExternalList(externalUuid: string, externalListId: (number | number[]), uuid?: string): Promise<boolean>;
    saveMediumSettings(mediumId: number, settings: any): Promise<void>;
    saveListSettings(listId: number, settings: any): Promise<void>;
    saveExternalListSettings(listId: number, settings: any): Promise<void>;
    saveAppSettings(listId: number, settings: any): Promise<void>;
    saveSettings(listId: number, settings: any): Promise<void>;
    getTocs(mediumId: number): Promise<string[]>;
    getAllTocs(): Promise<Array<{
        link?: string;
        id: number;
    }>>;
    getChapterIndices(mediumId: number): Promise<number[]>;
    getAllChapterLinks(mediumId: number): Promise<string[]>;
    getTocSearchMedium(id: number): Promise<TocSearchMedium>;
    deleteOldNews(): Promise<boolean>;
}
export declare const Storage: Storage;
/**
 *
 */
export declare const startStorage: () => void;
export {};
