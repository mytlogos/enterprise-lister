"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const databaseTypes_1 = require("./databaseTypes");
const promise_mysql_1 = tslib_1.__importDefault(require("promise-mysql"));
class ColumnSchema {
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
            const values = Object.values(databaseTypes_1.SqlFunction);
            // @ts-ignore
            if (values.includes(thisDef.trim())) {
                defValue += "DEFAULT " + thisDef;
            }
            else {
                defValue += promise_mysql_1.default.escape(thisDef);
            }
        }
        const type = this.type === databaseTypes_1.ColumnType.VARCHAR ? this.type + "(" + this.typeSize + ")" : this.type;
        return `${promise_mysql_1.default.escapeId(this.name)} ${type} ${this.modifiers.join(" ")}${defValue}`;
    }
}
exports.ColumnSchema = ColumnSchema;
//# sourceMappingURL=columnSchema.js.map