import { DatabaseSchema, Migration } from "./databaseTypes";
import { TableSchema } from "./tableSchema";
import { delay } from "../tools";
import { DatabaseContext } from "./contexts/databaseContext";
import logger from "../logger";
import { EmptyPromise } from "../types";
import { MigrationError } from "../error";
import { sql, SqlSqlToken } from "slonik";
import { joinIdentifier } from "./contexts/helper";

export class SchemaManager {
  private databaseName = "";
  private dataBaseVersion = 0;
  private readonly tables: TableSchema[] = [];
  private readonly trigger: SqlSqlToken<any>[] = [];
  private readonly procedures: SqlSqlToken<any>[] = [];
  private readonly migrations: Migration[] = [];

  public initTableSchema(database: DatabaseSchema, databaseName: string): void {
    this.databaseName = databaseName;
    this.dataBaseVersion = database.version;
    this.tables.push(...database.tables);
    this.trigger.push(...database.triggers);
    this.migrations.push(...database.migrations);
    this.procedures.push(...database.procedures);
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
      // FIXME: if transaction/migrate failed, then this will fail with a more confusing error, masking the original one
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

    let proceduresCreated = 0;

    await Promise.all(
      this.procedures.map(async (procedure) => {
        const result = await context.con.query(procedure);
        proceduresCreated += result.rowCount;
      }),
    );

    const tables = await context.getTablesPg();

    let tablesCreated = 0;
    // create tables which do not exist
    await Promise.all(
      this.tables
        .filter((tableSchema) => !tables.find((table) => table.tablename === tableSchema.name))
        .map(async (tableSchema) => {
          const schema = tableSchema.schema;

          // create schema if it does not exist
          await context.con.query(schema);

          // sloppy fix to add a single row to the table, to get "startMigration" to work on empty table
          if (tableSchema.name === "enterprise_database_info") {
            await context.con.query(sql`INSERT INTO enterprise_database_info (version) VALUES (0)`);
          }
          tablesCreated++;
        }),
    );

    const indices = await context.getIndices();
    let indicesCreated = 0;

    // create indices which do not yet exist on all tables
    await Promise.all(
      this.tables.map(async (table) => {
        if (!table.indices.length) {
          return;
        }

        for (const indexColumns of table.indices) {
          const indexMatch = indices.find((dbIndex) => {
            if (dbIndex.tableName !== table.name || dbIndex.columnNames.length !== indexColumns.length) {
              return false;
            }

            return dbIndex.columnNames.every((column) => indexColumns.includes(column));
          });

          // create every index which does not exist with this column set combination on that table
          if (!indexMatch) {
            await context.con.query(
              sql`CREATE INDEX ON ${sql.identifier([table.name])} (${joinIdentifier(indexColumns)});`,
            );
            indicesCreated++;
          }
        }
      }),
    );

    const dbTriggers = [...(await context.getTriggersPg())];

    let triggerCreated = 0;
    let triggerDeleted = 0;
    // create triggers which do not exist, and drops triggers which are not in schema
    await Promise.all(
      this.trigger.map((trigger) => context.con.query(trigger).then((result) => (triggerCreated += result.rowCount))),
    );

    // every trigger that is left over, is not in schema and ready to be dropped
    await Promise.all(
      dbTriggers
        .filter((value) => this.tables.find((table) => table.name === value.table))
        .map((value) => context.dropTrigger(value.trigger).then(() => triggerDeleted++)),
    );
    logger.info("db check missing", {
      created_trigger: triggerCreated,
      deleted_trigger: triggerDeleted,
      tables_created: tablesCreated,
      indices_created: indicesCreated,
      procedures_created: proceduresCreated,
    });
  }

  private async migrate(context: DatabaseContext) {
    const versionResult = await context.getDatabaseVersion();
    let previousVersion = 0;

    if (versionResult > 0) {
      previousVersion = versionResult;
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
