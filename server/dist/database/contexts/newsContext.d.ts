import { SubContext } from "./subContext";
import { News } from "../../types";
export declare class NewsContext extends SubContext {
    /**
     * Inserts a News item into the Storage.
     * Returns a News item with id if insert was successful.
     * Returns undefined (or an Array with undefined)
     * if insert was not successful (meaning it was an duplicate).
     *
     * @param {News|Array<News>} news
     * @return {Promise<News|undefined|Array<News|undefined>>}
     */
    addNews(news: News | News[]): Promise<News | undefined | Array<News | undefined>>;
    getLatestNews(domain: string): Promise<News[]>;
    getAll(uuid: any): Promise<News[]>;
    /**
     *
     */
    getNews(uuid: string, since?: Date, till?: Date, newsIds?: number[]): Promise<News[]>;
    /**
     *
     */
    deleteOldNews(): Promise<boolean>;
    /**
     * Marks these news as read for the given user.
     */
    markRead(uuid: string, news: number[]): Promise<boolean>;
    /**
     *
     */
    checkUnreadNewsCount(uuid: string): Promise<number>;
    /**
     *
     */
    checkUnreadNews(uuid: string): Promise<number[]>;
    /**
     *
     */
    linkNewsToMedium(): Promise<boolean>;
    /**
     *
     */
    removeLinkNewsToMedium(newsId: number, mediumId: number): Promise<boolean>;
}
