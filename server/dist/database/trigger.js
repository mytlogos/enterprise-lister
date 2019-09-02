"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const promise_mysql_1 = tslib_1.__importDefault(require("promise-mysql"));
class Trigger {
    constructor(name, timing, event, table, body) {
        this.name = name;
        this.timing = timing;
        this.event = event;
        this.table = table;
        this.body = body;
    }
    createSchema() {
        const escapedTable = promise_mysql_1.default.escapeId(this.table);
        const escapedName = promise_mysql_1.default.escapeId(this.name);
        return `CREATE TRIGGER ${escapedName} ${this.timing} ${this.event} ON ${escapedTable} ` +
            `FOR EACH ROW BEGIN ${this.body} END`;
    }
}
exports.Trigger = Trigger;
var TriggerTiming;
(function (TriggerTiming) {
    TriggerTiming["AFTER"] = "AFTER";
    TriggerTiming["BEFORE"] = "BEFORE";
})(TriggerTiming = exports.TriggerTiming || (exports.TriggerTiming = {}));
var TriggerEvent;
(function (TriggerEvent) {
    TriggerEvent["DELETE"] = "DELETE";
    TriggerEvent["INSERT"] = "INSERT";
    TriggerEvent["UPDATE"] = "UPDATE";
})(TriggerEvent = exports.TriggerEvent || (exports.TriggerEvent = {}));
//# sourceMappingURL=trigger.js.map