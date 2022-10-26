import { Id, Insert, Uuid } from "../../types";
import { sql } from "slonik";
import { entity, Notification, userNotification, UserNotification } from "../databaseTypes";
import { QueryContext } from "./queryContext";

export class NotificationContext extends QueryContext {
  private readonly tableName = "notifications";

  public async insertNotification(notification: Insert<Notification>): Promise<Notification> {
    notification.id = await this.con.oneFirst(
      sql.type(entity)`INSERT INTO notifications (title, content, date, key, type)
      VALUES (
        ${notification.title},${notification.content},${sql.timestamp(notification.date)},
        ${notification.key},${notification.type}
      )
      RETURNING id;`,
    );
    return notification as Notification;
  }

  public async deleteNotification(notification: Notification): Promise<boolean> {
    const result = await this.delete(this.tableName, {
      column: "id",
      value: notification.id,
    });
    return result.rowCount > 0;
  }

  public async updateNotification(notification: Notification): Promise<boolean> {
    const result = await this.update(
      this.tableName,
      () => {
        const updates = [];
        updates.push(sql`title = ${notification.title}`);
        updates.push(sql`content = ${notification.content}`);
        updates.push(sql`date = ${sql.timestamp(notification.date)}`);
        updates.push(sql`key = ${notification.key}`);
        updates.push(sql`type = ${notification.type}`);
        return updates;
      },
      {
        column: "id",
        value: notification.id,
      },
    );
    return result.rowCount > 0;
  }

  public async getNotifications(
    date: Date,
    uuid: Uuid,
    read: boolean,
    size?: number,
  ): Promise<readonly UserNotification[]> {
    const limit = size && size > 0 ? sql` LIMIT ${size}` : sql``;

    return this.con.any(
      sql.type(userNotification)`
      SELECT n.title, n.content, n.date, n.key, n.type, ${read ? sql`true` : sql`false`} as read
      FROM notifications as n
      WHERE date > ${sql.timestamp(date)} AND id ${read ? sql`NOT ` : sql``}IN (
        select id from notifications_read where uuid = ${uuid}
      ) ORDER BY date desc${limit}`,
    );
  }

  public async readNotification(id: Id, uuid: Uuid): Promise<boolean> {
    await this.con.query(
      sql`INSERT INTO notifications_read (id, uuid)
      VALUES (${id}, ${uuid})
      ON CONFLICT DO NOTHING`,
    );
    return false;
  }

  public async countNotifications(uuid: Uuid, read: boolean): Promise<number> {
    if (read) {
      return this.con.oneFirst<{ count: number }>(
        sql`SELECT count(id) as count FROM notifications_read WHERE uuid = ${uuid}`,
      );
    } else {
      return this.con.oneFirst<{ count: number }>(
        sql`SELECT count(id) as count FROM notifications WHERE id not in (SELECT id as count FROM notifications_read WHERE uuid = ${uuid})`,
      );
    }
  }

  public async readAllNotifications(uuid: Uuid): Promise<boolean> {
    const result = await this.con.query(
      sql`INSERT INTO notifications_read (id, uuid) SELECT id, ${uuid} FROM notifications ON CONFLICT DO NOTHING`,
    );
    return result.rowCount > 0;
  }
}
