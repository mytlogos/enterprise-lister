import { SimpleMedium, FullMediumToc } from "./siteTypes";

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
    return Math.round(value * (10 ** decimalPlace)) / (10 ** decimalPlace);
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
        medium.title = medium.title || toc.title;
        medium.author = medium.author || toc.author;
        medium.artist = medium.artist || toc.artist;
        medium.countryOfOrigin = medium.countryOfOrigin || toc.countryOfOrigin;
        medium.languageOfOrigin = medium.languageOfOrigin || toc.languageOfOrigin;
        medium.series = medium.series || toc.series;
        medium.universe = medium.universe || toc.universe;
        medium.lang = medium.lang || toc.lang;

        if (medium.medium !== toc.medium) {
            console.warn("toc of different media types, expected: " + medium.medium + ", got: " + toc.medium + " for medium: " + medium.id + ": " + medium.title);
        }
        if (medium.stateTL < toc.stateTL) {
            medium.stateTL = toc.stateTL;
        }
        if (medium.stateOrigin < toc.stateOrigin) {
            medium.stateOrigin = toc.stateOrigin;
        }
    }
    return medium;
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
export const optimizedResize = ((() => {

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
})());

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
    }
    else if (elapsed < msPerHour) {
        value = Math.round(elapsed / msPerMinute);
        unit = "minute";
    }
    else if (elapsed < msPerDay) {
        value = Math.round(elapsed / msPerHour);
        unit = "hour";
    }
    else if (elapsed < msPerMonth) {
        value = Math.round(elapsed / msPerDay);
        unit = "day";
    }
    else if (elapsed < msPerYear) {
        value = Math.round(elapsed / msPerMonth);
        unit = "month";
    }
    else {
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
    let lo = -1, hi = array.length;
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
    () => today = new Date().toLocaleDateString("de-De", { day: "2-digit", month: "2-digit", year: "2-digit" }),
    60_000
);

export function formatDate(date: Date, omitToday = false): string {
    let result = date.toLocaleString(
        "de-De",
        {
            second: "2-digit",
            minute: "2-digit",
            hour: "2-digit",
            day: "2-digit",
            month: "2-digit",
            year: "2-digit"
        }
    );
    if (omitToday) {
        result = result.replace(today, "").replace(",", "").trim();
    }
    return result;
}