import { DataBaseBuilder } from "./databaseBuilder";
import { ColumnBuilder } from "./columnBuilder";
import { TableSchema } from "./tableSchema";
import { ColumnSchema } from "./columnSchema";
import { TableParser } from "./tableParser";
import { InvalidationType } from "./databaseTypes";

export class TableBuilder {
    private columns: ColumnSchema[] = [];
    private name?: string;
    private main?: boolean;
    private invalidationTable?: boolean;
    private invalidationColumn?: string;
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
        const dataColumn = TableParser.parseDataColumn(this.stubTable, this.databaseBuilder.tables, column);
        if (!dataColumn) {
            throw Error("could not parse column");
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
            TableParser.parsePrimaryKey(this.stubTable, this.databaseBuilder.tables, data);

        } else if (uppedData.startsWith("FOREIGN KEY")) {
            TableParser.parseForeignKey(this.stubTable, this.databaseBuilder.tables, data);

        } else if (uppedData.startsWith("UNIQUE")) {
            TableParser.parseUnique(this.stubTable, this.databaseBuilder.tables, data);
        } else {
            throw Error(`unknown meta: ${data}`);
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
            throw Error("table has no name");
        }
        const table = new TableSchema(
            [...this.columns, ...this.stubTable.columns], this.name, this.main,
            this.invalidationColumn, this.invalidationTable, this.uniqueIndices
        );
        table.columns.forEach((value) => value.table = table);
        this.databaseBuilder.addTable(table, this.invalidations);
        return table;
    }
}
