import { DatabaseSchema, Migration } from "./databaseTypes";
import { TableSchema } from "./tableSchema";
import { Trigger } from "./trigger";
import { delay, equalsIgnore } from "../tools";
import { DatabaseContext } from "./contexts/databaseContext";
import logger from "../logger";
import { EmptyPromise, Nullable } from "../types";
import { MigrationError } from "../error";

export class SchemaManager {
  private databaseName = "";
  private dataBaseVersion = 0;
  private readonly tables: TableSchema[] = [];
  private mainTable: Nullable<TableSchema> = null;
  private readonly trigger: Trigger[] = [];
  private readonly migrations: Migration[] = [];

  public initTableSchema(database: DatabaseSchema, databaseName: string): void {
    this.databaseName = databaseName;
    this.dataBaseVersion = database.version;
    this.mainTable = database.mainTable;
    this.tables.push(...database.tables);
    this.trigger.push(...database.triggers);
    this.migrations.push(...database.migrations);
  }

  public async checkTableSchema(context: DatabaseContext): EmptyPromise {
    logger.info("Starting Check on Storage Schema");
    await this.createMissing(context);
    const canMigrate = await context.startMigration();
    if (!canMigrate) {
      await (async function wait(retry = 0) {
        if (retry > 9) {
          throw new MigrationError("cannot start migration check, as migration flag is still set after 10 retries");
        }
        await delay(1000);

        if (!(await context.startMigration())) {
          await wait(retry + 1);
        }
      })();
    }
    try {
      await this.migrate(context);
    } finally {
      await context.stopMigration();
    }
  }

  /**
   * Create any missing structures.
   * Currently creates any tables and triggers which do not yet exist in the database,
   * but are defined in the schema.
   *
   * Deletes any Triggers defined by name in the database, but not defined by name in the schema.
   *
   * @param context database context to use
   */
  private async createMissing(context: DatabaseContext): EmptyPromise {
    logger.info("Check on missing database structures");

    const tables: any[] = await context.getTables();

    const enterpriseTableProperty = `Tables_in_${this.databaseName}`;

    let tablesCreated = 0;
    // create tables which do not exist
    await Promise.all(
      this.tables
        .filter((tableSchema) => !tables.find((table: any) => table[enterpriseTableProperty] === tableSchema.name))
        .map(async (tableSchema) => {
          const schema = tableSchema.getTableSchema();
          await context.createTable(schema.name, schema.columns);
          // sloppy fix to add a single row to the table, to get "startMigration" to work on empty table
          if (schema.name === "enterprise_database_info") {
            await context.query("INSERT INTO enterprise_database_info (version) VALUES (0)");
          }
          tablesCreated++;
        }),
    );

    const dbTriggers = await context.getTriggers();

    let triggerCreated = 0;
    let triggerDeleted = 0;
    // create triggers which do not exist, and drops triggers which are not in schema
    await Promise.all(
      this.trigger
        .filter((trigger) => {
          for (let i = 0; i < dbTriggers.length; i++) {
            const dbTrigger = dbTriggers[i];

            if (
              equalsIgnore(dbTrigger.Trigger, trigger.name) &&
              equalsIgnore(dbTrigger.Event, trigger.event) &&
              equalsIgnore(dbTrigger.Timing, trigger.timing) &&
              equalsIgnore(dbTrigger.Table, trigger.table)
            ) {
              dbTriggers.splice(i, 1);
              return false;
            }
          }
          return true;
        })
        .map((trigger) => context.createTrigger(trigger).then(() => triggerCreated++)),
    );

    // every trigger that is left over, is not in schema and ready to be dropped
    await Promise.all(
      dbTriggers
        .filter((value) => this.tables.find((table) => table.name === value.Table))
        .map((value) => context.dropTrigger(value.Trigger).then(() => triggerDeleted++)),
    );
    logger.info("db check missing", {
      created_trigger: triggerCreated,
      deleted_trigger: triggerDeleted,
      tables_created: tablesCreated,
    });
  }

  private async migrate(context: DatabaseContext) {
    const versionResult = await context.getDatabaseVersion();
    let previousVersion = 0;

    if (versionResult?.[0] && versionResult[0].version > 0) {
      previousVersion = versionResult[0].version;
    }

    const currentVersion = this.dataBaseVersion;
    if (currentVersion === previousVersion) {
      logger.info("Storage Version is up-to-date");
      return;
    } else if (currentVersion < previousVersion) {
      throw new MigrationError("database version is smaller in code than in database");
    }

    if (previousVersion === 0) {
      logger.info("Created Database Content from Scratch, no Migration necessary");
    } else {
      const migrations: Migration[] = [];
      let lastMigrationVersion = previousVersion;
      let directMigration = null;

      while (lastMigrationVersion < currentVersion) {
        let foundMigration = false;
        for (const migration of this.migrations) {
          if (migration.fromVersion === previousVersion && migration.toVersion === currentVersion) {
            directMigration = migration;
            break;
          } else if (migration.fromVersion === lastMigrationVersion) {
            lastMigrationVersion = migration.toVersion;
            migrations.push(migration);
            foundMigration = true;
          }
        }
        if (directMigration) {
          break;
        }
        if (!foundMigration) {
          throw new MigrationError(`no migration plan found from '${previousVersion}' to '${currentVersion}'`);
        }
      }
      if (directMigration == null && (!migrations.length || lastMigrationVersion !== currentVersion)) {
        throw new MigrationError(`no migration plan found from '${previousVersion}' to '${currentVersion}'`);
      }
      logger.info("Starting Migration of Storage", { from: previousVersion, to: currentVersion });
      if (directMigration) {
        await directMigration.migrate(context);
      } else {
        for (const migration of migrations) {
          await migration.migrate(context);
        }
      }
    }
    // FIXME: 10.08.2019 inserting new database version does not seem to work
    await context.updateDatabaseVersion(currentVersion);
    logger.info("successfully migrated storage", { from: previousVersion, to: currentVersion });
  }
}

interface Root {
  children: Node[];
}

interface Node extends Root {
  migration: Migration;
  parents: Array<Node | Root>;
  children: Node[];
}
