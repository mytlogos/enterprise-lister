import { SimpleMedium, FullMediumToc, StringKey } from "./siteTypes";

/**
 * Slightly modified from: https://stackoverflow.com/a/21648508
 */
export function hexToRgbA(hex: string, opacity = 1) {
  if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex) && (opacity < 1 || opacity > 0)) {
    let c = hex.substring(1).split("");
    if (c.length == 3) {
      c = [c[0], c[0], c[1], c[1], c[2], c[2]];
    }
    const fullHex = Number("0x" + c.join(""));
    return `rgba(${[(fullHex >> 16) & 255, (fullHex >> 8) & 255, fullHex & 255].join(",")},${opacity})`;
  }
  throw new Error("Bad Hex");
}

/**
 *
 */
export function forEachArrayLike<T>(arrayLike: ArrayLike<T>, callback: (value: T, index: number) => void): void {
  for (let i = 0; i < arrayLike.length; i++) {
    callback(arrayLike[i], i);
  }
}

export function count<T>(arrayLike: ArrayLike<T>, predicate: (value: T, index: number) => boolean): number {
  let counted = 0;

  forEachArrayLike(arrayLike, (value, index) => {
    if (predicate(value, index)) {
      counted++;
    }
  });
  return counted;
}

/**
 * Round the number to the nearest n-th decimal place.
 *
 * @param value value to round
 * @param decimalPlace place to round to
 */
export function round(value: number, decimalPlace: number): number {
  return Math.round(value * 10 ** decimalPlace) / 10 ** decimalPlace;
}

/**
 * Remove the first occurrence of value from the array
 *
 * @param value value to round
 * @param decimalPlace place to round to
 */
export function remove<T>(array: T[], value: T): void {
  const index = array.indexOf(value);

  if (index >= 0) {
    array.splice(index, 1);
  }
}

export type AnyFunction = (...args: any[]) => any;

/**
 * Debounces a given Function.
 *
 * @param func function to debounce
 * @param timeout time to execute function after last call in ms
 * @returns nothing
 */
export function debounce<Func extends AnyFunction, thisValue = void>(
  this: thisValue,
  func: Func,
  timeout = 500,
): (...args: Parameters<Func>) => void {
  let timer: number;
  return (...args) => {
    clearTimeout(timer);
    // @ts-expect-error
    timer = setTimeout(() => func.apply(this, args), timeout);
  };
}

/**
 * Splits an array into multiple batches with each a length of batchSize.
 * The last batch may have less than batchSize, but is never empty.
 * A negative batchSize always yields an array with a single batch with all values.
 *
 * @param array the array to batch
 * @param batchSize the maximum size of a batch
 */
export function batch<T>(array: T[], batchSize: number): T[][] {
  const batches = [];
  let currentBatch = [];

  for (const value of array) {
    if (currentBatch.length >= batchSize) {
      batches.push(currentBatch);
      currentBatch = [];
    }
    currentBatch.push(value);
  }
  if (currentBatch.length) {
    batches.push(currentBatch);
  }
  return batches;
}

/**
 * Merge the tocs and the default medium into a single value.
 * Modifies the original medium.
 *
 * @param medium medium to merge with
 * @param tocs tocs to merge into the medium
 */
export function mergeMediaToc(medium: SimpleMedium, tocs: FullMediumToc[]): SimpleMedium {
  for (const toc of tocs) {
    medium.title = medium.title || toc.title || "N/A";
    medium.author = medium.author || toc.author;
    medium.artist = medium.artist || toc.artist;
    medium.countryOfOrigin = medium.countryOfOrigin || toc.countryOfOrigin;
    medium.languageOfOrigin = medium.languageOfOrigin || toc.languageOfOrigin;
    medium.series = medium.series || toc.series;
    medium.universe = medium.universe || toc.universe;
    medium.lang = medium.lang || toc.lang;

    if (medium.medium !== toc.medium) {
      console.warn(
        "toc of different media types, expected: " +
          medium.medium +
          ", got: " +
          toc.medium +
          " for medium: " +
          medium.id +
          ": " +
          medium.title,
      );
    }
    if ((medium.stateTL || Number.NEGATIVE_INFINITY) < (toc.stateTL || Number.NEGATIVE_INFINITY)) {
      medium.stateTL = toc.stateTL;
    }
    if ((medium.stateOrigin || Number.NEGATIVE_INFINITY) < (toc.stateOrigin || Number.NEGATIVE_INFINITY)) {
      medium.stateOrigin = toc.stateOrigin;
    }
  }
  return medium;
}

export function mergeMediaTocProp<T extends StringKey<SimpleMedium>>(
  medium: SimpleMedium,
  tocs: FullMediumToc[],
  prop: T,
): SimpleMedium[T] {
  if (prop === "medium") {
    for (const toc of tocs) {
      if (medium.medium !== toc.medium) {
        console.warn(
          "toc of different media types, expected: " +
            medium.medium +
            ", got: " +
            toc.medium +
            " for medium: " +
            medium.id +
            ": " +
            medium.title,
        );
      }
    }
    return medium.medium;
  } else if (prop === "stateTL" || prop === "stateOrigin") {
    let state = medium[prop];

    for (const toc of tocs) {
      if ((state || Number.NEGATIVE_INFINITY) < (toc[prop] || Number.NEGATIVE_INFINITY)) {
        state = toc[prop];
      }
    }
    return state;
  } else if (medium[prop]) {
    return medium[prop];
  } else {
    for (const toc of tocs) {
      if (toc[prop]) {
        return toc[prop];
      }
    }
    return "";
  }
}

/**
 * A 'Resize'-events throttler which calls every added
 * callback in the next animation frame or after 66ms
 * after resize event fired.
 *
 * Callbacks are run only when no previous throttling is active.
 *
 * @type {{add}}
 */
export const optimizedResize = (() => {
  const callbacks: Array<() => void> = [];
  let running = false;

  // fired on resize event
  function resize() {
    // run callbacks on next AnimationFrame
    // or after 66ms only if it is not running
    if (!running) {
      running = true;

      if (window.requestAnimationFrame) {
        window.requestAnimationFrame(runCallbacks);
      } else {
        setTimeout(runCallbacks, 66);
      }
    }
  }

  // run the actual callbacks
  function runCallbacks() {
    callbacks.forEach((callback) => callback());
    running = false;
  }

  return {
    // public method to add additional callback
    add(callback: () => void) {
      // let throttler function listen to resize events
      if (!callbacks.length) {
        window.addEventListener("resize", resize);
      }

      // add callback
      if (callback) {
        callbacks.push(callback);
      }
    },
  };
})();

export function timeDifference(current: Date, other: Date): string {
  const msPerMinute = 60 * 1000;
  const msPerHour = msPerMinute * 60;
  const msPerDay = msPerHour * 24;
  const msPerMonth = msPerDay * 30;
  const msPerYear = msPerDay * 365;

  let elapsed: number;
  const otherAfter = current < other;
  if (otherAfter) {
    elapsed = other.getTime() - current.getTime();
  } else {
    elapsed = current.getTime() - other.getTime();
  }
  let value = 0;
  let unit = "";

  if (elapsed < msPerMinute) {
    value = Math.round(elapsed / 1000);
    unit = "second";
  } else if (elapsed < msPerHour) {
    value = Math.round(elapsed / msPerMinute);
    unit = "minute";
  } else if (elapsed < msPerDay) {
    value = Math.round(elapsed / msPerHour);
    unit = "hour";
  } else if (elapsed < msPerMonth) {
    value = Math.round(elapsed / msPerDay);
    unit = "day";
  } else if (elapsed < msPerYear) {
    value = Math.round(elapsed / msPerMonth);
    unit = "month";
  } else {
    value = Math.round(elapsed / msPerYear);
    unit = "year";
  }
  return `${otherAfter ? "in " : ""}${value} ${unit}${value === 1 ? "s" : ""}${!otherAfter ? " ago" : ""}`;
}

export function absoluteToRelative(date: Date, now: Date): string {
  let seconds = (now.getTime() - date.getTime()) / 1000;
  const result = [];

  if (seconds > 3600) {
    result.push(Math.floor(seconds / 3600) + "h");
    seconds = seconds % 3600;
  }
  if (seconds > 60) {
    result.push(Math.floor(seconds / 60) + "m");
    seconds = seconds % 60;
  }
  if (seconds > 0) {
    result.push(Math.floor(seconds) + "s");
  }
  if (result.length) {
    return result.join(" ");
  } else {
    return "0 s";
  }
}

/**
 * Checks whether the given value is a string.
 *
 * @param value value to test
 */
export function isString(value: unknown): value is string {
  return Object.prototype.toString.call(value) === "[object String]";
}

/**
 * Return 0 <= i <= array.length such that !pred(array[i - 1]) && pred(array[i]).
 * From Stackoverflow: https://stackoverflow.com/a/41956372
 */
export function binarySearch<T>(array: T[], pred: (value: T) => boolean): number {
  let lo = -1,
    hi = array.length;
  while (1 + lo < hi) {
    const mi = lo + ((hi - lo) >> 1);
    if (pred(array[mi])) {
      hi = mi;
    } else {
      lo = mi;
    }
  }
  return hi;
}

let today = new Date().toLocaleDateString("de-De", { day: "2-digit", month: "2-digit", year: "2-digit" });

setInterval(
  () => (today = new Date().toLocaleDateString("de-De", { day: "2-digit", month: "2-digit", year: "2-digit" })),
  60_000,
);

export function formatDate(date: Date, omitToday = false): string {
  let result = date.toLocaleString("de-De", {
    second: "2-digit",
    minute: "2-digit",
    hour: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
  if (omitToday) {
    result = result.replace(today, "").replace(",", "").trim();
  }
  return result;
}

export function idGenerator() {
  let id = 0;
  return () => {
    id++;
    return id;
  };
}
export function createComputedProperty(propName: string, property: string) {
  return {
    get(): any {
      // @ts-expect-error
      if (!this[propName]) {
        return;
      }
      // @ts-expect-error
      return this[propName][property];
    },
    set(value: any) {
      // @ts-expect-error
      if (!this[propName]) {
        return;
      }
      // @ts-expect-error
      this.$emit("update:" + propName, { ...this[propName], [property]: value });
    },
  };
}

export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export function deepEqual(actual: any, expected: any): boolean {
  if (!!actual !== !!expected) {
    return false;
  }
  if (!!actual === false) {
    return true;
  }
  if (typeof actual !== typeof expected) {
    return false;
  }
  if (actual.toString() !== expected.toString()) {
    return false;
  }

  if (typeof actual === "object") {
    if (actual instanceof Date) {
      if (expected instanceof Date) {
        return actual.getTime() === expected.getTime();
      } else {
        return false;
      }
    } else if (expected instanceof Date) {
      return false;
    }

    const expectedKeys = Object.keys(expected);
    const actualKeys = Object.keys(actual);

    expectedKeys.sort();
    actualKeys.sort();

    for (const key of actualKeys) {
      const index = expectedKeys.indexOf(key);

      // trim expectedKeys
      if (index >= 0) {
        expectedKeys.splice(index, 1);
      }

      const actualValue = actual[key];
      const expectedValue = expected[key];

      if (!deepEqual(actualValue, expectedValue)) {
        return false;
      }
    }

    for (const key of expectedKeys) {
      const actualValue = actual[key];
      const expectedValue = expected[key];

      if (!deepEqual(actualValue, expectedValue)) {
        return false;
      }
    }
    return true;
  } else {
    return actual === expected;
  }
}

export class Logger {
  public readonly prefix: string;

  public constructor(prefix: string) {
    this.prefix = prefix;
  }

  public debug(...args: any[]): void {
    console.debug(`[${new Date().toLocaleString()}] ${this.prefix}:`, ...args);
  }

  public info(...args: any[]): void {
    console.info(`[${new Date().toLocaleString()}] ${this.prefix}:`, ...args);
  }

  public error(...args: any[]): void {
    console.error(`[${new Date().toLocaleString()}] ${this.prefix}:`, ...args);
  }

  public warn(...args: any[]): void {
    console.warn(`[${new Date().toLocaleString()}] ${this.prefix}:`, ...args);
  }

  public log(...args: any[]): void {
    console.log(`[${new Date().toLocaleString()}] ${this.prefix}:`, ...args);
  }
}

export function toArray<T>(value: T[] | T | undefined): T[] {
  if (Array.isArray(value)) {
    return [...value];
  } else if (value) {
    return [value];
  } else {
    return [];
  }
}
