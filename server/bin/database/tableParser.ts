import {TableSchema} from "./tableSchema";
import logger from "../logger";
import {ColumnSchema} from "./columnSchema";
import {ColumnType, Modifier} from "./databaseTypes";

export class TableParser {

    public static parseForeignKey(table: TableSchema, tables: TableSchema[], scheme: string) {
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

    public static parsePrimaryKey(table: TableSchema, tables: TableSchema[], schema: string) {
        const exec = /PRIMARY\sKEY\s*\((.+)\)/i.exec(schema);

        if (!exec) {
            logger.warn(`could not parse primary key: '${schema}'`);
            return;
        }
        for (const columnName of exec[1].split(/[,\s]+/)) {
            const foundColumnIndex = table.columns.findIndex((value) => {
                if (value.type === ColumnType.TEXT) {
                    return new RegExp(value.name + "\\s*\\((\\d+)\\)").test(columnName);
                } else {
                    return value.name === columnName;
                }
            });

            if (foundColumnIndex < 0) {
                logger.warn(`could not find matching column for primary key: '${columnName}'`);
                continue;
            }
            const foundColumn: ColumnSchema = table.columns[foundColumnIndex];
            let keySize: number | undefined;

            if (foundColumn.type === ColumnType.TEXT) {
                const keySizeExec = /\w+\s*\((\d+)\)/.exec(columnName);

                if (!keySizeExec) {
                    logger.warn("primary key of type text has no specified key length");
                    return;
                }
                keySize = Number(keySizeExec[1]);
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

    public static parseDataColumn(table: TableSchema, tables: TableSchema[], value: string): ColumnSchema | null {
        const parts = value.split(/\s+/).filter((s) => s);
        const name = parts[0];
        const partsType = parts[1];
        let type: ColumnType;
        let typeSize: number | undefined;

        switch (partsType) {
            case ColumnType.INT:
                type = ColumnType.INT;
                break;
            case ColumnType.DATETIME:
                type = ColumnType.DATETIME;
                break;
            case ColumnType.BOOLEAN:
                type = ColumnType.BOOLEAN;
                break;
            case ColumnType.FLOAT:
                type = ColumnType.FLOAT;
                break;
            case ColumnType.TEXT:
                type = ColumnType.TEXT;
                break;
            default:
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
        const modifiers: Modifier[] = [];
        let defaultValue: string | undefined;

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
                case "DEFAULT":
                    i++;
                    defaultValue = parts[i];

                    if (!defaultValue) {
                        logger.warn(`no default value specified for '${name}' of ${table.name}`);
                        return null;
                    }
                    break;
                default:
                    logger.warn(`could not parse modifier for: '${modifierPart}'`);
                    break;
            }
            if (modifier) {
                modifiers.push(modifier);
            }
        }
        const column = new ColumnSchema(name, type, modifiers, typeSize, false, undefined, defaultValue);
        column.table = table;
        return column;
    }
}
