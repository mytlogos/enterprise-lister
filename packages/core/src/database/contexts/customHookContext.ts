import { ValidationError } from "../../error";
import { QueryContext } from "./queryContext";
import { customHook, entity, CustomHook } from "../databaseTypes";
import { sql } from "slonik";
import { isString } from "validate.js";

export class CustomHookContext extends QueryContext {
  public async addHook(value: Readonly<CustomHook>): Promise<CustomHook> {
    if (value.id) {
      throw new ValidationError("Cannot add Hook with id already defined");
    }

    const state = isString(value.state) ? JSON.parse(value.state as string) : value.enabled;

    const id = await this.con.oneFirst(
      sql.type(entity)`
      INSERT INTO custom_hook (name, state, enabled, comment)
      VALUES (${value.name},${sql.jsonb(state)},${value.enabled},${value.comment})
      ON CONFLICT DO NOTHING RETURNING id;`,
    );

    // FIXME: storeModifications("custom_hook", "insert", result);

    return { ...value, id };
  }

  public async getHooks(): Promise<readonly CustomHook[]> {
    return this.con.any(
      sql.type(customHook)`
      SELECT id, name, state, updated_at, enabled, comment FROM custom_hook;`,
    );
  }

  public async updateHook(value: CustomHook): Promise<CustomHook> {
    customHook.parse(value);
    await this.update(
      "custom_hook",
      () => {
        return [
          sql`comment = ${value.comment}`,
          sql`enabled = ${value.enabled}`,
          sql`name = ${value.name}`,
          sql`state = ${sql.jsonb(value.state)}`,
        ];
      },
      {
        column: "id",
        value: value.id,
      },
    );

    // FIXME storeModifications("custom_hook", "update", updateResult);

    return value;
  }
}
