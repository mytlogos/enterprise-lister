import { Id, Insert, Notification, UserNotification, Uuid } from "@/types";
import { SubContext } from "./subContext";

export class NotificationContext extends SubContext {
  private readonly tableName = "notifications";

  public async insertNotification(notification: Insert<Notification>): Promise<Notification> {
    const result = await this.dmlQuery(
      'INSERT INTO notifications ("title", "content", "date", "key", "type") VALUES (?,?,?,?,?) RETURNING id;',
      [notification.title, notification.content, notification.date, notification.key, notification.type],
    );

    notification.id = result.rows[0].id;
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
      (updates, values) => {
        updates.push("title = ?");
        values.push(notification.title);

        updates.push("content = ?");
        values.push(notification.content);

        updates.push("date = ?");
        values.push(notification.date);

        updates.push("key = ?");
        values.push(notification.key);

        updates.push("type = ?");
        values.push(notification.type);
      },
      {
        column: "id",
        value: notification.id,
      },
    );
    return result.rowCount > 0;
  }

  public async getNotifications(date: Date, uuid: Uuid, read: boolean, size?: number): Promise<UserNotification[]> {
    const args = [date, uuid] as any[];
    const limit = size && size > 0 ? " LIMIT ?" : "";

    if (limit) {
      args.push(size);
    }

    if (read) {
      return this.select(
        'SELECT n.*, true as "read" FROM notifications as n WHERE date > ? AND id IN (select id from notifications_read where uuid = ?) ORDER BY date desc' +
          limit,
        args,
      );
    } else {
      return this.select(
        'SELECT n.*, false as "read" FROM notifications as n WHERE date > ? AND id NOT IN (select id from notifications_read where uuid = ?) ORDER BY date desc' +
          limit,
        args,
      );
    }
  }

  public async readNotification(id: Id, uuid: Uuid): Promise<boolean> {
    const result = await this.dmlQuery(
      "INSERT INTO notifications_read (id, uuid) VALUES (?, ?) ON CONFLICT DO NOTHING",
      [id, uuid],
    );
    return result.rowCount > 0;
  }

  public async countNotifications(uuid: Uuid, read: boolean): Promise<number> {
    let result;
    if (read) {
      result = await this.select<any>("SELECT count(id) as count FROM notifications_read WHERE uuid = ?", uuid);
    } else {
      result = await this.select<any>(
        "SELECT count(id) as count FROM notifications WHERE id not in (SELECT id as count FROM notifications_read WHERE uuid = ?)",
        uuid,
      );
    }
    return result[0].count;
  }

  public async readAllNotifications(uuid: Uuid): Promise<boolean> {
    const result = await this.dmlQuery(
      "INSERT INTO notifications_read (id, uuid) SELECT id, ? FROM notifications ON CONFLICT DO NOTHING",
      uuid,
    );
    return result.rowCount > 0;
  }
}
