import { sql } from "slonik";
import { AppEventFilter } from "../../types";
import { appEvent, AppEvent } from "../databaseTypes";
import { joinAnd, joinIdentifier } from "./helper";
import { QueryContext } from "./queryContext";

export class AppEventContext extends QueryContext {
  public async addAppEvent(event: Readonly<AppEvent>): Promise<AppEvent> {
    return this.con.one(
      sql.type(appEvent)`
      INSERT INTO app_events (program, date, type)
      VALUES (${event.program},${sql.timestamp(event.date)},${event.type}) 
      RETURNING id, program, date, type`,
    );
  }

  public async updateAppEvent(event: Readonly<AppEvent>): Promise<void> {
    await this.update(
      "app_events",
      () => {
        return [sql`date = ${sql.timestamp(event.date)}`];
      },
      {
        column: "id",
        value: event.id,
      },
    );
  }

  public async getAppEvents(filter: AppEventFilter = {}): Promise<readonly AppEvent[]> {
    if (!Array.isArray(filter.sortOrder) && filter.sortOrder) {
      filter.sortOrder = [filter.sortOrder];
    }
    if (!Array.isArray(filter.program) && filter.program) {
      filter.program = [filter.program];
    }
    if (!Array.isArray(filter.type) && filter.type) {
      filter.type = [filter.type];
    }

    const whereFilter = [];

    if (filter.fromDate) {
      whereFilter.push(sql`date >= ${sql.timestamp(filter.fromDate)}`);
    }
    if (filter.toDate) {
      whereFilter.push(sql`date >= ${sql.timestamp(filter.toDate)}`);
    }
    if (Array.isArray(filter.program)) {
      const array = sql.array(filter.program, "text");
      whereFilter.push(sql`program = ANY(${array})`);
    }
    if (Array.isArray(filter.type)) {
      const array = sql.array(filter.type, "text");
      whereFilter.push(sql`program = ANY(${array})`);
    }

    const whereClause = whereFilter.length ? sql` WHERE ${joinAnd(whereFilter)}` : sql``;
    const orderClause = filter.sortOrder?.length ? sql` ORDER BY ${joinIdentifier(filter.sortOrder)}` : sql``;

    return this.con.any(
      sql.type(appEvent)`
      SELECT id, program, date, type FROM app_events${whereClause}${orderClause};`,
    );
  }
}
