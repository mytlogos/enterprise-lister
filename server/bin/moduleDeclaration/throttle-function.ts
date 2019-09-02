declare module "throttle-function" {
    interface ThrottleOptions {
        window?: number;
        limit?: number;
        exact?: number;
    }

    interface ThrottleResult {
        position: number;
        queuedAt: number;
        timeUntilCall: number;
    }

    export default function throttle(func: () => void, opt: ThrottleOptions): ThrottleResult;
}
