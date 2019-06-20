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
    public readonly primaryKeyTypeSize?: number;

    constructor(name: string, type: ColumnType, modifiers: Modifier[], typeSize?: number, primaryKey?: boolean,
                foreignKey?: ColumnSchema, defaultV?: string | SqlFunction, primaryKeyTypeSize?: number) {

        this.name = name;
        this.type = type;
        this.modifiers = modifiers;
        this.typeSize = typeSize;
        this.primaryKey = primaryKey;
        this.foreignKey = foreignKey;
        this.default = defaultV;
        this.primaryKeyTypeSize = primaryKeyTypeSize;
        this.table = null;
    }


    public getSchema(): string {
        const thisDef = this.default;
        let defValue: string | SqlFunction.NOW = " ";

        if (thisDef) {
            const values = Object.values(SqlFunction);
            if (values.includes(thisDef.trim())) {
                defValue += "DEFAULT " + thisDef;
            } else {
                defValue += mySql.escape(thisDef);
            }
        }
        const type = this.type === ColumnType.VARCHAR ? this.type + "(" + this.typeSize + ")" : this.type;
        return `${this.name} ${type} ${this.modifiers.join(" ")}${defValue}`;
    }
}
