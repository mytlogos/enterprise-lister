import { Scraper } from "./scraperTools";
import { Dependant } from "./types";
export declare class JobScraper implements Scraper {
    private static processDependant;
    private paused;
    private readonly helper;
    private readonly queue;
    private readonly dependantMap;
    constructor();
    addDependant(dependant: Dependant): void;
    on(event: string, callback: (value: any) => void): void;
    removeDependant(dependant: Dependant): void;
    setup(): Promise<void>;
    start(): void;
    pause(): void;
    stop(): void;
    private queuePeriodicEmittable;
    private queuePeriodic;
    private queueOneTimeEmittable;
    private collectEmittable;
}
