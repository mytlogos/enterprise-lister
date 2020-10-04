import {News} from "../../types";
import {storageInContext} from "./storage";
import {ContextCallback, queryContextProvider} from "./storageTools";
import {NewsContext} from "../contexts/newsContext";
import {NewsItemRequest} from "../databaseTypes";

function inContext<T>(callback: ContextCallback<T, NewsContext>, transaction = true) {
    return storageInContext(callback, transaction, (con) => queryContextProvider(con).newsContext);
}

export class NewsStorage {
    /**
     * Inserts a News item into the Storage.
     * Returns a News item with id if insert was successful.
     * Returns undefined (or an Array with undefined)
     * if insert was not successful (meaning it was an duplicate).
     */
    public addNews(news: News | News[]): Promise<News | undefined | Array<News | undefined>> {
        return inContext((context) => context.addNews(news));
    }

    public getAll(uuid: string): Promise<News[]> {
        return inContext((context) => context.getAll(uuid));
    }

    /**
     *
     */
    public getNews({uuid, since, till, newsIds}: NewsItemRequest): Promise<News[]> {
        return inContext((context) => context.getNews(uuid, since, till, newsIds));
    }

    /**
     *
     */
    public deleteOldNews(): Promise<boolean> {
        return inContext((context) => context.deleteOldNews());
    }

    /**
     * Marks these news as read for the given user.
     */
    public markNewsRead(uuid: string, news: number[]): Promise<boolean> {
        return inContext((context) => context.markRead(uuid, news));
    }

    /**
     * Marks these news as read for the given user.
     */
    public checkUnreadNews(uuid: string): Promise<number> {
        return inContext((context) => context.checkUnreadNewsCount(uuid));
    }


    public getLatestNews(domain: string): Promise<News[]> {
        return inContext((context) => context.getLatestNews(domain));
    }

    /**
     *
     */
    public removeLinkNewsToMedium(newsId: number, mediumId: number): Promise<boolean> {
        return inContext((context) => context.removeLinkNewsToMedium(newsId, mediumId));
    }

    /**
     *
     */
    public linkNewsToMedium(): Promise<boolean> {
        return inContext((context) => context.linkNewsToMedium());
    }

}
