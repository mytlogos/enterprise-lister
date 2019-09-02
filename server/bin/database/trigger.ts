import mySql from "promise-mysql";

export class Trigger {
    public readonly name: string;
    public readonly timing: TriggerTiming;
    public readonly event: TriggerEvent;
    public readonly table: string;
    public readonly body: string;

    constructor(name: string, timing: TriggerTiming, event: TriggerEvent, table: string, body: string) {
        this.name = name;
        this.timing = timing;
        this.event = event;
        this.table = table;
        this.body = body;
    }

    public createSchema(): string {
        const escapedTable = mySql.escapeId(this.table);
        const escapedName = mySql.escapeId(this.name);

        return `CREATE TRIGGER ${escapedName} ${this.timing} ${this.event} ON ${escapedTable} ` +
            `FOR EACH ROW BEGIN ${this.body} END`;
    }
}

export enum TriggerTiming {
    AFTER = "AFTER",
    BEFORE = "BEFORE",
}

export enum TriggerEvent {
    DELETE = "DELETE",
    INSERT = "INSERT",
    UPDATE = "UPDATE",
}
