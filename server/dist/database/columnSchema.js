"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const databaseTypes_1 = require("./databaseTypes");
const promise_mysql_1 = tslib_1.__importDefault(require("promise-mysql"));
class ColumnSchema {
    constructor(name, type, modifiers, typeSize, primaryKey, foreignKey, defaultV, primaryKeyTypeSize, update) {
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
    getSchema() {
        // @ts-ignore
        let defValue = " ";
        if (this.default) {
            const values = Object.values(databaseTypes_1.SqlFunction);
            // @ts-ignore
            if (values.includes(this.default.trim())) {
                defValue += "DEFAULT " + this.default;
            }
            else {
                // todo shouldn't this be "DEFAULT" + mysql.escape(this.default)?
                defValue += promise_mysql_1.default.escape(this.default);
            }
        }
        // @ts-ignore
        let updateValue = " ";
        if (this.update) {
            const values = Object.values(databaseTypes_1.SqlFunction);
            // @ts-ignore
            if (values.includes(this.update.trim())) {
                updateValue += "ON UPDATE " + this.update;
            }
            else {
                // todo shouldn't this be "ON UPDATE " + mysql.escape(this.default)?
                updateValue += promise_mysql_1.default.escape(this.update);
            }
        }
        // todo instead of testing for VARCHAR, test for a group of columns or if just typeSize is defined?
        const type = this.type === databaseTypes_1.ColumnType.VARCHAR ? this.type + "(" + this.typeSize + ")" : this.type;
        return `${promise_mysql_1.default.escapeId(this.name)} ${type} ${this.modifiers.join(" ")}${defValue}${updateValue}`;
    }
}
exports.ColumnSchema = ColumnSchema;
//# sourceMappingURL=columnSchema.js.map