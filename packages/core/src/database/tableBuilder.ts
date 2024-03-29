import { DataBaseBuilder } from "./databaseBuilder";
import { ColumnBuilder } from "./columnBuilder";
import { TableSchema } from "./tableSchema";
import { ColumnSchema } from "./columnSchema";
import { parseDataColumn, parseForeignKey, parsePrimaryKey, parseUnique } from "./tableParser";
import { InvalidationType } from "./databaseTypes";
import { SchemaError } from "../error";

export class TableBuilder {
  private readonly columns: ColumnSchema[] = [];
  private name?: string;
  private main?: boolean;
  private invalidationTable?: boolean;
  private readonly invalidationColumn?: string;
  private readonly databaseBuilder: DataBaseBuilder;
  private readonly stubTable = new TableSchema([], "");
  private readonly invalidations: Array<{ type: InvalidationType; table?: string }> = [];
  private readonly uniqueIndices: ColumnSchema[][] = [];

  public constructor(databaseBuilder: DataBaseBuilder) {
    this.databaseBuilder = databaseBuilder;
  }

  public setInvalidationTable(): this {
    this.invalidationTable = true;
    return this;
  }

  public parseColumn(column: string): this {
    const dataColumn = parseDataColumn(this.stubTable, this.databaseBuilder.tables, column);
    if (!dataColumn) {
      throw new SchemaError("could not parse column");
    }
    this.stubTable.columns.push(dataColumn);
    return this;
  }

  public setMain(): this {
    this.main = true;
    return this;
  }

  public parseMeta(data: string): this {
    const uppedData = data.toUpperCase();
    if (uppedData.startsWith("PRIMARY KEY")) {
      parsePrimaryKey(this.stubTable, this.databaseBuilder.tables, data);
    } else if (uppedData.startsWith("FOREIGN KEY")) {
      parseForeignKey(this.stubTable, this.databaseBuilder.tables, data);
    } else if (uppedData.startsWith("UNIQUE")) {
      parseUnique(this.stubTable, this.databaseBuilder.tables, data);
    } else {
      throw new SchemaError(`unknown meta: ${data}`);
    }
    return this;
  }

  public getColumnBuilder(): ColumnBuilder {
    return new ColumnBuilder(this);
  }

  public addColumn(column: ColumnSchema): this {
    this.columns.push(column);
    return this;
  }

  public addUniqueIndex(index: ColumnSchema[]): this {
    this.uniqueIndices.push(index);
    return this;
  }

  public setName(name: string): this {
    this.name = name;
    return this;
  }

  public addInvalidation(type: InvalidationType, tableName?: string): this {
    this.invalidations.push({ type, table: tableName });
    return this;
  }

  public build(): TableSchema {
    if (!this.name) {
      throw new SchemaError("table has no name");
    }
    const table = new TableSchema(
      [...this.columns, ...this.stubTable.columns],
      this.name,
      this.main,
      this.invalidationColumn,
      this.invalidationTable,
      this.uniqueIndices,
    );
    table.columns.forEach((value) => (value.table = table));
    this.databaseBuilder.addTable(table, this.invalidations);
    return table;
  }
}
