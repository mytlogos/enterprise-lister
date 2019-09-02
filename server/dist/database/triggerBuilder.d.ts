import { Trigger, TriggerEvent, TriggerTiming } from "./trigger";
import { DataBaseBuilder } from "./databaseBuilder";
export declare class TriggerBuilder {
    private _name;
    private _timing;
    private _event;
    private _table;
    private _body;
    private databaseBuilder;
    constructor(databaseBuilder: DataBaseBuilder);
    setName(value: string): this;
    setTiming(value: TriggerTiming): this;
    setEvent(value: TriggerEvent): this;
    setTable(value: string): this;
    setBody(value: string): this;
    build(): Trigger;
}
