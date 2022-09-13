import { SubContext } from "./subContext";
import { isInvalidId } from "../../tools";
import { storeModifications } from "../sqlTools";
import { CustomHook, Entity } from "@/types";
import { ValidationError } from "../../error";

export class CustomHookContext extends SubContext {
  public async addHook(value: CustomHook): Promise<CustomHook> {
    if (value.id) {
      throw new ValidationError("Cannot add Hook with id already defined");
    }
    if (typeof value.state === "object") {
      value.state = JSON.stringify(value.state);
    }

    const result = await this.query<Entity>(
      "INSERT INTO custom_hook (name, state, hookState, comment) VALUES (?,?,?,?) ON CONFLICT DO NOTHING RETURNING id;",
      [value.name, value.state, value.hookState, value.comment],
    );
    const id = result.rows[0]?.id;

    if (!id || !Number.isInteger(id) || id === 0) {
      throw new ValidationError(`invalid ID ${id + ""}`);
    }
    storeModifications("custom_hook", "insert", result);

    return { ...value, id };
  }

  public async getHooks(): Promise<CustomHook[]> {
    const hooks = await this.select<CustomHook>(
      "SELECT id, name, state, updated_at, hookState, comment FROM custom_hook;",
    );
    return hooks.map((value) => ({ ...value, hookState: value.hookstate, hookstate: undefined }));
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
