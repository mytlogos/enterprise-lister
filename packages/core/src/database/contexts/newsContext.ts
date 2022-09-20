import { Uuid, Insert } from "../../types";
import { QueryContext } from "./queryContext";
import { sql } from "slonik";
import { entity, News, news, SimpleNews, simpleNews } from "../databaseTypes";

export class NewsContext extends QueryContext {
  /**
   * Inserts a News item into the Storage.
   * Returns a News item with id if insert was successful.
   * Returns undefined (or an Array with undefined)
   * if insert was not successful (meaning it was an duplicate).
   *
   * @param {News|Array<News>} news
   * @return {Promise<News|undefined|Array<News|undefined>>}
   */
  public async addNews(news: ReadonlyArray<Insert<SimpleNews>>): Promise<readonly SimpleNews[]> {
    // an empty link may be the result of a faulty link (e.g. a link which leads to 404 error)
    const values = news.map((value) => {
      return [value.title, value.link, value.date ? sql.timestamp(value.date) : null];
    });

    const result = await this.con.any(
      sql.type(simpleNews)`
      INSERT INTO news_board (title, link, date)
      SELECT * FROM ${sql.unnest(values, ["text", "text", "timestamptz"])}
      RETURNING id, title, link, date;`,
    );
    // FIXME: storeModifications("news", "insert", result);
    return result;
  }

  public getLatestNews(domain: string): Promise<readonly SimpleNews[]> {
    return this.con.any(
      sql.type(simpleNews)`SELECT * FROM news_board WHERE strpos(link, ${domain}) < 9 ORDER BY date DESC LIMIT 10`,
    );
  }

  public async getAll(uuid: Uuid): Promise<readonly News[]> {
    return this.con.any(
      sql.type(news)`
      SELECT news_board.id, news_board.title, news_board.link, news_board.id, news_user.read
      FROM news_board
      LEFT JOIN (
        SELECT news_id,true AS read FROM news_user WHERE user_id=${uuid}
      ) as news_user ON news_user.news_id=news_board.id
      WHERE id IN (
        SELECT news_id FROM news_medium WHERE medium_id IN (
          SELECT medium_id FROM list_medium WHERE list_id IN (
            SELECT id FROM reading_list WHERE user_uuid = ${uuid}
          )
          UNION SELECT medium_id FROM external_list_medium
          WHERE list_id IN (
            SELECT id from external_reading_list
            WHERE user_uuid IN (
              SELECT uuid FROM external_user WHERE local_uuid = ${uuid}
            )
          )
        )
      )
      ORDER BY date DESC LIMIT 100;`,
    );
  }

  /**
   *
   */
  public async getNews(uuid: Uuid, since?: Date, till?: Date, newsIds?: number[]): Promise<readonly News[]> {
    let query;

    if (newsIds) {
      if (!newsIds.length || newsIds.some((newsId) => !Number.isInteger(newsId) && newsId > 0)) {
        return [];
      }
      query = sql.type(news)`SELECT id, title, link, date, read FROM news_board
        LEFT JOIN (
          SELECT news_id,true AS read FROM news_user WHERE user_id=${uuid}
        )
        as news_user ON news_user.news_id=news_board.id
        WHERE id = ANY(${sql.array(newsIds, "int8")});`;
    } else {
      // TODO query looks horrible, replace it with something better?
      // a time based query
      query = sql.type(news)`SELECT id, title, link, date, read FROM news_board
        LEFT JOIN (
          SELECT news_id,true AS read FROM news_user WHERE user_id=${uuid}
        )
        as news_user ON news_user.news_id=news_board.id
        -- where date between since and till
        WHERE ${since ? sql`date > ${sql.timestamp(since)} AND ` : sql``}
        date < ${sql.timestamp(till ?? new Date())}
        AND id IN (
          SELECT news_id FROM news_medium WHERE medium_id IN (
            -- and news id from either an medium in user list or external list
            SELECT medium_id FROM list_medium WHERE list_id IN (
              SELECT id FROM reading_list WHERE user_uuid = ${uuid}
            ) 
            UNION SELECT medium_id FROM external_list_medium WHERE list_id IN (
              SELECT id from external_reading_list WHERE user_uuid IN (
                SELECT uuid FROM external_user WHERE local_uuid = ${uuid}
              )
            )
          )
        )
        ORDER BY date DESC LIMIT 100`;
    }
    return this.con.any(query);
  }

  /**
   *
   */
  public async deleteOldNews(): Promise<boolean> {
    await this.con.query(
      sql`DELETE FROM news_medium WHERE news_id IN (
        SELECT news_id FROM news_board WHERE date < NOW() - INTERVAL 30 DAY
      );`,
    );
    await this.con.query(sql`DELETE FROM news_board WHERE date < NOW() - INTERVAL 30 DAY;`);
    // FIXME: storeModifications("news", "delete", result);
    return false;
  }

  /**
   * Marks these news as read for the given user.
   */
  public async markRead(uuid: Uuid, news: number[]): Promise<boolean> {
    const values = news.map((value) => [uuid, value]);
    await this.con.query(
      sql`
      INSERT INTO news_user (user_id, news_id)
      SELECT * FROM ${sql.unnest(values, ["text", "int8"])}
      ON CONFLICT DO NOTHING`,
    );
    return true;
  }

  /**
   *
   */
  public async checkUnreadNewsCount(uuid: Uuid): Promise<number> {
    return this.con.oneFirst<{ count: number }>(
      sql`SELECT COUNT(*) AS count FROM news_board WHERE id NOT IN (SELECT news_id FROM news_user WHERE user_id = ${uuid});`,
    );
  }

  /**
   *
   */
  public checkUnreadNews(uuid: Uuid): Promise<readonly number[]> {
    return this.con.manyFirst(
      sql.type(entity)`SELECT id FROM news_board WHERE id NOT IN (
        SELECT news_id FROM news_user WHERE user_id = ${uuid}
      );`,
    );
  }

  /**
   *
   */
  public async linkNewsToMedium(): Promise<boolean> {
    // TODO maybe implement this with a trigger
    await this.con.query(
      sql`INSERT INTO news_medium (medium_id, news_id)
        SELECT medium.id, news_board.id FROM medium,news_board 
        WHERE strpos(news_board.title, medium.title) > 0
        ON CONFLICT DO NOTHING`,
    );
    return false;
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
    return this.delete("news_medium", ...columns).then((value) => value.rowCount > 0);
  }
}
