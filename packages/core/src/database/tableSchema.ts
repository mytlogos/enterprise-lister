import { ColumnSchema } from "./columnSchema";
import { SchemaError } from "../error";
import { SqlSqlToken } from "slonik";

export class TableSchema {
  public readonly columns: ColumnSchema[];
  public readonly foreignKeys: ColumnSchema[];
  public readonly primaryKeys: ColumnSchema[];
  public readonly name: string;
  public readonly uniqueIndices: ColumnSchema[][];
  public readonly indices: string[][];
  public readonly schema: Readonly<SqlSqlToken<any>>;

  public constructor(
    columns: ColumnSchema[],
    name: string,
    tableSchema: SqlSqlToken<any>,
    uniqueIndices: ColumnSchema[][] = [],
    indices: string[][] = [],
  ) {
    this.columns = columns;
    this.primaryKeys = this.columns.filter((value) => value.primaryKey);
    this.foreignKeys = this.columns.filter((value) => value.foreignKey);
    this.uniqueIndices = uniqueIndices;
    this.name = name;
    this.indices = indices;
    this.schema = tableSchema;
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

  public getGeneratedSchema(): string {
    const tableSchema = this.getTableSchema();
    return `CREATE TABLE ${this.name} (${tableSchema.columns.join(", ")});`;
  }
}
