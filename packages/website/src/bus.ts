import mitt from "mitt";

const bus = mitt();

/**
 * Emit an event on the bus, with optional parameter.
 */
export function emitBusEvent(event: string, param?: any): void {
  bus.emit(event, param);
}

/**
 * Listen to events on the bus.
 */
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
export function onBusEvent(event: string, callback: (...value: any) => void | any): void {
  // eslint-disable-next-line n/no-callback-literal
  bus.on(event, (...args: any) => callback(...args));
}
