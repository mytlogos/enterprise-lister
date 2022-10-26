import { Insert, ScraperHook, TypedQuery } from "../../types";
import { escapeLike } from "../storages/storageTools";
import { ValidationError } from "../../error";
import { QueryContext } from "./queryContext";
import { sql } from "slonik";
import { simpleScraperHook } from "../databaseTypes";

export class ScraperHookContext extends QueryContext {
  public async getAllStream(): Promise<TypedQuery<ScraperHook>> {
    return this.stream<ScraperHook>(sql.type(simpleScraperHook)`SELECT id, name, enabled, message FROM scraper_hook`);
  }

  public async getAll(): Promise<readonly ScraperHook[]> {
    return this.con.any(sql.type(simpleScraperHook)`SELECT id, name, enabled, message FROM scraper_hook`);
  }

  /**
   * Adds a scraper_hook of an medium to the storage.
   */
  public async addScraperHook(scraperHook: Insert<ScraperHook>): Promise<void> {
    await this.con.query(
      sql`
      INSERT INTO scraper_hook (name, enabled, message)
      VALUES (${scraperHook.name},${scraperHook.enabled},${scraperHook.message});`,
    );
    // FIXME: storeModifications("scraper_hook", "insert", result);
  }

  /**
   * Updates a scraperHook.
   */
  public async updateScraperHook(scraperHook: ScraperHook): Promise<boolean> {
    const result = await this.update(
      "scraper_hook",
      () => {
        const updates = [];

        if (scraperHook.message) {
          updates.push(sql`message = ${scraperHook.message}`);
        } else if (scraperHook.message === null) {
          throw new ValidationError("Cannot set the message of scraper_hook to null");
        }
        if (scraperHook.enabled) {
          updates.push(sql`enabled = ${scraperHook.enabled}`);
        } else if (scraperHook.enabled === null) {
          throw new ValidationError("Cannot set the enabled of scraper_hook to null");
        }
        return updates;
      },
      {
        column: "id",
        value: scraperHook.id,
      },
    );
    // FIXME: storeModifications("scraper_hook", "update", result);
    await this.con.query(
      sql`UPDATE jobs SET job_enabled = ${scraperHook.enabled} WHERE name LIKE ${
        "%" + escapeLike(scraperHook.name) + "%"
      }`,
    );
    // FIXME: storeModifications("job", "update", result);
    return result.rowCount > 0;
  }

  /**
   * Deletes a scraper hook from the storage irreversibly.
   */
  public async deleteScraperHook(id: number): Promise<boolean> {
    const result = await this.delete("scraper_hook", { column: "id", value: id });
    // FIXME: storeModifications("scraper_hook", "delete", result);
    return result.rowCount > 0;
  }
}
