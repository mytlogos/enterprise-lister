export declare class Counter {
    private map;
    private ignoreKeys;
    count(key: any): number;
    countDown(key: any): number;
    isIgnored(key: any): boolean;
    ignore(key: any): void;
    unIgnore(key: any): void;
    getCount(key: any): number;
}
