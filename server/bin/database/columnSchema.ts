import {ColumnType, Modifier, SqlFunction} from "./databaseTypes";
import mySql from "promise-mysql";
import {TableSchema} from "./tableSchema";

export class ColumnSchema {
    public readonly name: string;
    public table: TableSchema | null;
    public readonly type: ColumnType;
    public readonly typeSize?: number;
    public readonly modifiers: Modifier[];
    public readonly primaryKey?: boolean;
    public readonly foreignKey?: ColumnSchema;
    public readonly default?: string | SqlFunction;
    public readonly update?: string | SqlFunction;
    public readonly primaryKeyTypeSize?: number;

    public constructor(name: string, type: ColumnType, modifiers: Modifier[], typeSize?: number, primaryKey?: boolean,
        foreignKey?: ColumnSchema, defaultV?: string | SqlFunction, primaryKeyTypeSize?: number,
        update?: string | SqlFunction) {

        this.name = name;
        this.type = type;
        this.modifiers = modifiers;
        this.typeSize = typeSize;
        this.primaryKey = primaryKey;
        this.foreignKey = foreignKey;
        this.default = defaultV;
        this.update = update;
        this.primaryKeyTypeSize = primaryKeyTypeSize;
        this.table = null;
    }


    public getSchema(): string {
        // @ts-ignore
        let defValue: string | SqlFunction = " ";

        if (this.default) {
            const values = Object.values(SqlFunction);
            // @ts-ignore
            if (values.includes(this.default.trim())) {
                defValue += "DEFAULT " + this.default;
            } else {
                defValue += "DEFAULT " + mySql.escape(this.default);
            }
        }

        // @ts-ignore
        let updateValue: string | SqlFunction = " ";

        if (this.update) {
            const values = Object.values(SqlFunction);
            // @ts-ignore
            if (values.includes(this.update.trim())) {
                updateValue += "ON UPDATE " + this.update;
            } else {
                // todo shouldn't this be "ON UPDATE " + mysql.escape(this.default)?
                updateValue += mySql.escape(this.update);
            }
        }
        // todo instead of testing for VARCHAR, test for a group of columns or if just typeSize is defined?
        const type = this.typeSize != null ? this.type + "(" + this.typeSize + ")" : this.type;
        return `${mySql.escapeId(this.name)} ${type} ${this.modifiers.join(" ")}${defValue}${updateValue}`;
    }
}
