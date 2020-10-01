import Vue from "vue";

const bus = new Vue({});

/**
 * Emit an event on the bus, with optional parameter.
 */
export function emitBusEvent(event: string, ...param: any) {
    bus.$emit(event, ...param);
}

/**
 * Listen to events on the bus.
 */
export function onBusEvent(event: string, callback: (...value: any) => void | any) {
    bus.$on(event, (...args: any) => callback(...args));
}
