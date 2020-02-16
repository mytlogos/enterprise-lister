"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var SqlFunction;
(function (SqlFunction) {
    SqlFunction["NOW"] = "NOW()";
    SqlFunction["CURRENT_TIMESTAMP"] = "CURRENT_TIMESTAMP";
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
    ColumnType["DOUBLE"] = "DOUBLE";
    ColumnType["BOOLEAN"] = "BOOLEAN";
    ColumnType["TEXT"] = "TEXT";
    ColumnType["CHAR"] = "CHAR";
    ColumnType["VARCHAR"] = "VARCHAR";
    ColumnType["DATETIME"] = "DATETIME";
    ColumnType["TIMESTAMP"] = "TIMESTAMP";
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
var MySqlErrorNo;
(function (MySqlErrorNo) {
    MySqlErrorNo[MySqlErrorNo["ER_BAD_FIELD_ERROR"] = 1054] = "ER_BAD_FIELD_ERROR";
    MySqlErrorNo[MySqlErrorNo["ER_DUP_FIELDNAME"] = 1060] = "ER_DUP_FIELDNAME";
    MySqlErrorNo[MySqlErrorNo["ER_DUP_ENTRY"] = 1062] = "ER_DUP_ENTRY";
    MySqlErrorNo[MySqlErrorNo["ER_CANT_DROP_FIELD_OR_KEY"] = 1091] = "ER_CANT_DROP_FIELD_OR_KEY";
})(MySqlErrorNo = exports.MySqlErrorNo || (exports.MySqlErrorNo = {}));
//# sourceMappingURL=databaseTypes.js.map