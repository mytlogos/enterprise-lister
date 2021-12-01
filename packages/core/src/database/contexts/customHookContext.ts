import { SubContext } from "./subContext";
import { Errors } from "../../tools";
import { storeModifications } from "../sqlTools";
import { CustomHook } from "@/types";

export class CustomHookContext extends SubContext {
  public async addHook(value: CustomHook): Promise<CustomHook> {
    if (value.id) {
      return Promise.reject(new Error(Errors.INVALID_INPUT));
    }
    if (typeof value.state === "object") {
      value.state = JSON.stringify(value.state);
    }

    let result = await this.query("INSERT IGNORE INTO custom_hook (name, state) VALUES (?,?);", [
      value.name,
      value.state,
    ]);
    if (!Number.isInteger(result.insertId) || result.insertId === 0) {
      throw Error(`invalid ID ${result.insertId}`);
    }
    storeModifications("custom_hook", "insert", result);

    result = { ...value, id: result.insertId };
    return result;
  }
}
