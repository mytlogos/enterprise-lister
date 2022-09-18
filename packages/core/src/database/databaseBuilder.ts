import { TableBuilder } from "./tableBuilder";
import { DatabaseSchema, Migration } from "./databaseTypes";
import { TableSchema } from "./tableSchema";
import { Trigger } from "./trigger";
import { TriggerBuilder } from "./triggerBuilder";
import { SchemaError } from "../error";

export class DataBaseBuilder {
  public readonly tables: TableSchema[] = [];
  private readonly triggers: Trigger[] = [];
  private readonly migrations: Migration[] = [];
  private readonly version: number;

  public constructor(version: number) {
    this.version = version;
  }

  public build(): DatabaseSchema {
    if (this.version <= 0 || !Number.isInteger(this.version)) {
      throw new TypeError("invalid database version");
    }
    let mainTable;

    for (const table of this.tables) {
      if (table.main) {
        if (mainTable) {
          throw new SchemaError("only one main table allowed");
        }
        mainTable = table;
      }
    }

    if (!mainTable) {
      throw new SchemaError("no main table specified");
    }
    if (mainTable.primaryKeys.length !== 1) {
      throw new SchemaError("main table does not have exact one primary key");
    }
    const mainPrimaryKey = mainTable.primaryKeys[0];

    for (const table of this.tables) {
      if (table.foreignKeys.some((value) => value.foreignKey === mainPrimaryKey)) {
        table.mainDependent = true;
      }
    }
    let marked;
    // mark all tables which have foreign keys to mainDependant tables as mainDependant
    while (marked) {
      marked = false;

      for (const table of this.tables) {
        if (
          table.foreignKeys.some((column) => {
            const foreignKey = column.foreignKey;
            if (foreignKey) {
              if (!foreignKey.table) {
                const name = foreignKey.name;
                throw new SchemaError(`foreign key '${name}' of '${column.name}' in '${table.name}' has no table`);
              }
              if (foreignKey.table.mainDependent && !table.mainDependent) {
                marked = table.mainDependent = true;
              }
            }
            return false;
          })
        ) {
          table.mainDependent = true;
        }
      }
    }
    return {
      version: this.version,
      triggers: this.triggers,
      tables: [...this.tables],
      mainTable,
      migrations: this.migrations,
    };
  }

  public addMigrations(...migrations: Migration[]): void {
    this.migrations.push(...migrations);
  }

  public addTrigger(trigger: Trigger): void {
    this.triggers.push(trigger);
  }

  public addTable(table: TableSchema): this {
    this.tables.push(table);
    return this;
  }

  public getTableBuilder(): TableBuilder {
    return new TableBuilder(this);
  }

  public getTriggerBuilder(): TriggerBuilder {
    return new TriggerBuilder(this);
  }
}
