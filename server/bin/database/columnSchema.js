import { ColumnType, SqlFunction } from "./databaseTypes";
import mySql from "promise-mysql";
export class ColumnSchema {
    constructor(name, type, modifiers, typeSize, primaryKey, foreignKey, defaultV, primaryKeyTypeSize) {
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
    getSchema() {
        const thisDef = this.default;
        let defValue = " ";
        if (thisDef) {
            const values = Object.values(SqlFunction);
            if (values.includes(thisDef.trim())) {
                defValue += "DEFAULT " + thisDef;
            }
            else {
                defValue += mySql.escape(thisDef);
            }
        }
        const type = this.type === ColumnType.VARCHAR ? this.type + "(" + this.typeSize + ")" : this.type;
        return `${this.name} ${type} ${this.modifiers.join(" ")}${defValue}`;
    }
}
//# sourceMappingURL=columnSchema.js.map