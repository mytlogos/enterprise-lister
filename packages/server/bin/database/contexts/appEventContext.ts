import { AppEvent, AppEventFilter } from "@/types";
import { SubContext } from "./subContext";

export class AppEventContext extends SubContext {
  public async addAppEvent(event: AppEvent): Promise<void> {
    await this.query("INSERT INTO app_events (`program`, `date`, `type`) VALUES (?,?,?)", [
      event.program,
      event.date,
      event.type,
    ]);
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

    return this.query(
      `SELECT id, program, date, type FROM app_events${where.length ? " WHERE " + where.join(" AND ") : ""}${
        sort ? " ORDER BY " + sort : ""
      };`,
      values,
    );
  }
}
