"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const logger_1 = tslib_1.__importDefault(require("../logger"));
const databaseTypes_1 = require("./databaseTypes");
const tableSchema_1 = require("./tableSchema");
const tableParser_1 = require("./tableParser");
const tools_1 = require("../tools");
const promise_mysql_1 = tslib_1.__importDefault(require("promise-mysql"));
const validate = tslib_1.__importStar(require("validate.js"));
const UpdateParser = {
    parse(rawQuery) {
        const query = rawQuery.rawQuery;
        const exec = /update\s+(\w+)\s+set.+\s+WHERE\s+(\w+)\s*=\s*\?/i.exec(query);
        if (!exec) {
            logger_1.default.warn(`could not parse update query: '${query}'`);
            return null;
        }
        const [, table, idConditionColumn] = exec;
        const tableMeta = StateProcessorImpl.tables.find((value) => value.name === table);
        if (!tableMeta) {
            logger_1.default.warn(`unknown table: '${table}'`);
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
            logger_1.default.warn(`condition column is not a primary key: '${idConditionColumnName}'`);
            return null;
        }
        let idValue;
        if (Array.isArray(rawQuery.parameter)) {
            idValue = rawQuery.parameter[rawQuery.parameter.length - 1];
        }
        else {
            logger_1.default.warn(`suspicious update query: '${query}' with less than two parameter: '${rawQuery.parameter}'`);
            return null;
        }
        return {
            rawQuery: query,
            parameter: rawQuery.parameter,
            affectedRows: rawQuery.affectedRows,
            changedRows: rawQuery.changedRows,
            operation: databaseTypes_1.InvalidationType.UPDATE,
            target: tableMeta,
            uuid: rawQuery.uuid,
            columnTarget: [{ column, value: idValue }]
        };
    }
};
const InsertParser = {
    parse(rawQuery) {
        const query = rawQuery.rawQuery;
        const exec = /insert.+into\s+`?(\w+)`?\s*(\(.+\))?\s+VALUES\s*\((.+)\);?/i.exec(query);
        if (!exec) {
            // warn only if it is not a 'insert ... into .... select ...' query
            if (!/insert.+into\s+`?(\w+)`?\s*(\(.+\))?\s*select.+?/i.test(query)) {
                logger_1.default.warn(`could not parse insert query: '${query}'`);
            }
            return null;
        }
        const [, tableName, insertColumns, insertValues] = exec;
        const table = StateProcessorImpl.tables.find((value) => value.name === tableName);
        if (!table) {
            logger_1.default.warn(`unknown table: '${tableName}'`);
            return null;
        }
        let columns;
        if (!insertColumns) {
            columns = table.columns.map((value) => value.name);
        }
        else {
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
        const values = insertValues.split(",").map((value) => value.trim());
        if (values.length !== columns.length) {
            logger_1.default.warn(`not enough values for the columns: expected ${columns.length}, got ${values.length}`);
            return null;
        }
        const columnTargets = [];
        let singleParamUsed = false;
        for (let i = 0; i < columns.length; i++) {
            const columnName = columns[i];
            let value = values[i];
            if (value === "?") {
                const parameter = rawQuery.parameter;
                if (Array.isArray(parameter)) {
                    if (!parameter.length) {
                        logger_1.default.warn(`not enough values for insert query: '${query}', Parameter: ${parameter}`);
                        return null;
                    }
                    value = parameter.shift();
                }
                else {
                    if (singleParamUsed) {
                        logger_1.default.warn(`not enough values for insert query: '${query}', Parameter: ${parameter}`);
                        return null;
                    }
                    singleParamUsed = true;
                    value = parameter;
                }
            }
            const column = table.columns.find((tableColumn) => tableColumn.name === columnName);
            if (!column) {
                logger_1.default.warn(`could not find any columns for '${columnName}' in '${table.name}'`);
                return null;
            }
            columnTargets.push({ column, value });
        }
        return {
            rawQuery: query,
            parameter: rawQuery.parameter,
            affectedRows: rawQuery.affectedRows,
            changedRows: rawQuery.changedRows,
            operation: databaseTypes_1.InvalidationType.INSERT,
            target: table,
            uuid: rawQuery.uuid,
            columnTarget: columnTargets
        };
    }
};
const DeleteParser = {
    parse(rawQuery) {
        const query = rawQuery.rawQuery;
        const exec = /delete\s+from\s+(\w+)\s*(where\s+(.+))?;?/i.exec(query);
        if (!exec) {
            logger_1.default.warn(`could not parse delete query: '${query}'`);
            return null;
        }
        const [, tableName, , deleteCondition] = exec;
        const table = StateProcessorImpl.tables.find((value) => value.name === tableName);
        if (!table) {
            logger_1.default.warn(`unknown table: '${tableName}'`);
            return null;
        }
        const columnTargets = [];
        if (deleteCondition) {
            const conditionsParts = deleteCondition.split(/s+/);
            const column = /^`?\w+`?$/;
            const equals = /^=$/;
            const value = /^\?$/;
            const concatenation = /^AND$/i;
            const finish = /^;$/i;
            let previousState = null;
            let currentColumn = null;
            for (const conditionPart of conditionsParts) {
                if (previousState == null || previousState === concatenation) {
                    previousState = column;
                    if (!column.test(conditionPart)) {
                        return null;
                    }
                    const columnName = conditionPart.substring(1, conditionPart.length - 1);
                    const matchedColumn = table.columns.find((tableColumn) => tableColumn.name === columnName);
                    if (!matchedColumn) {
                        logger_1.default.warn(`unknown column: '${columnName}'`);
                        return null;
                    }
                    currentColumn = matchedColumn;
                }
                else if (previousState === column) {
                    previousState = equals;
                    if (!equals.test(conditionPart)) {
                        return null;
                    }
                }
                else if (previousState === equals) {
                    previousState = value;
                    if (!value.test(conditionPart)) {
                        return null;
                    }
                    columnTargets.push({ column: currentColumn, value: conditionPart });
                }
                else if (previousState === value) {
                    if (concatenation.test(conditionPart)) {
                        previousState = concatenation;
                    }
                    else if (finish.test(conditionPart)) {
                        break;
                    }
                    else {
                        return null;
                    }
                }
                else {
                    return null;
                }
            }
        }
        return {
            rawQuery: query,
            parameter: rawQuery.parameter,
            affectedRows: rawQuery.affectedRows,
            changedRows: rawQuery.changedRows,
            operation: databaseTypes_1.InvalidationType.DELETE,
            target: table,
            uuid: rawQuery.uuid,
            columnTarget: columnTargets
        };
    }
};
function createTrigger(watchTable, targetTable, invalidationTable, mainPrimaryKey, columnConverter, triggerType) {
    if (targetTable.primaryKeys.length !== 1) {
        throw Error("targeted table does not has exact one primary key");
    }
    if (invalidationTable === watchTable || invalidationTable === targetTable) {
        throw Error("invalidation table is not valid");
    }
    return {
        table: watchTable,
        triggerType,
        createInvalidationUpdateQuery(query) {
            const triggeredColumn = query.columnTarget.find((value) => {
                if (value.column.foreignKey && targetTable.primaryKeys.includes(value.column.foreignKey)) {
                    return true;
                }
                return targetTable.primaryKeys.includes(value.column);
            });
            if (!triggeredColumn) {
                logger_1.default.warn("an trigger insert statement without the referenced key of target");
                return "";
            }
            const invalidationColumn = columnConverter(query, triggeredColumn);
            const primaryKeyName = promise_mysql_1.default.escapeId(mainPrimaryKey);
            const tableName = promise_mysql_1.default.escapeId(invalidationTable.name);
            const invalidationName = promise_mysql_1.default.escapeId(invalidationColumn.column);
            const startSql = `INSERT IGNORE INTO ${tableName} (${invalidationName}, ${primaryKeyName})`;
            let sqlQuery;
            const invalidationValue = invalidationColumn.value;
            if (watchTable.mainDependent) {
                const uuid = query.uuid;
                if (!uuid) {
                    throw Error("missing uuid on dependant table");
                }
                sqlQuery = startSql + ` VALUES (${promise_mysql_1.default.escape(invalidationValue)}, ${promise_mysql_1.default.escape(query.uuid)});`;
            }
            else {
                sqlQuery = startSql + ` SELECT ${promise_mysql_1.default.escape(invalidationValue)},uuid FROM user;`;
            }
            return sqlQuery;
        }
    };
}
const queryTableReg = /((select .+? from)|(update )|(delete.+?from)|(insert.+?into )|(.+?join))\s*(\w+)/gi;
const queryColumnReg = /((\w+\.)?(\w+))\s+(like|is|=)\s+\?/gi;
const StateProcessorImpl = {
    databaseName: "",
    workingPromise: Promise.resolve(),
    sqlHistory: [],
    tables: [],
    mainTable: null,
    invalidationTable: null,
    trigger: [],
    async validateQuery(query, parameter) {
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
            if (columnExec[1]) {
                columns.push(columnExec[1]);
            }
            columnExec = queryColumnReg.exec(query);
        }
        const referencedTables = tools_1.unique(tables.map((name) => {
            const foundTable = this.tables.find((value) => tools_1.equalsIgnoreCase(value.name, name));
            if (!foundTable) {
                throw Error(`Unknown Table: '${name}'`);
            }
            return foundTable;
        }).filter((value) => value));
        for (let i = 0; i < columns.length; i++) {
            const columnName = columns[i];
            const separator = columnName.indexOf(".");
            let columnSchema;
            if (separator >= 0) {
                const tableName = columnName.substring(0, separator);
                const foundTable = this.tables.find((value) => tools_1.equalsIgnoreCase(value.name, tableName));
                if (!foundTable) {
                    throw Error(`Unknown Table: '${tableName}'`);
                }
                const realColumnName = columnName.substring(separator + 1);
                columnSchema = foundTable.columns.find((schema) => {
                    return tools_1.equalsIgnoreCase(schema.name, realColumnName);
                });
            }
            else {
                for (const referencedTable of referencedTables) {
                    const foundColumn = referencedTable.columns.find((schema) => {
                        return tools_1.equalsIgnoreCase(schema.name, columnName);
                    });
                    if (foundColumn) {
                        columnSchema = foundColumn;
                        break;
                    }
                }
            }
            if (!columnSchema) {
                throw Error(`Unknown Column: '${columnName}', no reference found in query: '${query}'`);
            }
            let columnValue;
            if (Array.isArray(parameter)) {
                columnValue = parameter[i];
            }
            else {
                if (i === 0) {
                    columnValue = parameter;
                }
                else {
                    throw Error("Number of Values and Placeholders do not match, one value but multiple placeholders");
                }
            }
            const columnTable = columnSchema.table && columnSchema.table.name;
            const notNull = columnValue != null;
            if (columnSchema.type === databaseTypes_1.ColumnType.INT && notNull && !Number.isInteger(columnValue)) {
                throw Error(`non integer value on int column: '${columnName}' in table '${columnTable}'`);
            }
            if (columnSchema.type === databaseTypes_1.ColumnType.FLOAT && notNull && !validate.isNumber(columnValue)) {
                throw Error(`non number value on float column: '${columnName}' in table '${columnTable}'`);
            }
            if (columnSchema.type === databaseTypes_1.ColumnType.BOOLEAN && (notNull && !validate.isBoolean(columnValue))) {
                throw Error(`non boolean value on boolean column: '${columnName}' in table '${columnTable}'`);
            }
            if (columnSchema.type === databaseTypes_1.ColumnType.DATETIME && (notNull
                && (!validate.isDate(columnValue) || Number.isNaN(columnValue.getDate())))) {
                throw Error(`no valid date value on date column: '${columnName}' in table '${columnTable}'`);
            }
            if ((columnSchema.type === databaseTypes_1.ColumnType.TEXT || columnSchema.type === databaseTypes_1.ColumnType.VARCHAR)
                && (notNull && !tools_1.isString(columnValue))) {
                throw Error(`no string value on string column: '${columnName}' in table '${columnTable}'`);
            }
            if (columnSchema.modifiers.includes(databaseTypes_1.Modifier.NOT_NULL) && !notNull) {
                throw Error(`null/undefined on not nullable column: '${columnName}' in table '${columnTable}'`);
            }
            if (columnSchema.modifiers.includes(databaseTypes_1.Modifier.UNSIGNED) && notNull && columnValue < 0) {
                throw Error(`negative number on unsigned column: '${columnName}' in table '${columnTable}'`);
            }
        }
    },
    addSql(query, parameter, value, uuid) {
        if (value && ((Number.isInteger(value.affectedRows) && value.affectedRows)
            || (Number.isInteger(value.changedRows) && value.changedRows))) {
            this.sqlHistory.push({
                rawQuery: query,
                parameter,
                changedRows: value.changedRows,
                affectedRows: value.affectedRows,
                uuid
            });
            logger_1.default.silly(`Query: '${query}', Parameter: '${parameter}'`);
        }
        return value;
    },
    startRound() {
        return new Promise((resolve, reject) => {
            this.workingPromise = this.workingPromise
                .then(() => this._process())
                .then((value) => {
                resolve(value);
            })
                .catch((reason) => reject(reason));
        });
    },
    async _process() {
        if (!this.sqlHistory.length) {
            return [];
        }
        const rawQueries = [...this.sqlHistory];
        this.sqlHistory.length = 0;
        const updateReg = /^\s*Update/i;
        const insertReg = /^\s*Insert/i;
        const deleteReg = /^\s*Delete/i;
        const queries = [];
        for (const rawQuery of rawQueries) {
            let parser;
            if (updateReg.test(rawQuery.rawQuery)) {
                parser = UpdateParser;
            }
            else if (insertReg.test(rawQuery.rawQuery)) {
                parser = InsertParser;
            }
            else if (deleteReg.test(rawQuery.rawQuery)) {
                parser = DeleteParser;
            }
            else {
                continue;
            }
            const query = parser.parse(rawQuery);
            if (query) {
                queries.push(query);
            }
        }
        const invalidationQueries = [];
        for (const query of queries) {
            this.trigger
                .filter((value) => (value.triggerType === query.operation) && (value.table === query.target))
                .forEach((value) => {
                const updateQuery = value.createInvalidationUpdateQuery(query);
                if (Array.isArray(updateQuery) && updateQuery.length) {
                    invalidationQueries.push(...updateQuery.filter((s) => s));
                }
                else if (tools_1.isString(updateQuery) && updateQuery) {
                    invalidationQueries.push(updateQuery);
                }
            });
        }
        return invalidationQueries;
    },
    initTableSchema(database) {
        this.databaseName = database.name;
        this.tables = [...database.tables];
        const mainTable = database.mainTable;
        const invalidationTable = database.invalidationTable;
        this.mainTable = database.mainTable;
        this.invalidationTable = database.invalidationTable;
        const primaryKey = mainTable.primaryKeys[0];
        const mainPrimaryKey = primaryKey.name;
        // todo inline this function to create trigger?
        const columnConverter = (query, triggeredColumn) => {
            let value = triggeredColumn.value;
            const tableKey = triggeredColumn.column;
            if (tableKey === primaryKey) {
                value = true;
            }
            const found = invalidationTable.foreignKeys.find((column) => column.foreignKey === tableKey || column.foreignKey === tableKey.foreignKey);
            if (!found) {
                throw Error(`no corresponding foreign key in invalidationTable for column '${tableKey.name}'`);
            }
            return { column: found.name, value };
        };
        for (const table of this.tables) {
            for (const invalidation of table.invalidations) {
                const watchTable = invalidation.table;
                if (invalidation.type & databaseTypes_1.InvalidationType.INSERT) {
                    const trigger = createTrigger(watchTable, table, invalidationTable, mainPrimaryKey, columnConverter, databaseTypes_1.InvalidationType.INSERT);
                    this.trigger.push(trigger);
                }
                if (invalidation.type & databaseTypes_1.InvalidationType.UPDATE) {
                    const trigger = createTrigger(watchTable, table, invalidationTable, mainPrimaryKey, columnConverter, databaseTypes_1.InvalidationType.UPDATE);
                    this.trigger.push(trigger);
                }
                if (invalidation.type & databaseTypes_1.InvalidationType.DELETE) {
                    const trigger = createTrigger(watchTable, table, invalidationTable, mainPrimaryKey, columnConverter, databaseTypes_1.InvalidationType.DELETE);
                    this.trigger.push(trigger);
                }
            }
        }
    },
    async checkTableSchema(context) {
        const exists = await context.databaseExists();
        if (!exists) {
            await context.createDatabase();
        }
        // set database as current database
        await context.useDatabase();
        // display all current tables
        const tables = await context.getTables();
        const enterpriseTableProperty = `Tables_in_${this.databaseName}`;
        // create tables which do not exist
        await Promise.all(this.tables
            .filter((tableSchema) => !tables.find((table) => table[enterpriseTableProperty] === tableSchema.name))
            .map((tableSchema) => {
            const schema = tableSchema.getTableSchema();
            return context.createTable(schema.name, schema.columns);
        }));
        return;
    },
    checkTables(tables, track, ignore) {
        const separator = /\s+/;
        for (const [tablesKey, tableValue] of Object.entries(tables)) {
            // @ts-ignore
            const tableDeclaration = tableValue;
            if (ignore.includes(tableDeclaration)) {
                continue;
            }
            const table = new tableSchema_1.TableSchema([], tablesKey);
            for (const declaration of tableDeclaration.trim().split(",")) {
                const declarationParts = declaration.trim().split(separator);
                if (!declarationParts.length) {
                    logger_1.default.warn(`${tablesKey}has empty declaration`);
                    continue;
                }
                const keyPart = `${declarationParts[0]} ${declarationParts[1]}`.toUpperCase();
                if (keyPart === "PRIMARY KEY") {
                    tableParser_1.TableParser.parsePrimaryKey(table, this.tables, declaration);
                }
                else if (keyPart === "FOREIGN KEY") {
                    tableParser_1.TableParser.parseForeignKey(table, this.tables, declaration);
                }
                else {
                    const column = tableParser_1.TableParser.parseDataColumn(table, this.tables, declaration);
                    if (column) {
                        table.columns.push(column);
                    }
                }
            }
            this.tables.push(table);
        }
    }
};
exports.StateProcessor = StateProcessorImpl;
//# sourceMappingURL=databaseValidator.js.map