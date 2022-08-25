import { appEventStorage, notificationStorage } from "./database/storages/storage";
import logger from "./logger";
import { getMainInterface } from "./tools";
import { AppEvent, AppEventProgram } from "./types";
import env from "./env";
import { registerOnExitHandler } from "./exit";

async function ensureAppStatus(program: AppEventProgram, previous?: AppEvent): Promise<AppEvent | undefined> {
  const type = previous ? "end" : "start";

  if (previous && previous.type === "end") {
    previous.date = new Date();
    appEventStorage.updateAppEvent(previous);
  } else {
    return appEventStorage.addAppEvent({
      id: 0,
      date: new Date(),
      program,
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
      return;
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
  private readonly program: AppEventProgram;
  private loopTimeout?: NodeJS.Timeout;

  public constructor(program: AppEventProgram) {
    this.program = program;
  }

  private async requestedExit() {
    this.stop();

    const interfaceIp = getMainInterface() || "unknown";
    await notificationStorage
      .insertNotification({
        title: `"${this.program}" has stopped`,
        content: `An Instance on ${interfaceIp} (${env.development ? "dev" : "prod"}) has stopped`,
        date: new Date(),
        key: "lifecycle-" + this.program,
        type: "stopped",
      })
      .catch((error) => logger.error(error));
  }

  public start(): void {
    if (this.loopTimeout) {
      logger.warn("Calling start on an already started AppStatus Instance.");
      return;
    }
    const interfaceIp = getMainInterface() || "unknown";
    notificationStorage
      .insertNotification({
        title: `"${this.program}" has started`,
        content: `An Instance on ${interfaceIp} (${env.development ? "dev" : "prod"}) has started`,
        date: new Date(),
        key: "lifecycle-" + this.program,
        type: "started",
      })
      .catch((error) => logger.error(error));

    registerOnExitHandler(() => this.requestedExit());
    this.loopTimeout = loop(this.program);
  }

  public stop(): void {
    if (this.loopTimeout) {
      clearInterval(this.loopTimeout);
    }
  }
}
