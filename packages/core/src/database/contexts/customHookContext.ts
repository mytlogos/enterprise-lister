import { SubContext } from "./subContext";
import { isInvalidId } from "../../tools";
import { storeModifications } from "../sqlTools";
import { CustomHook } from "@/types";
import { ValidationError } from "../../error";

export class CustomHookContext extends SubContext {
  public async addHook(value: CustomHook): Promise<CustomHook> {
    if (value.id) {
      throw new ValidationError("Cannot add Hook with id already defined");
    }
    if (typeof value.state === "object") {
      value.state = JSON.stringify(value.state);
    }

    const result = await this.query(
      "INSERT INTO custom_hook (name, state, hookState, comment) VALUES (?,?,?,?) ON CONFLICT DO NOTHING RETURNING id;",
      [value.name, value.state, value.hookState, value.comment],
    );
    if (!result.rows.length || !Number.isInteger(result.rows[0].id) || result.rows[0].id === 0) {
      throw new ValidationError(`invalid ID ${result.rows[0]?.id + ""}`);
    }
    storeModifications("custom_hook", "insert", result);

    return { ...value, id: result.rows[0].id };
  }

  public async getHooks(): Promise<CustomHook[]> {
    const result = await this.query("SELECT id, name, state, updated_at, hookState, comment FROM custom_hook;");
    return result.rows;
  }

  public async updateHook(value: CustomHook): Promise<CustomHook> {
    if (isInvalidId(value.id)) {
      throw new ValidationError(`Invalid id: '${value.id}'`);
    }
    const updateResult = await this.update(
      "custom_hook",
      (updates, values) => {
        updates.push("comment = ?");
        values.push(value.comment);

        updates.push("hookState = ?");
        values.push(value.hookState);

        updates.push("name = ?");
        values.push(value.name);

        updates.push("state = ?");
        values.push(value.state);
      },
      {
        column: "id",
        value: value.id,
      },
    );

    storeModifications("custom_hook", "update", updateResult);

    return value;
  }
}
