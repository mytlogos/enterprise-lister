import { ColumnType, DatabaseSchema, Migration } from "./databaseTypes";
import { TableSchema } from "./tableSchema";
import { TriggerBuilder } from "./triggerBuilder";
import { NotImplementedError, SchemaError } from "../error";
import { sql, SqlSqlToken } from "slonik";
import { parseFirst } from "pgsql-ast-parser";
import { ColumnSchema } from "./columnSchema";

function parseTableWithAst(statement: string) {
  const parsed = parseFirst(statement);

  if (parsed.type !== "create table") {
    throw new SchemaError("invalid statement: expected a 'create table' statement");
  }

  const columns: ColumnSchema[] = [];

  for (const column of parsed.columns) {
    if (column.kind === "like table") {
      throw new SchemaError("'create table ... like ...' is forbidden in this package");
    }
    // TODO: implement better transform or directly use ast type
    columns.push(new ColumnSchema(column.name.name, column.dataType as unknown as ColumnType, []));
  }
  return {
    name: parsed.name.name,
    columns,
  };
}

function parseTable(statement: string) {
  try {
    return parseTableWithAst(statement);
  } catch (error) {
    // ignore error
  }

  const match = [...statement.matchAll(/create\s+table\s*(if\s+not\s+exists)?\s+(\w+)\s+\(([^;]+)\);/gim)];

  if (!match[0]) {
    throw new SchemaError("could not parse 'create table' statement");
  }

  const name = match[0][2];
  const columns: ColumnSchema[] = [];
  const columnDefinitions = match[0][3].replaceAll(/\s+/g, " ");

  for (const definition of columnDefinitions.split(",").map((s) => s.trim().toLowerCase())) {
    if (
      definition.startsWith("primary key") ||
      definition.startsWith("unique") ||
      definition.startsWith("foreign key")
    ) {
      continue;
    }

    const columnDefinition = definition.split(" ");
    const name = columnDefinition[0].replaceAll('"', "");
    columns.push(new ColumnSchema(name, columnDefinition[1] as ColumnType, []));
  }
  return {
    name,
    columns,
  };
}

export class DataBaseBuilder {
  public readonly tables: TableSchema[] = [];
  private readonly triggers: Array<SqlSqlToken<any>> = [];
  private readonly migrations: Migration[] = [];
  private readonly procedures: Array<SqlSqlToken<any>> = [];
  private readonly version: number;
  private autoUpdatedAt = false;

  public constructor(version: number) {
    this.version = version;
  }

  public build(): DatabaseSchema {
    if (this.version <= 0 || !Number.isInteger(this.version)) {
      throw new TypeError("invalid database version");
    }

    return {
      version: this.version,
      triggers: this.triggers,
      tables: [...this.tables],
      migrations: this.migrations,
      procedures: this.procedures,
    };
  }

  public addMigrations(...migrations: Migration[]): void {
    this.migrations.push(...migrations);
  }

  /**
   * Automatically add a specific trigger on each table with a
   * "updated_at" column.
   * Requires a trigger procedure named "trigger_set_update_at".
   */
  public setAutoUpdatedAt(enabled = true) {
    this.autoUpdatedAt = enabled;
  }

  public addTable(tableSchema: SqlSqlToken<any>, config?: { indices?: string[][]; updated_at?: boolean }): this {
    const parsed = parseTable(tableSchema.sql);

    if (this.autoUpdatedAt && parsed.columns.find((column) => column.name === "updated_at")) {
      this.triggers.push(sql`CREATE OR REPLACE TRIGGER set_timestamp
      BEFORE UPDATE ON ${sql.identifier([parsed.name])}
      FOR EACH ROW
      EXECUTE PROCEDURE trigger_set_update_at();`);
    }
    const indices = [];

    if (config?.indices) {
      for (const indexIdentifiers of config.indices) {
        const indexColumns = [];

        for (const identifier of indexIdentifiers) {
          const hasColumn = parsed.columns.find((value) => value.name === identifier);

          if (!hasColumn) {
            throw new SchemaError(`index column identifier '${identifier}' not defined on table ${parsed.name}`);
          }
          indexColumns.push(identifier);
        }

        if (indexColumns.length) {
          indices.push(indexColumns);
        }
      }
    }
    this.tables.push(new TableSchema(parsed.columns, parsed.name, tableSchema, undefined, indices));
    return this;
  }

  public addProcedure(procedure: SqlSqlToken<any>): this {
    this.procedures.push(procedure);
    return this;
  }

  public addTrigger(triggerSchema: SqlSqlToken<any>): this {
    throw new NotImplementedError(
      "implement add trigger - currently 'pgsql-ast-parser' cannot parse create trigger statements",
    );
  }

  public getTriggerBuilder(): TriggerBuilder {
    return new TriggerBuilder(this);
  }
}
