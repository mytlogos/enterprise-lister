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
    static parseUnique(table, tables, data) {
        const exec = /unique\s*\((.+)\)/i.exec(data);
        if (!exec) {
            logger_1.default.warn(`could not parse unique constraint: '${data}'`);
            return;
        }
        const uniqueIndex = [];
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
                logger_1.default.warn(`could not find matching column for unique: '${columnName}'`);
                continue;
            }
            const foundColumn = table.columns[foundColumnIndex];
            let keySize;
            if (foundColumn.type === databaseTypes_1.ColumnType.TEXT) {
                const keySizeExec = /\w+\s*\((\d+)\)/.exec(columnName);
                if (!keySizeExec) {
                    logger_1.default.warn("unique column of type text has no specified key length");
                    return;
                }
                keySize = Number(keySizeExec[1]);
            }
            const column = new columnSchema_1.ColumnSchema(foundColumn.name, foundColumn.type, foundColumn.modifiers, foundColumn.typeSize, false, foundColumn.foreignKey, foundColumn.default, keySize);
            uniqueIndex.push(column);
            column.table = foundColumn.table;
            if (column.foreignKey) {
                const index = table.foreignKeys.findIndex((value) => value.name === columnName);
                table.foreignKeys[index] = column;
            }
            table.columns[foundColumnIndex] = column;
            const otherUniqueIndex = table.uniqueIndices.find((value) => value.includes(foundColumn));
            if (otherUniqueIndex) {
                const index = otherUniqueIndex.indexOf(foundColumn);
                otherUniqueIndex[index] = column;
            }
        }
        if (!uniqueIndex.length) {
            throw Error(`unique index without any columns: '${data}'`);
        }
        table.uniqueIndices.push(uniqueIndex);
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
            case databaseTypes_1.ColumnType.TIMESTAMP:
                type = databaseTypes_1.ColumnType.TIMESTAMP;
                break;
            case databaseTypes_1.ColumnType.BOOLEAN:
                type = databaseTypes_1.ColumnType.BOOLEAN;
                break;
            case databaseTypes_1.ColumnType.FLOAT:
                type = databaseTypes_1.ColumnType.FLOAT;
                break;
            case databaseTypes_1.ColumnType.DOUBLE:
                type = databaseTypes_1.ColumnType.DOUBLE;
                break;
            case databaseTypes_1.ColumnType.TEXT:
                type = databaseTypes_1.ColumnType.TEXT;
                break;
            default:
                let exec = /VARCHAR\((\d+)\)/i.exec(partsType);
                if (exec) {
                    type = databaseTypes_1.ColumnType.VARCHAR;
                    typeSize = Number(exec[1]);
                }
                else {
                    exec = /CHAR\((\d+)\)/i.exec(partsType);
                    if (exec) {
                        type = databaseTypes_1.ColumnType.CHAR;
                        typeSize = Number(exec[1]);
                    }
                    else {
                        logger_1.default.warn(`could not parse column type for: '${value}'`);
                        return null;
                    }
                }
        }
        const modifiers = [];
        let defaultValue;
        let updateValue;
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
                    const defaultValueObj = this._getExpressionValue(parts, i);
                    if (!defaultValueObj || !defaultValueObj.value) {
                        logger_1.default.warn(`no default value specified for '${name}' of ${table.name}`);
                        return null;
                    }
                    defaultValue = defaultValueObj.value;
                    i = defaultValueObj.index;
                    break;
                case "ON":
                    i++;
                    if (parts[i].toLowerCase() !== "update") {
                        // for now skip all column 'triggers'? which are not triggered on update
                        break;
                    }
                    i++;
                    const updateValueObj = this._getExpressionValue(parts, i);
                    if (!updateValueObj || !updateValueObj.value) {
                        logger_1.default.warn(`no update value specified for '${name}' of ${table.name}`);
                        return null;
                    }
                    updateValue = updateValueObj.value;
                    i = updateValueObj.index;
                    break;
                default:
                    logger_1.default.warn(`could not parse modifier for: '${modifierPart}'`);
                    break;
            }
            if (modifier) {
                modifiers.push(modifier);
            }
        }
        const column = new columnSchema_1.ColumnSchema(name, type, modifiers, typeSize, false, undefined, defaultValue, undefined, updateValue);
        column.table = table;
        return column;
    }
    static _getExpressionValue(columnParts, index) {
        let defaultValue = columnParts[index];
        if (!defaultValue) {
            throw Error(`missing defaultValue in: '${columnParts.join(" ")}'`);
        }
        if (defaultValue.startsWith("(")) {
            index++;
            let foundClosingParenthesis = false;
            for (; index < columnParts.length; index++) {
                const currentValue = columnParts[index];
                defaultValue += " " + currentValue;
                if (currentValue.startsWith("(")) {
                    defaultValue += TableParser._getExpressionValue(columnParts, index);
                }
                else if (currentValue.endsWith(")")) {
                    foundClosingParenthesis = true;
                    break;
                }
            }
            if (!foundClosingParenthesis) {
                throw Error(`invalid default value: no closing parenthesis in '${columnParts.join(" ")}'`);
            }
        }
        return { index, value: defaultValue };
    }
}
exports.TableParser = TableParser;
//# sourceMappingURL=tableParser.js.map