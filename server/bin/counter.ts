export class Counter {
    private map = new Map<any, number>();
    private ignoreKeys: any[] = [];

    public count(key: any): number {
        const previous = this.map.get(key);
        if (this.ignoreKeys.includes(key)) {
            return previous || 0;
        }
        const current = !previous ? 1 : previous + 1;
        this.map.set(key, current);
        return current;
    }

    public countDown(key: any): number {
        const previous = this.map.get(key);
        if (this.ignoreKeys.includes(key)) {
            return previous || 0;
        }
        const current = !previous ? 0 : previous - 1;
        this.map.set(key, current);
        return current;
    }

    public isIgnored(key: any): boolean {
        return this.ignoreKeys.includes(key);
    }

    public ignore(key: any): void {
        this.ignoreKeys.push(key);
    }

    public unIgnore(key: any): void {
        const index = this.ignoreKeys.findIndex((value) => value === key);

        if (index >= 0) {
            this.ignoreKeys.splice(index, 1);
        }
    }

    public getCount(key: any): number {
        const previous = this.map.get(key);
        return previous ? previous : 0;
    }

}
