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