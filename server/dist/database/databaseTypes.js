"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var SqlFunction;
(function (SqlFunction) {
    SqlFunction["NOW"] = "NOW()";
})(SqlFunction = exports.SqlFunction || (exports.SqlFunction = {}));
var Modifier;
(function (Modifier) {
    Modifier["PRIMARY_KEY"] = "PRIMARY_KEY";
    Modifier["UNIQUE"] = "UNIQUE";
    Modifier["NOT_NULL"] = "NOT NULL";
    Modifier["NOT"] = "NOT";
    Modifier["NULL"] = "NULL";
    Modifier["UNSIGNED"] = "UNSIGNED";
    Modifier["AUTO_INCREMENT"] = "AUTO_INCREMENT";
})(Modifier = exports.Modifier || (exports.Modifier = {}));
var ColumnType;
(function (ColumnType) {
    ColumnType["BOOLEAN"] = "BOOLEAN";
    ColumnType["TEXT"] = "TEXT";
    ColumnType["CHAR"] = "CHAR";
    ColumnType["VARCHAR"] = "VARCHAR";
    ColumnType["DATETIME"] = "DATETIME";
    ColumnType["FLOAT"] = "FLOAT";
    ColumnType["INT"] = "INT";
})(ColumnType = exports.ColumnType || (exports.ColumnType = {}));
var InvalidationType;
(function (InvalidationType) {
    InvalidationType[InvalidationType["INSERT"] = 1] = "INSERT";
    InvalidationType[InvalidationType["UPDATE"] = 2] = "UPDATE";
    InvalidationType[InvalidationType["DELETE"] = 4] = "DELETE";
    InvalidationType[InvalidationType["INSERT_OR_UPDATE"] = 3] = "INSERT_OR_UPDATE";
    InvalidationType[InvalidationType["INSERT_OR_DELETE"] = 5] = "INSERT_OR_DELETE";
    InvalidationType[InvalidationType["ANY"] = 7] = "ANY";
})(InvalidationType = exports.InvalidationType || (exports.InvalidationType = {}));
//# sourceMappingURL=databaseTypes.js.map