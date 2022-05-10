import { SubContext } from "./subContext";
import { ScraperHook, TypedQuery } from "../../types";
import { storeModifications } from "../sqlTools";
import { escapeLike } from "../storages/storageTools";
import { ValidationError } from "../../error";

export class ScraperHookContext extends SubContext {
  public async getAllStream(): Promise<TypedQuery<ScraperHook>> {
    return this.queryStream("SELECT id, name, state, message FROM scraper_hook");
  }

  public async getAll(): Promise<ScraperHook[]> {
    return this.query("SELECT id, name, state, message FROM scraper_hook");
  }

  /**
   * Adds a scraper_hook of an medium to the storage.
   */
  public async addScraperHook(scraperHook: ScraperHook): Promise<void> {
    const result = await this.query("INSERT INTO scraper_hook (id, name, state, message) VALUES (?,?,?,?);", [
      scraperHook.id,
      scraperHook.name,
      scraperHook.state,
      scraperHook.message,
    ]);
    storeModifications("scraper_hook", "insert", result);
  }

  /**
   * Updates a scraperHook.
   */
  public async updateScraperHook(scraperHook: ScraperHook): Promise<boolean> {
    let result = await this.update(
      "scraper_hook",
      (updates, values) => {
        if (scraperHook.message) {
          updates.push("message = ?");
          values.push(scraperHook.message);
        } else if (scraperHook.message === null) {
          throw new ValidationError("Cannot set the message of scraper_hook to null");
        }
        if (scraperHook.state) {
          updates.push("state = ?");
          values.push(scraperHook.state);
        } else if (scraperHook.state === null) {
          throw new ValidationError("Cannot set the state of scraper_hook to null");
        }
      },
      {
        column: "id",
        value: scraperHook.id,
      },
    );
    storeModifications("scraper_hook", "update", result);
    result = await this.query(
      `UPDATE jobs SET job_state = ? WHERE name LIKE '%${escapeLike(scraperHook.name)}%'`,
      scraperHook.state,
    );
    storeModifications("job", "update", result);
    return result.changedRows > 0;
  }

  /**
   * Deletes a scraper hook from the storage irreversibly.
   */
  public async deleteScraperHook(id: number): Promise<boolean> {
    const result = await this.delete("scraper_hook", { column: "id", value: id });
    storeModifications("scraper_hook", "delete", result);
    return result.affectedRows > 0;
  }
}
