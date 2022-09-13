import { AppEvent, AppEventType } from "enterprise-core/dist/types";
import { startStorage, jobStorage, appEventStorage } from "enterprise-core/dist/database/storages/storage";

const events = [] as AppEvent[];
const promises = [] as Array<Promise<void>>;

async function main(): Promise<void> {
  startStorage();
  events.push(...(await appEventStorage.getAppEvents()));
  await complete();
}

function toString(value: number): string {
  return new Date(value).toISOString().slice(0, -5) + "Z";
}

function pad(value: number): string {
  if (value < 10) {
    return " " + value;
  } else {
    return value + "";
  }
}

function secondsToString(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60) % 60;
  const leftoverSeconds = seconds % 60;
  return `${pad(hours)} h ${pad(minutes)} m ${pad(leftoverSeconds)} s`;
}

function reportToConsole(start: number, lastDate: number): void {
  const durationSeconds = (lastDate - start) / 1000;
  console.log(
    "Start: " +
      toString(start) +
      ", End: " +
      toString(lastDate) +
      ", Duration: " +
      secondsToString(durationSeconds) +
      ", " +
      durationSeconds +
      "s",
  );
}

function create(type: AppEventType, date: number): Promise<void> {
  if (events.find((event) => event.date.getTime() === date)) {
    return Promise.resolve();
  }
  return appEventStorage
    .addAppEvent({
      id: 0,
      date: new Date(date),
      program: "crawler",
      type,
    })
    .then(() => undefined);
}

function reportToDatabase(start: number, lastDate: number): void {
  promises.push(create("start", start));
  promises.push(create("end", lastDate));
}

async function complete() {
  const jobs = await jobStorage.getJobHistory();

  let start: undefined | number;
  let lastDate = 0;
  let count = 0;
  const maxDiff = 1000 * 3600; // at most a hour difference

  jobs.forEach((value) => {
    const time = value.start.getTime();

    if (!start) {
      start = time;
      lastDate = time;
    } else {
      const diff = time - (lastDate || 0);

      if (diff > maxDiff) {
        count++;
        reportToConsole(start, lastDate);
        reportToDatabase(start, lastDate);
        start = time;
      }
      lastDate = time;
    }
  });
  console.log("Count: " + count);
  await Promise.allSettled(promises);
  process.exit(0);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function streamed() {
  const jobs = await jobStorage.getJobHistoryStream(new Date(), -1);

  let start: undefined | number;
  let lastDate = 0;
  let count = 0;
  const maxDiff = 1000 * 3600; // at most a hour difference

  jobs.on("result", (value) => {
    if (!value.start?.getTime) {
      console.log(value);
      return;
    }
    const time = value.start.getTime();

    if (!start) {
      start = time;
      lastDate = time;
    } else {
      const diff = time - (lastDate || 0);

      if (diff > maxDiff) {
        count++;
        reportToConsole(start, lastDate);
        reportToDatabase(start, lastDate);
        start = time;
      }
      lastDate = time;
    }
  });
  jobs.on("end", async () => {
    console.log("Count: " + count);
    await Promise.allSettled(promises);
    process.exit(0);
  });
}

main();
