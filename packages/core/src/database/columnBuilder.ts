import { ColumnType, Modifier, SqlFunction } from "./databaseTypes";
import { TableBuilder } from "./tableBuilder";
import { ColumnSchema } from "./columnSchema";
import { SchemaError } from "../error";

export class ColumnBuilder {
  private readonly tableBuilder: TableBuilder;
  private name = "";
  private type?: ColumnType;
  private typeSize?: number;
  private default?: any | SqlFunction;
  private readonly modifier: Set<Modifier> = new Set<Modifier>();
  private primaryKey = false;
  private primaryKeyTypeSize?: number;
  private foreignKey?: ColumnSchema;

  public constructor(table: TableBuilder) {
    this.tableBuilder = table;
  }

  public setName(name: string): this {
    this.name = name;
    return this;
  }

  public setUnique(): this {
    this.modifier.add(Modifier.UNIQUE);
    return this;
  }

  public setUnsigned(): this {
    this.modifier.add(Modifier.UNSIGNED);
    return this;
  }

  public setNonNull(): this {
    this.modifier.add(Modifier.NOT_NULL);
    return this;
  }

  public setAutoIncrement(): this {
    this.modifier.add(Modifier.AUTO_INCREMENT);
    return this;
  }

  public setPrimaryKey(typeSize?: number): this {
    this.primaryKey = true;
    if (typeSize) {
      this.primaryKeyTypeSize = typeSize;
    }
    return this;
  }

  public setInt(): this {
    this.type = ColumnType.INT;
    return this;
  }

  public setFloat(): this {
    this.type = ColumnType.FLOAT;
    return this;
  }

  public setText(): this {
    this.type = ColumnType.TEXT;
    return this;
  }

  public setDateTime(): this {
    this.type = ColumnType.DATETIME;
    return this;
  }

  public setVarchar(size: number): this {
    this.type = ColumnType.VARCHAR;
    this.typeSize = size;
    return this;
  }

  public setDefault(value: any | SqlFunction): this {
    this.default = value;
    return this;
  }

  public setForeignKey(referencedColumn: ColumnSchema): this {
    this.foreignKey = referencedColumn;
    return this;
  }

  public build(): ColumnSchema {
    if (!this.type) {
      throw new SchemaError("no column type set");
    }
    if (!this.tableBuilder) {
      throw new SchemaError("got not table for column");
    }
    if (!this.name) {
      throw new SchemaError("column has no name");
    }
    if (!this.type) {
      throw new SchemaError("column has no type");
    }
    if (this.type === ColumnType.TEXT && this.primaryKey && !this.primaryKeyTypeSize) {
      throw new SchemaError("column is type 'TEXT' and primary key but has no key length");
    }
    const column = new ColumnSchema(
      this.name,
      this.type,
      [...this.modifier],
      this.typeSize,
      this.primaryKey,
      this.foreignKey,
      this.default,
      this.primaryKeyTypeSize,
    );
    this.tableBuilder.addColumn(column);
    return column;
  }

  public buildOneMoreColumn(): ColumnBuilder {
    this.build();
    return this.tableBuilder.getColumnBuilder();
  }

  public buildReturnTable(): TableBuilder {
    this.build();
    return this.tableBuilder;
  }
}
