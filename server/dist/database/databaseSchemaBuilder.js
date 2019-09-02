"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var SqlFunction;
(function (SqlFunction) {
    SqlFunction["NOW"] = "NOW()";
})(SqlFunction = exports.SqlFunction || (exports.SqlFunction = {}));
class DataBaseBuilder {
    setName(name) {
        return this;
    }
    getTableBuilder() {
        return this;
    }
    build() {
        return this;
    }
}
exports.DataBaseBuilder = DataBaseBuilder;
var Modifier;
(function (Modifier) {
    Modifier["PRIMARY_KEY"] = "PRIMARY_KEY";
    Modifier["UNIQUE"] = "UNIQUE";
    Modifier["NOT_NULL"] = "NOT_NULL";
    Modifier["UNSIGNED"] = "UNSIGNED";
    Modifier["AUTO_INCREMENT"] = "AUTO_INCREMENT";
})(Modifier = exports.Modifier || (exports.Modifier = {}));
var ColumnType;
(function (ColumnType) {
    ColumnType["BOOLEAN"] = "BOOLEAN";
    ColumnType["TEXT"] = "TEXT";
    ColumnType["VARCHAR"] = "VARCHAR";
    ColumnType["DATETIME"] = "DATETIME";
    ColumnType["FLOAT"] = "FLOAT";
    ColumnType["INT"] = "INT";
})(ColumnType = exports.ColumnType || (exports.ColumnType = {}));
exports.DatabaseBuilder = {
    build() {
        return null;
    },
    getTableBuilder() {
        return null;
    },
    setName(name) {
        return this;
    }
};
//# sourceMappingURL=databaseSchemaBuilder.js.map