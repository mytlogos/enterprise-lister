import logger from "../logger";
import {ColumnType, DatabaseSchema, InvalidationType, Modifier} from "./databaseTypes";
import {TableSchema} from "./tableSchema";
import {ColumnSchema} from "./columnSchema";
import {TableParser} from "./tableParser";
import {equalsIgnore, getElseSet, isString, unique} from "../tools";
import mySql from "promise-mysql";
import {MultiSingle} from "../types";
import {DatabaseContext} from "./contexts/databaseContext";
import * as validate from "validate.js";
import {Counter} from "../counter";

interface StateProcessor {
    addSql<T>(query: string, parameter: MultiSingle<any>, value: T, uuid?: string): T;

    startRound(): Promise<string[]>;

    checkTables(tables: any, track: string[], ignore: string[]): void;

    initTableSchema(database: DatabaseSchema): void;

    checkTableSchema(context: DatabaseContext): Promise<void>;

    validateQuery(query: string, parameter: any): Promise<void>;
}

interface Trigger {
    table: TableSchema;

    triggerType: InvalidationType;

    updateInvalidationMap(query: Query, invalidationMap: Map<string, Invalidation>): void;
}

interface StateProcessorImpl extends StateProcessor {
    databaseName: string;
    workingPromise: Promise<void>;
    readonly sqlHistory: RawQuery[];
    tables: TableSchema[];
    invalidationTable: TableSchema | null;
    mainTable: TableSchema | null;
    trigger: Trigger[];

    _process(): Promise<string[]>;

    startRound(): Promise<string[]>;

    checkTableSchema(context: DatabaseContext): Promise<void>;

    checkTables(tables: any, track: string[], ignore: string[]): void;

    initTableSchema(database: DatabaseSchema): void;

    addSql<T>(query: string, parameter: MultiSingle<any>, value: T, uuid?: string): T;

    validateQuery(query: string, parameter: any): Promise<void>;
}

interface Invalidation {
    table: string;
    foreignColumn: string;
    keyColumn: string;
    uuid?: string;
    values: any[];
}

interface RawQuery {
    rawQuery: string;

    parameter: MultiSingle<any>;

    changedRows: number;

    affectedRows: number;

    uuid?: string;
}

interface Query extends RawQuery {
    operation: InvalidationType;
    target: TableSchema;
    columnTarget: Array<ColumnTarget<ColumnSchema>>;
}

interface Parser {
    parse(value: RawQuery): Query | null;
}

const UpdateParser: Parser = {

    parse(rawQuery: RawQuery): Query | null {
        const query = rawQuery.rawQuery;
        const exec = /update\s+(\w+)\s+set.+\s+WHERE\s+(\w+)\s*=\s*\?/i.exec(query);

        if (!exec) {
            logger.warn(`could not parse update query: '${query}'`);
            return null;
        }
        const [, table, idConditionColumn] = exec;
        const tableMeta = StateProcessorImpl.tables.find((value) => value.name === table);

        if (!tableMeta) {
            logger.warn(`unknown table: '${table}'`);
            return null;
        }

        let idConditionColumnName = idConditionColumn.trim();
        // if column was escaped, remove the escape characters
        if (idConditionColumnName.startsWith("`") && idConditionColumnName.endsWith("`")) {
            idConditionColumnName = idConditionColumnName.substring(1, idConditionColumnName.length - 1).trim();
        }


        const column = tableMeta.primaryKeys.find((value) => value.name === idConditionColumnName);

        if (!column) {
            // TODO: 21.06.2019 somehow do this
            //  search for other possible keys, like foreign keys which are primary keys?
            logger.warn(`condition column is not a primary key: '${idConditionColumnName}'`);
            return null;
        }
        let idValue;

        if (Array.isArray(rawQuery.parameter)) {
            idValue = rawQuery.parameter[rawQuery.parameter.length - 1];
        } else {
            logger.warn(`suspicious update query: '${query}' with less than two parameter: '${rawQuery.parameter}'`);
            return null;
        }
        return {
            rawQuery: query,
            parameter: rawQuery.parameter,
            affectedRows: rawQuery.affectedRows,
            changedRows: rawQuery.changedRows,
            operation: InvalidationType.UPDATE,
            target: tableMeta,
            uuid: rawQuery.uuid,
            columnTarget: [{column, value: idValue}]
        };
    }
};
const InsertParser: Parser = {
    parse(rawQuery: RawQuery): Query | null {
        const query = rawQuery.rawQuery;
        const exec = /insert.+into\s+`?(\w+)`?\s*(\(.+\))?\s+VALUES\s*\((.+)\);?/i.exec(query);
        if (!exec) {
            // warn only if it is not a 'insert ... into .... select ...' query
            if (!/insert.+into\s+`?(\w+)`?\s*(\(.+\))?\s*select.+?/i.test(query)) {
                logger.warn(`could not parse insert query: '${query}'`);
            }
            return null;
        }
        const [, tableName, insertColumns, insertValues] = exec;
        const table = StateProcessorImpl.tables.find((value) => value.name === tableName);

        if (!table) {
            logger.warn(`unknown table: '${tableName}'`);
            return null;
        }
        let columns;
        if (!insertColumns) {
            columns = table.columns.map((value) => value.name);
        } else {
            columns = insertColumns
            // remove the parenthesis
                .substring(1, insertColumns.length - 1)
                .split(",")
                .map((value) => {
                    value = value.trim();
                    // if column was escaped, remove the escape characters
                    if (value.startsWith("`") && value.endsWith("`")) {
                        value = value.substring(1, value.length - 1).trim();
                    }
                    return value;
                });
        }
        const values: string[] = insertValues.split(",").map((value) => value.trim());

        const columnLength = columns.length;
        const valueLength = values.length;
        if (valueLength < columnLength) {
            logger.warn(`not enough values for the columns: expected ${columnLength}, got ${valueLength}`);
            return null;
        } else if (!(valueLength % columnLength)) {
            logger.warn(`mismatching number of values for columns: expected ${columnLength}, got ${valueLength}`);
            return null;
        }
        const columnTargets: Array<ColumnTarget<ColumnSchema>> = [];
        let singleParamUsed = false;

        for (let i = 0; i < columnLength; i++) {
            const columnName = columns[i];
            let value = values[i];

            if (value === "?") {
                const parameter = rawQuery.parameter;

                if (Array.isArray(parameter)) {
                    if (!parameter.length) {
                        logger.warn(`not enough values for insert query: '${query}', Parameter: ${parameter}`);
                        return null;
                    }
                    value = parameter.shift();
                } else {
                    if (singleParamUsed) {
                        logger.warn(`not enough values for insert query: '${query}', Parameter: ${parameter}`);
                        return null;
                    }
                    singleParamUsed = true;
                    value = parameter;
                }
            }
            const column = table.columns.find((tableColumn) => tableColumn.name === columnName);
            if (!column) {
                logger.warn(`could not find any columns for '${columnName}' in '${table.name}'`);
                return null;
            }
            columnTargets.push({column, value});
        }
        return {
            rawQuery: query,
            parameter: rawQuery.parameter,
            affectedRows: rawQuery.affectedRows,
            changedRows: rawQuery.changedRows,
            operation: InvalidationType.INSERT,
            target: table,
            uuid: rawQuery.uuid,
            columnTarget: columnTargets
        };
    }
};
const DeleteParser: Parser = {
    parse(rawQuery: RawQuery): Query | null {
        const query = rawQuery.rawQuery;
        const exec = /delete\s+from\s+(\w+)\s*(where\s+(.+))?;?/i.exec(query);

        if (!exec) {
            logger.warn(`could not parse delete query: '${query}'`);
            return null;
        }
        const [, tableName, , deleteCondition] = exec;
        const table = StateProcessorImpl.tables.find((value) => value.name === tableName);

        if (!table) {
            logger.warn(`unknown table: '${tableName}'`);
            return null;
        }
        const columnTargets: any[] = [];

        if (deleteCondition) {
            const conditionsParts = deleteCondition.split(/s+/);

            const column = /^`?\w+`?$/;
            const equals = /^=$/;
            const value = /^\?$/;
            const concatenation = /^AND$/i;
            const finish = /^;$/i;

            let previousState: RegExp | null = null;
            let currentColumn: ColumnSchema | null = null;

            for (const conditionPart of conditionsParts) {
                if (previousState == null || previousState === concatenation) {
                    previousState = column;

                    if (!column.test(conditionPart)) {
                        return null;
                    }
                    const columnName = conditionPart.substring(1, conditionPart.length - 1);
                    const matchedColumn = table.columns.find((tableColumn) => tableColumn.name === columnName);

                    if (!matchedColumn) {
                        logger.warn(`unknown column: '${columnName}'`);
                        return null;
                    }
                    currentColumn = matchedColumn;
                } else if (previousState === column) {
                    previousState = equals;

                    if (!equals.test(conditionPart)) {
                        return null;
                    }

                } else if (previousState === equals) {
                    previousState = value;

                    if (!value.test(conditionPart)) {
                        return null;
                    }
                    columnTargets.push({column: currentColumn, value: conditionPart});

                } else if (previousState === value) {
                    if (concatenation.test(conditionPart)) {
                        previousState = concatenation;
                    } else if (finish.test(conditionPart)) {
                        break;
                    } else {
                        return null;
                    }
                } else {
                    return null;
                }
            }
        }
        return {
            rawQuery: query,
            parameter: rawQuery.parameter,
            affectedRows: rawQuery.affectedRows,
            changedRows: rawQuery.changedRows,
            operation: InvalidationType.DELETE,
            target: table,
            uuid: rawQuery.uuid,
            columnTarget: columnTargets
        };
    }
};

// fixme all parser cannot parse escaped id´s and values

interface ColumnTarget<T> {
    value: any;
    column: T;
}

type ColumnConverter = (query: Query, triggeredColumn: ColumnTarget<ColumnSchema>) => ColumnTarget<string>;

function createTrigger(watchTable: TableSchema, targetTable: TableSchema, invalidationTable: TableSchema,
    mainPrimaryKey: string, columnConverter: ColumnConverter,
    triggerType: InvalidationType): Trigger {
    if (targetTable.primaryKeys.length !== 1) {
        throw Error("targeted table does not has exact one primary key");
    }

    if (invalidationTable === watchTable || invalidationTable === targetTable) {
        throw Error("invalidation table is not valid");
    }
    return {
        table: watchTable,
        triggerType,
        updateInvalidationMap(query: Query, invalidations: Map<string, Invalidation>): void {
            const triggeredColumn = query.columnTarget.find((value) => {
                if (value.column.foreignKey && targetTable.primaryKeys.includes(value.column.foreignKey)) {
                    return true;
                }
                return targetTable.primaryKeys.includes(value.column);
            });

            if (!triggeredColumn) {
                logger.warn("an trigger insert statement without the referenced key of target");
                return;
            }
            const invalidationColumn = columnConverter(query, triggeredColumn);
            const key = `${invalidationTable.name}$${mainPrimaryKey}$${invalidationColumn.column}`;
            const invalidation = getElseSet(invalidations, key, () => {
                return {
                    table: invalidationTable.name,
                    foreignColumn: invalidationColumn.column,
                    keyColumn: mainPrimaryKey,
                    values: [],
                };
            });

            if (watchTable.mainDependent) {
                if (!query.uuid) {
                    throw Error("missing uuid on dependant table");
                }
                invalidation.uuid = mySql.escape(query.uuid);
            }
            if (!invalidation.values.includes(invalidationColumn.value)) {
                invalidation.values.push(invalidationColumn.value);
            }
        }
    };
}

const queryTableReg = /((select .+? from)|(update )|(delete.+?from)|(insert.+?into )|(.+?join))\s*(\w+)/gi;
const queryColumnReg = /(((\w+\.)?(\w+))|\?)\s*(like|is|=|<|>|<>|<=|>=)\s*(((\w+\.)?(\w+))|\?)/gi;
const counter = new Counter<string>();
const StateProcessorImpl: StateProcessorImpl = {
    databaseName: "",
    workingPromise: Promise.resolve(),
    sqlHistory: [],
    tables: [],
    mainTable: null,
    invalidationTable: null,
    trigger: [],

    async validateQuery(query: string, parameter: any) {
        if (query.length > 20 && counter.count(query) === 100) {
            console.log(`Query: '${query}' executed 100 times`);
        }
        if (counter.count("query") % 100 === 0) {
            console.log(`Database queried ${counter.getCount("query")} times`);
        }
        let tableExec = queryTableReg.exec(query);

        if (!tableExec) {
            return;
        }
        const tables = [];
        while (tableExec) {
            if (tables.length > (this.tables.length * 5)) {
                throw Error("too many tables: regExp is faulty");
            }
            if (tableExec[7]) {
                tables.push(tableExec[7]);
            }
            tableExec = queryTableReg.exec(query);
        }
        let columnExec = queryColumnReg.exec(query);
        const columns = [];

        while (columnExec) {
            if (columnExec[1] === "?") {
                columns.push(columnExec[6]);
            }
            if (columnExec[6] === "?") {
                columns.push(columnExec[1]);
            }
            columnExec = queryColumnReg.exec(query);
        }
        const referencedTables = unique(tables.map((name) => {
            const foundTable = this.tables.find((value) => equalsIgnore(value.name, name));

            if (!foundTable) {
                throw Error(`Unknown Table: '${name}'`);
            }

            return foundTable;
        }).filter((value) => value));

        for (let i = 0; i < columns.length; i++) {
            const columnName = columns[i];

            const separator = columnName.indexOf(".");

            let columnSchema: ColumnSchema | undefined;
            if (separator >= 0) {
                const tableName = columnName.substring(0, separator);
                const foundTable = this.tables.find((value) => equalsIgnore(value.name, tableName));

                if (!foundTable) {
                    throw Error(`Unknown Table: '${tableName}'`);
                }
                const realColumnName = columnName.substring(separator + 1);
                columnSchema = foundTable.columns.find((schema) => {
                    return equalsIgnore(schema.name, realColumnName);
                });
            } else {
                for (const referencedTable of referencedTables) {
                    const foundColumn = referencedTable.columns.find((schema) => {
                        return equalsIgnore(schema.name, columnName);
                    });

                    if (foundColumn) {
                        columnSchema = foundColumn;
                        break;
                    }
                }
            }

            if (!columnSchema) {
                // todo look into why he cant find it
                logger.silly(`Unknown Column: '${columnName}', no reference found in query: '${query}'`);
                return;
            }
            let columnValue: any;

            if (Array.isArray(parameter)) {
                columnValue = parameter[i];
            } else {
                if (i === 0) {
                    columnValue = parameter;
                } else {
                    throw Error("Number of Values and Placeholders do not match, one value but multiple placeholders");
                }
            }
            const columnTable = columnSchema.table && columnSchema.table.name;

            const notNull = columnValue != null;

            if (columnSchema.type === ColumnType.INT && notNull && !Number.isInteger(columnValue)) {
                throw Error(`non integer value on int column: '${columnName}' in table '${columnTable}'`);
            }

            if (columnSchema.type === ColumnType.FLOAT && notNull && !validate.isNumber(columnValue)) {
                throw Error(`non number value on float column: '${columnName}' in table '${columnTable}'`);
            }

            if (columnSchema.type === ColumnType.BOOLEAN && (notNull && !validate.isBoolean(columnValue))) {
                throw Error(`non boolean value on boolean column: '${columnName}' in table '${columnTable}'`);
            }

            if (columnSchema.type === ColumnType.DATETIME && (notNull
                && (!validate.isDate(columnValue) || Number.isNaN(columnValue.getDate())))) {
                throw Error(`no valid date value on date column: '${columnName}' in table '${columnTable}'`);
            }

            if ((columnSchema.type === ColumnType.TEXT || columnSchema.type === ColumnType.VARCHAR)
                && (notNull && !isString(columnValue))) {
                throw Error(`no string value on string column: '${columnName}' in table '${columnTable}'`);
            }

            if (columnSchema.modifiers.includes(Modifier.NOT_NULL) && !notNull) {
                throw Error(`null/undefined on not nullable column: '${columnName}' in table '${columnTable}'`);
            }

            if (columnSchema.modifiers.includes(Modifier.UNSIGNED) && notNull && columnValue < 0) {
                throw Error(`negative number on unsigned column: '${columnName}' in table '${columnTable}'`);
            }
        }
    },

    addSql(query: string, parameter: MultiSingle<any>, value: any, uuid ?: string): any {
        if (value && ((Number.isInteger(value.affectedRows) && value.affectedRows)
            || (Number.isInteger(value.changedRows) && value.changedRows))) {
            this.sqlHistory.push({
                rawQuery: query,
                parameter,
                changedRows: value.changedRows,
                affectedRows: value.affectedRows,
                uuid
            });
            logger.debug(`Query: '${query}', Parameter: '${parameter}'`);
        }
        return value;
    },

    startRound(): Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            this.workingPromise = this.workingPromise
                .then(() => this._process())
                .then((value) => {
                    resolve(value);
                })
                .catch((reason) => reject(reason));
        });
    },

    async _process(): Promise<string[]> {
        if (!this.sqlHistory.length) {
            return [];
        }
        const rawQueries = [...this.sqlHistory];
        this.sqlHistory.length = 0;
        const updateReg = /^\s*Update/i;
        const insertReg = /^\s*Insert/i;
        const deleteReg = /^\s*Delete/i;

        const queries: Query[] = [];

        for (const rawQuery of rawQueries) {
            let parser: Parser;
            if (updateReg.test(rawQuery.rawQuery)) {
                parser = UpdateParser;
            } else if (insertReg.test(rawQuery.rawQuery)) {
                parser = InsertParser;
            } else if (deleteReg.test(rawQuery.rawQuery)) {
                parser = DeleteParser;
            } else {
                continue;
            }
            const query = parser.parse(rawQuery);
            if (query) {
                queries.push(query);
            }
        }
        const invalidationMap: Map<string, Invalidation> = new Map();

        for (const query of queries) {
            this.trigger
                .filter((value) => (value.triggerType === query.operation) && (value.table === query.target))
                .forEach((value) => value.updateInvalidationMap(query, invalidationMap));
        }
        const invalidationQueries: string[] = [];
        for (const value of invalidationMap.values()) {
            let sqlQuery = `INSERT IGNORE INTO ${mySql.escapeId(value.table)} ` +
                `(${mySql.escapeId(value.foreignColumn)}, ${mySql.escapeId(value.keyColumn)}) `;

            if (value.uuid) {
                const values = value.values
                    .map((v) => `SELECT ${mySql.escape(v)},${mySql.escape(value.uuid)}`)
                    .join(" UNION ");
                sqlQuery += `VALUES (${values})`;
            } else {
                const values = value.values
                    .map((v) => `SELECT ${mySql.escape(v)}`)
                    .join(" UNION ");
                sqlQuery += ` SELECT * FROM (${values}) AS value JOIN (SELECT uuid FROM user) AS user`;
            }
            invalidationQueries.push(sqlQuery);
        }
        return invalidationQueries;
    },

    initTableSchema(database: DatabaseSchema): void {
        this.databaseName = database.name;
        this.tables = [...database.tables];
        const mainTable = database.mainTable;
        const invalidationTable = database.invalidationTable;

        this.mainTable = database.mainTable;
        this.invalidationTable = database.invalidationTable;

        const primaryKey = mainTable.primaryKeys[0];
        const mainPrimaryKey = primaryKey.name;

        // todo inline this function to create trigger?
        const columnConverter: ColumnConverter = (query, triggeredColumn) => {
            let value = triggeredColumn.value;

            const tableKey = triggeredColumn.column;

            if (tableKey === primaryKey) {
                value = true;
            }
            const found = invalidationTable.foreignKeys.find((column) =>
                column.foreignKey === tableKey || column.foreignKey === tableKey.foreignKey
            );
            if (!found) {
                throw Error(`no corresponding foreign key in invalidationTable for column '${tableKey.name}'`);
            }
            return {column: found.name, value};
        };

        for (const table of this.tables) {
            for (const invalidation of table.invalidations) {
                const watchTable = invalidation.table;

                if (invalidation.type & InvalidationType.INSERT) {
                    const trigger = createTrigger(
                        watchTable, table, invalidationTable, mainPrimaryKey, columnConverter, InvalidationType.INSERT
                    );
                    this.trigger.push(trigger);
                }
                if (invalidation.type & InvalidationType.UPDATE) {
                    const trigger = createTrigger(
                        watchTable, table, invalidationTable, mainPrimaryKey, columnConverter, InvalidationType.UPDATE
                    );
                    this.trigger.push(trigger);
                }
                if (invalidation.type & InvalidationType.DELETE) {
                    const trigger = createTrigger(
                        watchTable, table, invalidationTable, mainPrimaryKey, columnConverter, InvalidationType.DELETE
                    );
                    this.trigger.push(trigger);
                }
            }
        }
    },


    async checkTableSchema(context: DatabaseContext): Promise<void> {
        // display all current tables
        const tables: any[] = await context.getTables();

        const enterpriseTableProperty = `Tables_in_${this.databaseName}`;

        // create tables which do not exist
        await Promise.all(this.tables
            .filter((tableSchema) => !tables.find((table: any) => table[enterpriseTableProperty] === tableSchema.name))
            .map((tableSchema) => {
                const schema = tableSchema.getTableSchema();
                return context.createTable(schema.name, schema.columns);
            }));
    },


    checkTables(tables: any, track: string[], ignore: string[]) {
        const separator = /\s+/;

        for (const [tablesKey, tableValue] of Object.entries(tables)) {
            // @ts-ignore
            const tableDeclaration: string = tableValue;

            if (ignore.includes(tableDeclaration)) {
                continue;
            }
            const table = new TableSchema([], tablesKey);

            for (const declaration of tableDeclaration.trim().split(",")) {
                const declarationParts: string[] = declaration.trim().split(separator);

                if (!declarationParts.length) {
                    logger.warn(`${tablesKey}has empty declaration`);
                    continue;
                }
                const keyPart = `${declarationParts[0]} ${declarationParts[1]}`.toUpperCase();

                if (keyPart === "PRIMARY KEY") {
                    TableParser.parsePrimaryKey(table, this.tables, declaration);
                } else if (keyPart === "FOREIGN KEY") {
                    TableParser.parseForeignKey(table, this.tables, declaration);
                } else {
                    const column = TableParser.parseDataColumn(table, this.tables, declaration);

                    if (column) {
                        table.columns.push(column);
                    }
                }
            }
            this.tables.push(table);
        }
    }
};


export const StateProcessor: StateProcessor = StateProcessorImpl;
