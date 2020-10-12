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
    return `${otherAfter ? "in ": ""}${value} ${unit}${value === 1 ? "s" : ""}${!otherAfter ? " ago" : ""}`;
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
