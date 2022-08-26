import { InvalidationType } from "./databaseTypes";
import { ColumnSchema } from "./columnSchema";
import { SchemaError } from "../error";

export class TableSchema {
  public readonly columns: ColumnSchema[];
  public readonly foreignKeys: ColumnSchema[];
  public readonly primaryKeys: ColumnSchema[];
  public readonly name: string;
  public readonly invalidations: Array<{ type: InvalidationType; table: TableSchema }> = [];
  public readonly main: boolean;
  public readonly invalidationColumn?: string;
  public readonly invalidationTable: boolean;
  public readonly uniqueIndices: ColumnSchema[][];
  public mainDependent?: boolean;

  public constructor(
    columns: ColumnSchema[],
    name: string,
    main = false,
    invalidationCol?: string,
    invalidTable = false,
    uniqueIndices: ColumnSchema[][] = [],
  ) {
    this.columns = columns;
    this.primaryKeys = this.columns.filter((value) => value.primaryKey);
    this.foreignKeys = this.columns.filter((value) => value.foreignKey);
    this.uniqueIndices = uniqueIndices;
    this.name = name;
    this.main = main;
    this.invalidationColumn = invalidationCol;
    this.invalidationTable = invalidTable;
  }

  public getTableSchema(): { name: string; columns: string[] } {
    const schemata: string[] = [];
    if (this.columns.length) {
      schemata.push(...this.columns.map((value) => value.getSchema()));

      if (this.foreignKeys.length) {
        schemata.push(
          ...this.foreignKeys.map((value) => {
            const foreignKey = value.foreignKey;
            if (!foreignKey) {
              throw new SchemaError("invalid foreign key: is undefined");
            }
            if (!foreignKey.table?.name) {
              throw new SchemaError("invalid foreign key: empty table");
            }
            return `FOREIGN KEY (${value.name}) REFERENCES ${foreignKey.table.name}(${foreignKey.name})`;
          }),
        );
      }

      if (this.primaryKeys.length) {
        schemata.push(
          "PRIMARY KEY(" +
            this.primaryKeys
              .map((value) => {
                if (value.primaryKeyTypeSize != null) {
                  return value.name + "(" + value.primaryKeyTypeSize + ")";
                } else {
                  return value.name;
                }
              })
              .join(", ") +
            ")",
        );
      }

      if (this.uniqueIndices.length) {
        schemata.push(
          ...this.uniqueIndices.map((uniqueIndex) => {
            return (
              "UNIQUE(" +
              uniqueIndex
                .map((value) => {
                  if (value.primaryKeyTypeSize != null) {
                    return value.name + "(" + value.primaryKeyTypeSize + ")";
                  } else {
                    return value.name;
                  }
                })
                .join(", ") +
              ")"
            );
          }),
        );
      }
    }
    return { name: this.name, columns: schemata };
  }

  public getSchema(): string {
    const tableSchema = this.getTableSchema();
    return `CREATE TABLE ${this.name} (${tableSchema.columns.join(", ")});`;
  }
}
