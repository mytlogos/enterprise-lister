import { Episode, EpisodeContentData, EpisodeRelease, ExternalList, ExternalUser, FullPart, Invalidation, LikeMedium, LikeMediumQuery, List, Medium, MetaResult, MultiSingle, News, Part, ProgressResult, Result, ScrapeItem, ShallowPart, SimpleEpisode, SimpleMedium, SimpleRelease, SimpleUser, Synonyms, TocSearchMedium, User } from "../types";
import { QueryContext } from "./queryContext";
import { MediumInWait } from "./databaseTypes";
import { ScrapeType } from "../externals/scraperTools";
declare type ContextCallback<T> = (context: QueryContext) => Promise<T>;
/**
 * Creates the context for QueryContext, to
 * query a single connection sequentially.
 */
export declare function inContext<T>(callback: ContextCallback<T>, transaction?: boolean): Promise<T>;
export interface Storage {
    queueNewTocs(): Promise<void>;
    deleteRelease(release: EpisodeRelease): Promise<void>;
    getEpisodeLinks(knownEpisodeIds: number[]): Promise<SimpleRelease[]>;
    getEpisodeContent(chapterLink: string): Promise<EpisodeContentData>;
    getPageInfo(link: string, key: string): Promise<{
        link: string;
        key: string;
        values: string[];
    }>;
    updatePageInfo(link: string, key: string, values: string[], toDeleteValues?: string[]): Promise<void>;
    removePageInfo(link: string, key?: string): Promise<void>;
    addRelease(releases: EpisodeRelease): Promise<EpisodeRelease>;
    addRelease(releases: EpisodeRelease[]): Promise<EpisodeRelease[]>;
    updateRelease(releases: MultiSingle<EpisodeRelease>): Promise<void>;
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
    getUser(uuid: string, ip: string): Promise<User>;
    loggedInUser(ip: string): Promise<SimpleUser | null>;
    userLoginStatus(ip: string, uuid: string, session: string): Promise<boolean>;
    removeSynonyms(synonyms: (Synonyms | Synonyms[]), uuid?: string): Promise<boolean>;
    updateExternalList(externalList: ExternalList, uuid?: string): Promise<boolean>;
    getProgress(uuid: string, episodeId: number): Promise<number>;
    moveMedium(oldListId: number, newListId: number, mediumId: number | number[], uuid?: string): Promise<boolean>;
    getSimpleMedium(id: number | number[]): Promise<SimpleMedium | SimpleMedium[]>;
    removeMedium(listId: number, mediumId: number | number[], uuid?: string): Promise<boolean>;
    addNews(news: (News | News[])): Promise<News | Array<News | undefined> | undefined>;
    getScrapes(): Promise<ScrapeItem[]>;
    createStandardPart(mediumId: number): Promise<ShallowPart>;
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
    addItemToExternalList(listId: number, mediumId: number, uuid?: string): Promise<boolean>;
    markEpisodeRead(uuid: string, result: Result): Promise<void>;
    getMediumParts(mediumId: number, uuid: string): Promise<FullPart[]>;
    getMediumParts(mediumId: number): Promise<ShallowPart[]>;
    getStandardPart(mediumId: number): Promise<ShallowPart | undefined>;
    updateProgress(uuid: string, mediumId: number, progress: number, readDate: (Date | null)): Promise<boolean>;
    showUser(): Promise<User[]>;
    addScrape(scrape: (ScrapeItem | ScrapeItem[])): Promise<boolean>;
    processResult(result: Result): Promise<MetaResult | MetaResult[]>;
    getExternalList(id: number): Promise<ExternalList>;
    addProgress(uuid: string, episodeId: number | number[], progress: number, readDate: (Date | null)): Promise<boolean>;
    logoutUser(uuid: string, ip: string): Promise<boolean>;
    stop(): Promise<void>;
    addEpisode(episode: SimpleEpisode, uuid?: string): Promise<SimpleEpisode>;
    addEpisode(episode: SimpleEpisode[], uuid?: string): Promise<SimpleEpisode[]>;
    updateEpisode(episode: SimpleEpisode, uuid?: string): Promise<boolean>;
    moveEpisodeToPart(oldPartId: number, episodeIndices: number[], newPartId: number): Promise<boolean>;
    deleteUser(uuid: string): Promise<boolean>;
    addPart(part: Part, uuid?: string): Promise<Part>;
    getLatestNews(domain: string): Promise<News[]>;
    getMedium(id: (number | number[]), uuid: string): Promise<Medium | Medium[]>;
    getAllMedia(): Promise<number[]>;
    deleteList(listId: number, uuid: string): Promise<boolean>;
    updateMedium(medium: SimpleMedium, uuid?: string): Promise<boolean>;
    createFromMediaInWait(createMedium: any, tocsMedia: any, listId: any): Promise<any>;
    consumeMediaInWait(mediumId: number, tocsMedia: MediumInWait[]): Promise<boolean>;
    getMediaInWait(): Promise<MediumInWait[]>;
    deleteMediaInWait(mediaInWait: MultiSingle<MediumInWait>): Promise<void>;
    addMediumInWait(mediaInWait: MultiSingle<MediumInWait>): Promise<void>;
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
    getPartsEpisodeIndices(partId: number | number[]): Promise<Array<{
        partId: number;
        episodes: number[];
    }>>;
    getParts(partsId: (number | number[]), uuid: string): Promise<Part[] | Part>;
    getInvalidated(uuid: string): Promise<Invalidation[]>;
    markNewsRead(uuid: string, news: number[]): Promise<boolean>;
    updateExternalUser(externalUser: ExternalUser): Promise<boolean>;
    addItemToList(listId: number, mediumId: number | number[], uuid?: string): Promise<boolean>;
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
    removeScrape(link: string, type: ScrapeType): Promise<boolean>;
    updateScrape(url: string, scrapeType: ScrapeType, nextScrape: number): void;
    deleteEpisode(id: number, uuid?: string): Promise<boolean>;
    getLatestReleases(mediumId: number): Promise<SimpleEpisode[]>;
    addSynonyms(synonyms: (Synonyms | Synonyms[]), uuid?: string): Promise<boolean>;
    addToc(mediumId: number, link: string): Promise<void>;
    linkNewsToMedium(): Promise<boolean>;
    getPartEpisodePerIndex(partId: number, index: MultiSingle<number>): Promise<MultiSingle<SimpleEpisode>>;
    getMediumEpisodePerIndex(mediumId: number, index: number[]): Promise<SimpleEpisode[]>;
    getMediumEpisodePerIndex(mediumId: number, index: number): Promise<SimpleEpisode>;
    getEpisode(id: number, uuid: string): Promise<Episode>;
    getEpisode(id: number[], uuid: string): Promise<Episode[]>;
    getReleases(episodeId: number | number[]): Promise<EpisodeRelease[]>;
    getReleasesByHost(episodeId: number | number[], host: string): Promise<EpisodeRelease[]>;
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
    getTocSearchMedia(): Promise<TocSearchMedium[]>;
    deleteOldNews(): Promise<boolean>;
}
export declare const Storage: Storage;
/**
 *
 */
export declare const startStorage: () => void;
export {};
