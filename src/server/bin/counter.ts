export class Counter<K> {
    private map = new Map<K, number>();
    private ignoreKeys: K[] = [];

    public count(key: K): number {
        const previous = this.map.get(key);
        if (this.ignoreKeys.includes(key)) {
            return previous || 0;
        }
        const current = !previous ? 1 : previous + 1;
        this.map.set(key, current);
        return current;
    }

    public countDown(key: K): number {
        const previous = this.map.get(key);
        if (this.ignoreKeys.includes(key)) {
            return previous || 0;
        }
        const current = !previous ? 0 : previous - 1;
        this.map.set(key, current);
        return current;
    }

    public isIgnored(key: K): boolean {
        return this.ignoreKeys.includes(key);
    }

    public ignore(key: K): void {
        this.ignoreKeys.push(key);
    }

    public unIgnore(key: K): void {
        const index = this.ignoreKeys.findIndex((value) => value === key);

        if (index >= 0) {
            this.ignoreKeys.splice(index, 1);
        }
    }

    public getCount(key: K): number {
        const previous = this.map.get(key);
        return previous ? previous : 0;
    }

}
