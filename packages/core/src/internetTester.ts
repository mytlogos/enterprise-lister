import EventEmitter from "events";
import { registerOnExitHandler } from "./exit";
import * as dns from "dns";
import { setTimeout as setTimeoutPromise } from "timers/promises";

export interface InternetTester extends EventEmitter.EventEmitter {
  on(evt: "online" | "offline", listener: (previousSince: Date) => void): this;

  isOnline(): boolean;

  stop(): void;

  start(): void;
}

class InternetTesterImpl extends EventEmitter.EventEmitter implements InternetTester {
  private offline?: boolean = undefined;
  private since: Date = new Date();
  private stopLoop = false;

  public on(evt: "online" | "offline", listener: (previousSince: Date) => void): this {
    super.on(evt, listener);

    if (this.offline != null && this.since != null) {
      if (this.offline && evt === "offline") {
        listener(this.since);
      }
      if (!this.offline && evt === "online") {
        listener(this.since);
      }
    }
    return this;
  }

  public isOnline() {
    return !this.offline;
  }

  public start() {
    this.stopLoop = false;
    // should never call catch callback
    this.checkInternet().catch(console.error);
  }

  public stop() {
    this.stopLoop = true;
  }

  private async checkInternet() {
    while (!this.stopLoop) {
      try {
        await dns.promises.lookup("google.com");
        if (this.offline || this.offline == null) {
          this.offline = false;
          const since = new Date();
          this.emit("online", this.since);
          this.since = since;
        }
      } catch (e) {
        if (!this.offline) {
          this.offline = true;
          const since = new Date();
          this.emit("offline", this.since);
          this.since = since;
        }
      }
      await setTimeoutPromise(1000);
    }
  }
}

registerOnExitHandler(() => internetTester.stop());
export const internetTester: InternetTester = new InternetTesterImpl();
