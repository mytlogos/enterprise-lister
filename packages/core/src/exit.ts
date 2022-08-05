import process, { nextTick } from "process";
import { stopStorage } from "./database/storages/storage";
import logger from "./logger";

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
export function gracefulShutdown() {
  const promises: Array<Promise<void>> = [];
  const nowMillis = Date.now();

  registeredHandlers.forEach((value) => {
    const promise = value();
    if (promise) {
      promises.push(promise);
    }
  });

  // let there be enough room to have everything settled before exiting
  Promise.allSettled(promises).finally(() => {
    const timeLeft = Math.max(500, 5000 - (Date.now() - nowMillis));
    logger.info(`Exiting in ${timeLeft}ms`);
    // close the database
    stopStorage()
      .catch(console.log)
      // close logger and wait a bit for all transports to finish before exiting
      .then(() => logger.close())
      .finally(() => {
        // wait at least 500ms but at most 5000ms to exit from now on, depending how much time
        // the listeners already took
        // never use exitCode 0, every exit is more or less an exceptional case
        setTimeout(() => nextTick(() => process.exit(1)), timeLeft);
      });
  });
}
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
