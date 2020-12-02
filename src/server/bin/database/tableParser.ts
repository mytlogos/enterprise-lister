import { TableSchema } from "./tableSchema";
import logger from "../logger";
import { ColumnSchema } from "./columnSchema";
import { ColumnType, Modifier } from "./databaseTypes";
import { Optional, Nullable } from "../types";

export class TableParser {

    public static parseForeignKey(table: TableSchema, tables: TableSchema[], scheme: string): void {
        const exec = /FOREIGN\sKEY\s*\((\w+)\)\s*REFERENCES\s+(\w+)\s*\((\w+)\)/i.exec(scheme);

        if (!exec) {
            logger.warn(`could not parse foreign key: '${scheme}'`);
            return;
        }
        const [, foreignKey, referencedTable, referencedColumn] = exec;
        const refTable = tables.find((value) => value.name === referencedTable);

        if (!refTable) {
            logger.warn(`referenced table '${referencedTable}' not found`);
            return;
        }
        const refColumn = refTable.primaryKeys.find((value) => value.name === referencedColumn);

        if (!refColumn) {
            logger.warn(`referenced column '${referencedColumn}' not found`);
            return;
        }

        for (let i = 0; i < table.columns.length; i++) {
            const column = table.columns[i];

            if (column.name === foreignKey) {
                const newColumn = new ColumnSchema(
                    column.name, column.type, column.modifiers,
                    column.typeSize, column.primaryKey, refColumn, column.default,
                    column.primaryKeyTypeSize
                );
                table.foreignKeys.push(newColumn);
                table.columns[i] = newColumn;
                newColumn.table = column.table;

                if (newColumn.primaryKey) {
                    const index = table.primaryKeys.findIndex((value: ColumnSchema) => value.name === foreignKey);
                    table.primaryKeys[index] = newColumn;
                }
                return;
            }
        }
        logger.warn(`foreign key is unmatched by columns: '${scheme}'`);
    }

    public static parsePrimaryKey(table: TableSchema, tables: TableSchema[], schema: string): void {
        const exec = /PRIMARY\sKEY\s*\((.+)\)/i.exec(schema);

        if (!exec) {
            logger.warn(`could not parse primary key: '${schema}'`);
            return;
        }
        for (const columnName of exec[1].split(/[,\s]+/)) {
            const foundColumnIndex = table.columns.findIndex((value) => {
                return value.name === columnName || new RegExp(value.name + "\\s*\\((\\d+)\\)").test(columnName);
            });

            if (foundColumnIndex < 0) {
                logger.warn(`could not find matching column for primary key: '${columnName}'`);
                continue;
            }
            const foundColumn: ColumnSchema = table.columns[foundColumnIndex];
            let keySize: Optional<number>;

            const keySizeExec = /\w+\s*\((\d+)\)/.exec(columnName);

            if (keySizeExec) {
                keySize = Number(keySizeExec[1]);
            } else if (foundColumn.type === ColumnType.TEXT) {
                logger.warn("primary key of type text has no specified key length");
                return;
            }
            const column = new ColumnSchema(
                foundColumn.name, foundColumn.type, foundColumn.modifiers,
                foundColumn.typeSize, true, foundColumn.foreignKey, foundColumn.default,
                keySize
            );
            column.table = foundColumn.table;
            if (column.foreignKey) {
                const index = table.foreignKeys.findIndex((value: ColumnSchema) => value.name === columnName);
                table.foreignKeys[index] = column;
            }
            table.columns[foundColumnIndex] = column;
            table.primaryKeys.push(column);
        }
    }

    public static parseUnique(table: TableSchema, tables: TableSchema[], data: string): void {
        const exec = /unique\s*\((.+)\)/i.exec(data);

        if (!exec) {
            logger.warn(`could not parse unique constraint: '${data}'`);
            return;
        }
        const uniqueIndex: ColumnSchema[] = [];
        for (const columnName of exec[1].split(/[,\s]+/)) {
            const foundColumnIndex = table.columns.findIndex((value) => {
                return value.name === columnName || new RegExp(value.name + "\\s*\\((\\d+)\\)").test(columnName);
            });

            if (foundColumnIndex < 0) {
                logger.warn(`could not find matching column for unique: '${columnName}'`);
                continue;
            }
            const foundColumn: ColumnSchema = table.columns[foundColumnIndex];
            let keySize: Optional<number>;

            const keySizeExec = /\w+\s*\((\d+)\)/.exec(columnName);

            if (keySizeExec) {
                keySize = Number(keySizeExec[1]);
            } else if (foundColumn.type === ColumnType.TEXT) {
                logger.warn("unique column of type text has no specified key length");
                return;
            }
            const column = new ColumnSchema(
                foundColumn.name, foundColumn.type, foundColumn.modifiers,
                foundColumn.typeSize, false, foundColumn.foreignKey, foundColumn.default,
                keySize
            );
            uniqueIndex.push(column);

            column.table = foundColumn.table;
            if (column.foreignKey) {
                const index = table.foreignKeys.findIndex((value: ColumnSchema) => value.name === columnName);
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

    public static parseDataColumn(table: TableSchema, tables: TableSchema[], value: string): Nullable<ColumnSchema> {
        const parts = value.split(/\s+/).filter((s) => s);
        const name = parts[0];
        const partsType = parts[1];
        let type: ColumnType;
        let typeSize: Optional<number>;

        switch (partsType) {
        case ColumnType.INT:
            type = ColumnType.INT;
            break;
        case ColumnType.DATETIME:
            type = ColumnType.DATETIME;
            break;
        case ColumnType.TIMESTAMP:
            type = ColumnType.TIMESTAMP;
            break;
        case ColumnType.BOOLEAN:
            type = ColumnType.BOOLEAN;
            break;
        case ColumnType.FLOAT:
            type = ColumnType.FLOAT;
            break;
        case ColumnType.DOUBLE:
            type = ColumnType.DOUBLE;
            break;
        case ColumnType.TEXT:
            type = ColumnType.TEXT;
            break;
        default: {
            let exec = /VARCHAR\((\d+)\)/i.exec(partsType);
            if (exec) {
                type = ColumnType.VARCHAR;
                typeSize = Number(exec[1]);
            } else {
                exec = /CHAR\((\d+)\)/i.exec(partsType);

                if (exec) {
                    type = ColumnType.CHAR;
                    typeSize = Number(exec[1]);
                } else {
                    logger.warn(`could not parse column type for: '${value}'`);
                    return null;
                }
            }
        }
        }
        const modifiers: Modifier[] = [];
        let defaultValue: Optional<string>;
        let updateValue: Optional<string>;

        for (let i = 2; i < parts.length; i++) {
            const modifierPart = parts[i];
            let modifier;

            switch (modifierPart.toUpperCase()) {
            case Modifier.AUTO_INCREMENT:
                modifier = Modifier.AUTO_INCREMENT;
                break;
            case Modifier.NOT:
                i++;
                if (parts[i] === Modifier.NULL) {
                    modifier = Modifier.NOT_NULL;
                } else {
                    logger.warn(`unknown not modifier, expected 'NULL' but got '${parts[i]}'`);
                    return null;
                }
                break;
            case Modifier.UNIQUE:
                modifier = Modifier.UNIQUE;
                break;
            case Modifier.UNSIGNED:
                modifier = Modifier.UNSIGNED;
                break;
            case "DEFAULT": {
                i++;
                const defaultValueObj = this._getExpressionValue(parts, i);

                if (!defaultValueObj || !defaultValueObj.value) {
                    logger.warn(`no default value specified for '${name}' of ${table.name}`);
                    return null;
                }
                defaultValue = defaultValueObj.value;
                i = defaultValueObj.index;
                break;
            }
            case "ON": {
                i++;
                if (parts[i].toLowerCase() !== "update") {
                    // for now skip all column 'triggers'? which are not triggered on update
                    break;
                }
                i++;
                const updateValueObj = this._getExpressionValue(parts, i);

                if (!updateValueObj || !updateValueObj.value) {
                    logger.warn(`no update value specified for '${name}' of ${table.name}`);
                    return null;
                }
                updateValue = updateValueObj.value;
                i = updateValueObj.index;
                break;
            }
            default:
                logger.warn(`could not parse modifier for: '${modifierPart}'`);
                break;
            }
            if (modifier) {
                modifiers.push(modifier);
            }
        }
        const column = new ColumnSchema(
            name, type, modifiers, typeSize,
            false, undefined, defaultValue, undefined, updateValue
        );
        column.table = table;
        return column;
    }

    private static _getExpressionValue(columnParts: string[], index: number): { index: number; value: string } {
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
                } else if (currentValue.endsWith(")")) {
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
