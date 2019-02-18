import Vue from "vue";
const bus = new Vue({});
/**
 * Emit an event on the bus, with optional parameter.
 */
export function emitBusEvent(event, ...param) {
    bus.$emit(event, ...param);
}
/**
 * Listen to events on the bus.
 */
export function onBusEvent(event, callback) {
    bus.$on(event, (...args) => callback(...args));
}
//# sourceMappingURL=bus.js.map