import process from "process";

const registeredHandlers = new Set<ExitHandler>();
export type ExitHandler = () => void | Promise<void>;

/**
 * Register an handler on SIGTERM/SIGINT which is executed before exiting.
 * Returned promises will be settled.
 *
 * @param handler handler to execute
 */
export function registerOnExitHandler(handler: ExitHandler) {
  registeredHandlers.add(handler);
}

/**
 * Call every exit handler and exit after all result promises are settled.
 */
function signalHandler() {
  const promises: Array<Promise<void>> = [];
  registeredHandlers.forEach((value) => {
    const promise = value();
    if (promise) {
      promises.push(promise);
    }
  });

  // let there be enough room to have everything settled before exiting
  Promise.allSettled(promises).finally(() => {
    setTimeout(() => process.exit(1), 500);
  });
}

process.on("SIGTERM", signalHandler);
process.on("SIGINT", signalHandler);
