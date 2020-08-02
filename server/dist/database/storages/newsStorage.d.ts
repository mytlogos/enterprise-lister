import { News } from "../../types";
import { NewsItemRequest } from "../databaseTypes";
export declare class NewsStorage {
    /**
     * Inserts a News item into the Storage.
     * Returns a News item with id if insert was successful.
     * Returns undefined (or an Array with undefined)
     * if insert was not successful (meaning it was an duplicate).
     */
    addNews(news: News | News[]): Promise<News | undefined | Array<News | undefined>>;
    getAll(uuid: any): Promise<News[]>;
    /**
     *
     */
    getNews({ uuid, since, till, newsIds }: NewsItemRequest): Promise<News[]>;
    /**
     *
     */
    deleteOldNews(): Promise<boolean>;
    /**
     * Marks these news as read for the given user.
     */
    markNewsRead(uuid: string, news: number[]): Promise<boolean>;
    /**
     * Marks these news as read for the given user.
     */
    checkUnreadNews(uuid: string): Promise<number>;
    getLatestNews(domain: string): Promise<News[]>;
    /**
     *
     */
    removeLinkNewsToMedium(newsId: number, mediumId: number): Promise<boolean>;
    /**
     *
     */
    linkNewsToMedium(): Promise<boolean>;
}
