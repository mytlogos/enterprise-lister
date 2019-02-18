class Queue {
    public queue: Callback[];
    public working: boolean;

    constructor() {
        this.queue = [];
        this.working = false;
    }

    public push(callback: Callback) {
        return new Promise((resolve, reject) => {
            const worker = () => {
                return new Promise((subResolve, subReject) => {
                    try {
                        const result = callback();
                        subResolve(result);
                    } catch (e) {
                        subReject(e);
                    }
                }).then(resolve).catch(reject);
            };

            this.queue.push(worker);

            if (!this.working) {
                this.doWork();
            }
        });
    }

    public doWork() {
        const worker = this.queue.shift();
        this.working = !!worker;

        if (!worker) {
            return;
        }
        worker().finally(() => {
            const randomDuration = 300 - Math.random() * 150;
            setTimeout(() => this.doWork(), randomDuration);
        });
    }
}

const queues = new Map();

export type Callback = () => any;

export const queueRequest = (baseUri: string, callback: Callback) => {
    let queue: any = queues.get(baseUri);
    if (!queue) {
        queues.set(baseUri, queue = new Queue());
    }
    // fixme does not go as wanted?
    return queue.push(callback);
};
