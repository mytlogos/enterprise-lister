import {TableBuilder} from "./tableBuilder";
import {DatabaseSchema, InvalidationType} from "./databaseTypes";
import {TableSchema} from "./tableSchema";

export class DataBaseBuilder {
    public readonly tables: TableSchema[] = [];
    private readonly invalidations: Array<{ table: TableSchema, type: InvalidationType, tableName?: string; }> = [];
    private name?: string;

    public build(): DatabaseSchema {
        if (!this.name) {
            throw Error();
        }
        this.invalidations.forEach((value) => {
            let table: TableSchema;
            if (value.tableName) {
                const foundTable = this.tables.find((t) => t.name === value.tableName);

                if (!foundTable) {
                    throw Error(`table '${value.tableName}' not found`);
                }
                table = foundTable;
            } else {
                table = value.table;
            }
            value.table.invalidations.push({table, type: value.type});
        });
        let mainTable;
        let invalidationTable;

        for (const table of this.tables) {
            if (table.main) {
                if (mainTable) {
                    throw Error("only one main table allowed");
                }
                mainTable = table;
            } else if (table.invalidationTable) {
                if (invalidationTable) {
                    throw Error("only one invalidation table allowed");
                }
                invalidationTable = table;
            }
        }

        if (!mainTable) {
            throw Error("no main table specified");
        }
        if (mainTable.primaryKeys.length !== 1) {
            throw Error("main table does not have exact one primary key");
        }
        if (!invalidationTable) {
            throw Error("no invalidation table specified");
        }
        if (invalidationTable === mainTable) {
            throw Error("invalidation table and main table cannot be the same");
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
                if (table.foreignKeys.some((column) => {
                    const foreignKey = column.foreignKey;
                    if (foreignKey) {
                        if (!foreignKey.table) {
                            const name = foreignKey.name;
                            throw Error(`foreign key '${name}' of '${column.name}' in '${table.name}' has no table`);
                        }
                        if (foreignKey.table.mainDependent && !table.mainDependent) {
                            marked = table.mainDependent = true;
                        }
                    }
                    return false;
                })) {
                    table.mainDependent = true;
                }
            }
        }
        return {
            name: this.name,
            tables: [...this.tables],
            invalidationTable,
            mainTable,
        };
    }

    public addTable(table: TableSchema, invalidations: Array<{ type: InvalidationType; table?: string; }>): this {
        this.tables.push(table);
        for (const value of invalidations) {
            this.invalidations.push({tableName: value.table, table, type: value.type});
        }
        return this;
    }


    public getTableBuilder(): TableBuilder {
        return new TableBuilder(this);
    }


    public setName(name: string): this {
        this.name = name;
        return this;
    }
}

