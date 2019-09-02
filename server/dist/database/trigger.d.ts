export declare class Trigger {
    readonly name: string;
    readonly timing: TriggerTiming;
    readonly event: TriggerEvent;
    readonly table: string;
    readonly body: string;
    constructor(name: string, timing: TriggerTiming, event: TriggerEvent, table: string, body: string);
    createSchema(): string;
}
export declare enum TriggerTiming {
    AFTER = "AFTER",
    BEFORE = "BEFORE"
}
export declare enum TriggerEvent {
    DELETE = "DELETE",
    INSERT = "INSERT",
    UPDATE = "UPDATE"
}
