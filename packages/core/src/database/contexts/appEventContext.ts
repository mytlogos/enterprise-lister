import { AppEvent, AppEventFilter } from "../../types";
import { SubContext } from "./subContext";

export class AppEventContext extends SubContext {
  public async addAppEvent(event: AppEvent): Promise<AppEvent> {
    const newEvent = await this.query(
      'INSERT INTO app_events ("program", "date", "type") VALUES (?,?,?) RETURNING "id", "program", "date", "type"',
      [event.program, event.date, event.type],
    );
    return newEvent.rows[0];
  }

  public async updateAppEvent(event: AppEvent): Promise<void> {
    await this.update(
      "app_events",
      (updates, values) => {
        updates.push('"date" = ?');
        values.push(event.date);
      },
      {
        column: "id",
        value: event.id,
      },
    );
  }

  public async getAppEvents(filter: AppEventFilter = {}): Promise<AppEvent[]> {
    let sort = "";

    if (Array.isArray(filter.sortOrder)) {
      sort = filter.sortOrder.join(",");
    } else if (filter.sortOrder) {
      sort = filter.sortOrder;
    }
    const where = [];
    const values = [];

    if (Array.isArray(filter.program)) {
      where.push("type IN (" + filter.program.map(() => "?").join(",") + ")");
      values.push(...filter.program);
    } else if (filter.program) {
      where.push("program = ?");
      values.push(filter.program);
    }

    if (Array.isArray(filter.type)) {
      where.push("type IN (" + filter.type.map(() => "?").join(",") + ")");
      values.push(...filter.type);
    } else if (filter.type) {
      where.push("type = ?");
      values.push(filter.type);
    }

    if (filter.fromDate) {
      where.push("date >= ?");
      values.push(filter.fromDate);
    }

    if (filter.toDate) {
      where.push("date <= ?");
      values.push(filter.toDate);
    }

    const result = await this.query(
      `SELECT id, program, date, type FROM app_events${where.length ? " WHERE " + where.join(" AND ") : ""}${
        sort ? " ORDER BY " + sort : ""
      };`,
      values,
    );
    return result.rows;
  }
}
