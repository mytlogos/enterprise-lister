import { Trigger, TriggerEvent, TriggerTiming } from "./trigger";
import { DataBaseBuilder } from "./databaseBuilder";
import { Nullable } from "../types";

export class TriggerBuilder {
    private _name: Nullable<string> = null;
    private _timing: Nullable<TriggerTiming> = null;
    private _event: Nullable<TriggerEvent> = null;
    private _table: Nullable<string> = null;
    private _body: Nullable<string> = null;
    private databaseBuilder: DataBaseBuilder;

    public constructor(databaseBuilder: DataBaseBuilder) {
        this.databaseBuilder = databaseBuilder;
    }

    public setName(value: string): this {
        this._name = value;
        return this;
    }

    public setTiming(value: TriggerTiming): this {
        this._timing = value;
        return this;
    }

    public setEvent(value: TriggerEvent): this {
        this._event = value;
        return this;
    }

    public setTable(value: string): this {
        this._table = value;
        return this;
    }

    public setBody(value: string): this {
        this._body = value;
        return this;
    }

    public build(): Trigger {
        if (!this._name || !this._body || !this._table || !this._event || !this._timing) {
            throw Error("invalid trigger");
        }
        const trigger = new Trigger(this._name, this._timing, this._event, this._table, this._body);
        this.databaseBuilder.addTrigger(trigger);
        return trigger;
    }
}
