import { Insert, Notification } from "@/types";
import { SubContext } from "./subContext";

export class NotificationContext extends SubContext {
  private readonly tableName = "notifications";

  public async insertNotification(notification: Insert<Notification>): Promise<Notification> {
    const result = await this.dmlQuery(
      "INSERT INTO notifications (`title`, `content`, `date`, `key`, `type`) VALUES (?,?,?,?,?);",
      [notification.title, notification.content, notification.date, notification.key, notification.type],
    );

    notification.id = result.insertId;
    return notification as Notification;
  }

  public async deleteNotification(notification: Notification): Promise<boolean> {
    const result = await this.delete(this.tableName, {
      column: "id",
      value: notification.id,
    });
    return result.affectedRows > 0;
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
    return result.affectedRows > 0;
  }

  public async getNotifications(date: Date): Promise<Notification[]> {
    return this.query("SELECT * FROM notifications WHERE date > ?", date);
  }
}
