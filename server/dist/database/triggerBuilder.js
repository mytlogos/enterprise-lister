"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const trigger_1 = require("./trigger");
class TriggerBuilder {
    constructor(databaseBuilder) {
        this._name = null;
        this._timing = null;
        this._event = null;
        this._table = null;
        this._body = null;
        this.databaseBuilder = databaseBuilder;
    }
    setName(value) {
        this._name = value;
        return this;
    }
    setTiming(value) {
        this._timing = value;
        return this;
    }
    setEvent(value) {
        this._event = value;
        return this;
    }
    setTable(value) {
        this._table = value;
        return this;
    }
    setBody(value) {
        this._body = value;
        return this;
    }
    build() {
        if (!this._name || !this._body || !this._table || !this._event || !this._timing) {
            throw Error("invalid trigger");
        }
        const trigger = new trigger_1.Trigger(this._name, this._timing, this._event, this._table, this._body);
        this.databaseBuilder.addTrigger(trigger);
        return trigger;
    }
}
exports.TriggerBuilder = TriggerBuilder;
//# sourceMappingURL=triggerBuilder.js.map