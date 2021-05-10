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

  function throttle<TResult>(fn: () => TResult, opt: ThrottleOptions): () => TResult;
  function throttle<T1, TResult>(fn: (param1: T1) => TResult, opt: ThrottleOptions): (param1: T1) => TResult;
  function throttle<T1, T2, TResult>(
    fn: (param1: T1, param2: T2) => TResult,
    opt: ThrottleOptions,
  ): (param1: T1, param2: T2) => TResult;
  function throttle<T1, T2, T3, TResult>(
    fn: (param1: T1, param2: T2, param3: T3) => TResult,
    opt: ThrottleOptions,
  ): (param1: T1, param2: T2, param3: T3) => TResult;
  function throttle<T1, T2, T3, T4, TResult>(
    fn: (param1: T1, param2: T2, param3: T3, param4: T4) => TResult,
    opt: ThrottleOptions,
  ): (param1: T1, param2: T2, param3: T3, param4: T4) => TResult;

  export default function throttle(func: () => void, opt: ThrottleOptions): ThrottleResult;
}
