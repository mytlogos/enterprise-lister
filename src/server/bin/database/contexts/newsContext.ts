import {SubContext} from "./subContext";
import {News, Uuid, MultiSingleValue, PromiseMultiSingle, Optional} from "../../types";
import {Errors, promiseMultiSingle} from "../../tools";
import { storeModifications } from "../sqlTools";

export class NewsContext extends SubContext {
    /**
     * Inserts a News item into the Storage.
     * Returns a News item with id if insert was successful.
     * Returns undefined (or an Array with undefined)
     * if insert was not successful (meaning it was an duplicate).
     *
     * @param {News|Array<News>} news
     * @return {Promise<News|undefined|Array<News|undefined>>}
     */
    public async addNews<T extends MultiSingleValue<News>>(news: T): PromiseMultiSingle<T, Optional<News>> {
        // TODO: 29.06.2019 if inserting multiple rows in a single insert, what happens with result.insertId?
        return promiseMultiSingle(news, async (value: News) => {
            // an empty link may be the result of a faulty link (e.g. a link which leads to 404 error)
            if (!value.link) {
                return;
            }
            if (!value.title || !value.date) {
                return Promise.reject(new Error(Errors.INVALID_INPUT));
            }
            let result = await this.query(
                "INSERT IGNORE INTO news_board (title, link, date) VALUES (?,?,?);",
                [value.title, value.link, value.date],
            );
            if (!Number.isInteger(result.insertId)) {
                throw Error(`invalid ID ${result.insertId}`);
            }
            storeModifications("news", "insert", result);
            if (!result.affectedRows) {
                return;
            }
            result = {...value, id: result.insertId};
            return result;
        });
    }

    public getLatestNews(domain: string): Promise<News[]> {
        return this.query(
            "SELECT * FROM news_board WHERE locate(?, link) < 9 ORDER BY date DESC LIMIT 10",
            domain
        );
    }

    public async getAll(uuid: Uuid): Promise<News[]> {
        const newsResult: any[] = await this.query(
            "SELECT * FROM news_board LEFT JOIN " +
            "(SELECT news_id,1 AS read_news FROM news_user WHERE user_id=?) as news_user " +
            "ON news_user.news_id=news_board.id " +
            "WHERE id IN (" +
            "SELECT news_id FROM news_medium WHERE medium_id IN(" +
            "SELECT medium_id FROM list_medium WHERE list_id IN (" +
            "SELECT id FROM reading_list WHERE user_uuid = ?) UNION SELECT medium_id FROM external_list_medium " +
            "WHERE list_id IN (SELECT id from external_reading_list " +
            "WHERE user_uuid IN (SELECT uuid FROM external_user WHERE local_uuid = ?" +
            "))))" +
            "ORDER BY date DESC LIMIT 100",
            [uuid, uuid, uuid]
        );

        return newsResult.map((value): News => {
            return {
                title: value.title,
                date: value.date,
                link: value.link,
                id: value.id,
                read: Boolean(value.read_news),
            };
        });
    }

    /**
     *
     */
    public async getNews(uuid: Uuid, since?: Date, till?: Date, newsIds?: number[]): Promise<News[]> {
        let parameter: Array<Date | string> | string;
        let query: string;

        if (newsIds) {
            if (!newsIds.length || newsIds.some((newsId) => !Number.isInteger(newsId) && newsId > 0)) {
                return [];
            }
            query = "SELECT * FROM news_board " +
                "LEFT JOIN (SELECT news_id,1 AS read_news FROM news_user WHERE user_id=?) " +
                "as news_user ON news_user.news_id=news_board.id " +
                "WHERE id IN (" + newsIds.join(", ") + ");";
            parameter = uuid;
        } else {
            // TODO query looks horrible, replace it with something better?
            // a time based query
            query = "SELECT * FROM news_board " +
                "LEFT JOIN (SELECT news_id,1 AS read_news FROM news_user WHERE user_id=?) " +
                "as news_user ON news_user.news_id=news_board.id " +
                // where date between since and till
                `WHERE ${since ? "? < date AND " : ""} ? > date AND id IN ` +
                "(SELECT news_id FROM news_medium WHERE medium_id IN" +
                // and news id from either an medium in user list or external list
                "(SELECT medium_id FROM list_medium WHERE list_id IN " +
                "(SELECT id FROM reading_list WHERE user_uuid = ?) " +
                "UNION SELECT medium_id FROM external_list_medium WHERE list_id IN " +
                "(SELECT id from external_reading_list WHERE user_uuid IN " +
                "(SELECT uuid FROM external_user WHERE local_uuid = ?))))" +
                "ORDER BY date DESC LIMIT 100";

            if (!till) {
                till = new Date();
            }
            parameter = [till, uuid, uuid];
            if (since) {
                parameter.unshift(since);
            }
            parameter.unshift(uuid);

        }
        const newsResult: any[] = await this.query(query, parameter);

        return newsResult.map((value): News => {
            return {
                title: value.title,
                date: value.date,
                link: value.link,
                id: value.id,
                read: Boolean(value.read_news),
            };
        });
    }

    /**
     *
     */
    public async deleteOldNews(): Promise<boolean> {
        await this.query("DELETE FROM news_medium WHERE news_id IN " +
            "(SELECT news_id FROM news_board WHERE date < NOW() - INTERVAL 30 DAY);");
        const result = await this.query("DELETE FROM news_board WHERE date < NOW() - INTERVAL 30 DAY;");
        storeModifications("news", "delete", result);
        return result.affectedRows > 0;
    }

    /**
     * Marks these news as read for the given user.
     */
    public async markRead(uuid: Uuid, news: number[]): Promise<boolean> {
        await this.multiInsert(
            "INSERT IGNORE INTO news_user (user_id, news_id) VALUES",
            news,
            (value) => [uuid, value]
        );
        return true;
    }

    /**
     *
     */
    public async checkUnreadNewsCount(uuid: Uuid): Promise<number> {
        const result = await this.query(
            "SELECT COUNT(*) AS count FROM news_board WHERE id NOT IN " +
            "(SELECT news_id FROM news_user WHERE user_id = ?);",
            uuid
        );
        return result[0].count;
    }

    /**
     *
     */
    public checkUnreadNews(uuid: Uuid): Promise<number[]> {
        return this.query(
            "SELECT * FROM news_board WHERE id NOT IN (SELECT news_id FROM news_user WHERE user_id = ?);",
            uuid
        );
    }

    /**
     *
     */
    public async linkNewsToMedium(): Promise<boolean> {
        // TODO maybe implement this with a trigger
        const result = await this.query(
            "INSERT IGNORE INTO news_medium (medium_id, news_id)" +
            "SELECT medium.id, news_board.id FROM medium,news_board " +
            "WHERE locate(medium.title, news_board.title) > 0",
        );
        return result.affectedRows > 0;
    }

    /**
     *
     */
    public async removeLinkNewsToMedium(newsId: number, mediumId: number): Promise<boolean> {
        const columns = [];
        if (newsId != null) {
            columns.push({
                column: "news_id",
                value: newsId,
            });
        }
        if (mediumId != null) {
            columns.push({
                column: "medium_id",
                value: mediumId,
            });
        }
        return this.delete("news_medium", ...columns).then(value => value.affectedRows > 0);
    }
}
