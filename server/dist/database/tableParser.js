"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const logger_1 = tslib_1.__importDefault(require("../logger"));
const columnSchema_1 = require("./columnSchema");
const databaseTypes_1 = require("./databaseTypes");
class TableParser {
    static parseForeignKey(table, tables, scheme) {
        const exec = /FOREIGN\sKEY\s*\((\w+)\)\s*REFERENCES\s+(\w+)\s*\((\w+)\)/i.exec(scheme);
        if (!exec) {
            logger_1.default.warn(`could not parse foreign key: '${scheme}'`);
            return;
        }
        const [, foreignKey, referencedTable, referencedColumn] = exec;
        const refTable = tables.find((value) => value.name === referencedTable);
        if (!refTable) {
            logger_1.default.warn(`referenced table '${referencedTable}' not found`);
            return;
        }
        const refColumn = refTable.primaryKeys.find((value) => value.name === referencedColumn);
        if (!refColumn) {
            logger_1.default.warn(`referenced column '${referencedColumn}' not found`);
            return;
        }
        for (let i = 0; i < table.columns.length; i++) {
            const column = table.columns[i];
            if (column.name === foreignKey) {
                const newColumn = new columnSchema_1.ColumnSchema(column.name, column.type, column.modifiers, column.typeSize, column.primaryKey, refColumn, column.default, column.primaryKeyTypeSize);
                table.foreignKeys.push(newColumn);
                table.columns[i] = newColumn;
                newColumn.table = column.table;
                if (newColumn.primaryKey) {
                    const index = table.primaryKeys.findIndex((value) => value.name === foreignKey);
                    table.primaryKeys[index] = newColumn;
                }
                return;
            }
        }
        logger_1.default.warn(`foreign key is unmatched by columns: '${scheme}'`);
    }
    static parsePrimaryKey(table, tables, schema) {
        const exec = /PRIMARY\sKEY\s*\((.+)\)/i.exec(schema);
        if (!exec) {
            logger_1.default.warn(`could not parse primary key: '${schema}'`);
            return;
        }
        for (const columnName of exec[1].split(/[,\s]+/)) {
            const foundColumnIndex = table.columns.findIndex((value) => {
                if (value.type === databaseTypes_1.ColumnType.TEXT) {
                    return new RegExp(value.name + "\\s*\\((\\d+)\\)").test(columnName);
                }
                else {
                    return value.name === columnName;
                }
            });
            if (foundColumnIndex < 0) {
                logger_1.default.warn(`could not find matching column for primary key: '${columnName}'`);
                continue;
            }
            const foundColumn = table.columns[foundColumnIndex];
            let keySize;
            if (foundColumn.type === databaseTypes_1.ColumnType.TEXT) {
                const keySizeExec = /\w+\s*\((\d+)\)/.exec(columnName);
                if (!keySizeExec) {
                    logger_1.default.warn("primary key of type text has no specified key length");
                    return;
                }
                keySize = Number(keySizeExec[1]);
            }
            const column = new columnSchema_1.ColumnSchema(foundColumn.name, foundColumn.type, foundColumn.modifiers, foundColumn.typeSize, true, foundColumn.foreignKey, foundColumn.default, keySize);
            column.table = foundColumn.table;
            if (column.foreignKey) {
                const index = table.foreignKeys.findIndex((value) => value.name === columnName);
                table.foreignKeys[index] = column;
            }
            table.columns[foundColumnIndex] = column;
            table.primaryKeys.push(column);
        }
    }
    static parseDataColumn(table, tables, value) {
        const parts = value.split(/\s+/).filter((s) => s);
        const name = parts[0];
        const partsType = parts[1];
        let type;
        let typeSize;
        switch (partsType) {
            case databaseTypes_1.ColumnType.INT:
                type = databaseTypes_1.ColumnType.INT;
                break;
            case databaseTypes_1.ColumnType.DATETIME:
                type = databaseTypes_1.ColumnType.DATETIME;
                break;
            case databaseTypes_1.ColumnType.BOOLEAN:
                type = databaseTypes_1.ColumnType.BOOLEAN;
                break;
            case databaseTypes_1.ColumnType.FLOAT:
                type = databaseTypes_1.ColumnType.FLOAT;
                break;
            case databaseTypes_1.ColumnType.TEXT:
                type = databaseTypes_1.ColumnType.TEXT;
                break;
            default:
                const exec = /VARCHAR\((\d+)\)/i.exec(partsType);
                if (exec) {
                    type = databaseTypes_1.ColumnType.VARCHAR;
                    typeSize = Number(exec[1]);
                }
                else {
                    logger_1.default.warn(`could not parse column type for: '${value}'`);
                    return null;
                }
        }
        const modifiers = [];
        let defaultValue;
        for (let i = 2; i < parts.length; i++) {
            const modifierPart = parts[i];
            let modifier;
            switch (modifierPart.toUpperCase()) {
                case databaseTypes_1.Modifier.AUTO_INCREMENT:
                    modifier = databaseTypes_1.Modifier.AUTO_INCREMENT;
                    break;
                case databaseTypes_1.Modifier.NOT:
                    i++;
                    if (parts[i] === databaseTypes_1.Modifier.NULL) {
                        modifier = databaseTypes_1.Modifier.NOT_NULL;
                    }
                    else {
                        logger_1.default.warn(`unknown not modifier, expected 'NULL' but got '${parts[i]}'`);
                        return null;
                    }
                    break;
                case databaseTypes_1.Modifier.UNIQUE:
                    modifier = databaseTypes_1.Modifier.UNIQUE;
                    break;
                case databaseTypes_1.Modifier.UNSIGNED:
                    modifier = databaseTypes_1.Modifier.UNSIGNED;
                    break;
                case "DEFAULT":
                    i++;
                    defaultValue = parts[i];
                    if (!defaultValue) {
                        logger_1.default.warn(`no default value specified for '${name}' of ${table.name}`);
                        return null;
                    }
                    break;
                default:
                    logger_1.default.warn(`could not parse modifier for: '${modifierPart}'`);
                    break;
            }
            if (modifier) {
                modifiers.push(modifier);
            }
        }
        const column = new columnSchema_1.ColumnSchema(name, type, modifiers, typeSize, false, undefined, defaultValue);
        column.table = table;
        return column;
    }
}
exports.TableParser = TableParser;
//# sourceMappingURL=tableParser.js.map