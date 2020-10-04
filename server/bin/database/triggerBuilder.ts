import {Trigger, TriggerEvent, TriggerTiming} from "./trigger";
import {DataBaseBuilder} from "./databaseBuilder";

export class TriggerBuilder {
    private _name: string | null = null;
    private _timing: TriggerTiming | null = null;
    private _event: TriggerEvent | null = null;
    private _table: string | null = null;
    private _body: string | null = null;
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
