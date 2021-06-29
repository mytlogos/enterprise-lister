import { appEventStorage } from "./database/storages/storage";
import logger from "./logger";
import { AppEvent, AppEventProgram } from "./types";

async function ensureAppStatus(program: AppEventProgram, previous?: AppEvent): Promise<AppEvent | undefined> {
  const type = previous ? "end" : "start";

  if (previous && previous.type === "end") {
    previous.date = new Date();
    appEventStorage.updateAppEvent(previous);
  } else {
    return appEventStorage.addAppEvent({
      id: 0,
      date: new Date(),
      program: program,
      type,
    });
  }
}

/**
 * Updates the Status of the Program in the Storage every minute.
 * (Whether it ended or not).
 *
 * @param program program name
 * @returns the timeout id of the interval
 */
function loop(program: AppEventProgram): NodeJS.Timeout {
  let previous: AppEvent | undefined;
  let active = false;

  return setInterval(() => {
    if (active) {
      logger.warn("Previous tick did not yet finish");
    }
    active = true;
    ensureAppStatus(program, previous)
      .then((newEvent) => {
        if (newEvent) {
          previous = newEvent;
        }
      })
      .catch(logger.error)
      .finally(() => (active = false));
  }, 1000 * 60);
}

export class AppStatus {
  private program: AppEventProgram;
  private loopTimeout?: NodeJS.Timeout;

  public constructor(program: AppEventProgram) {
    this.program = program;
  }

  public start(): void {
    if (this.loopTimeout) {
      logger.warn("Calling start on an already started AppStatus Instance.");
      return;
    }
    this.loopTimeout = loop(this.program);
  }

  public stop(): void {
    if (this.loopTimeout) {
      clearInterval(this.loopTimeout);
    }
  }
}
