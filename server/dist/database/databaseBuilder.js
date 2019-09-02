"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tableBuilder_1 = require("./tableBuilder");
const triggerBuilder_1 = require("./triggerBuilder");
class DataBaseBuilder {
    constructor(name, version) {
        this.tables = [];
        this.triggers = [];
        this.invalidations = [];
        this.migrations = [];
        this.name = name;
        this.version = version;
    }
    build() {
        if (!this.name) {
            throw Error("database has no name");
        }
        if (this.version <= 0 || !Number.isInteger(this.version)) {
            throw Error("invalid database version");
        }
        this.invalidations.forEach((value) => {
            let table;
            if (value.tableName) {
                const foundTable = this.tables.find((t) => t.name === value.tableName);
                if (!foundTable) {
                    throw Error(`table '${value.tableName}' not found`);
                }
                table = foundTable;
            }
            else {
                table = value.table;
            }
            value.table.invalidations.push({ table, type: value.type });
        });
        let mainTable;
        let invalidationTable;
        for (const table of this.tables) {
            if (table.main) {
                if (mainTable) {
                    throw Error("only one main table allowed");
                }
                mainTable = table;
            }
            else if (table.invalidationTable) {
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
            version: this.version,
            name: this.name,
            triggers: this.triggers,
            tables: [...this.tables],
            invalidationTable,
            mainTable,
            migrations: this.migrations
        };
    }
    addMigrations(...migrations) {
        this.migrations.push(...migrations);
    }
    addTrigger(trigger) {
        this.triggers.push(trigger);
    }
    addTable(table, invalidations) {
        this.tables.push(table);
        for (const value of invalidations) {
            this.invalidations.push({ tableName: value.table, table, type: value.type });
        }
        return this;
    }
    getTableBuilder() {
        return new tableBuilder_1.TableBuilder(this);
    }
    getTriggerBuilder() {
        return new triggerBuilder_1.TriggerBuilder(this);
    }
}
exports.DataBaseBuilder = DataBaseBuilder;
//# sourceMappingURL=databaseBuilder.js.map