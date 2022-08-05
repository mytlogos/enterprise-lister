import { episodeStorage } from "enterprise-core/dist/database/storages/storage";
import { Id, SmallMediumRelease } from "enterprise-core/dist/types";
import { writeFile } from "fs/promises";

interface ReleasePattern {
  hour: number;
  weekDay: number;
  monthDay: number;
  weekOfMonth: number;
  weekOfYear: [number, number];
  monthOfYear: number;
  events: number;
  indices: number[];
  date: Date;
}

const MILLIS_DAY = 86_400_000;
const MILLIS_HOUR = 60000;

function localeMidnight(date: Date) {
  return new Date(Math.floor(date.getTime() / MILLIS_DAY) * MILLIS_DAY + date.getTimezoneOffset() * MILLIS_HOUR);
}

function getDaily(values: SmallMediumRelease[]) {
  let lastDate: Date | undefined;
  const sameDayUpdates = new Map<number, number>();
  let dailyUpdatesCount = 0;
  let inspected = 0;

  for (let index = values.length - 1; index > 0 && inspected <= 20; index--) {
    const release = values[index];

    const midnight = localeMidnight(release.releaseDate);

    if (!lastDate) {
      lastDate = midnight;
      continue;
    }

    // skip same day updates, but remember them
    if (lastDate.getTime() === midnight.getTime()) {
      sameDayUpdates.set(lastDate.getTime(), (sameDayUpdates.get(lastDate.getTime()) || 1) + 1);
      continue;
    }

    const diff = Math.abs(lastDate.getTime() - midnight.getTime());
    if (diff === MILLIS_DAY) {
      dailyUpdatesCount++;
    }
    lastDate = midnight;
    inspected++;
  }
  // allow five outliers, but the rest must match
  console.log(dailyUpdatesCount, sameDayUpdates);
  return dailyUpdatesCount > 15;
}

export async function predictNextRelease(mediumId: Id): Promise<void> {
  // already guaranteed to be sorted from earliest to latest
  const releases = await episodeStorage.getSmallMediumReleases(mediumId);
  const patterns: ReleasePattern[] = [];
  const diffs: number[] = [];
  const occurrences = {
    hour: {} as Record<number, number>,
    weekDay: {} as Record<number, number>,
    monthDay: {} as Record<number, number>,
    weekOfMonth: {} as Record<number, number>,
    weekOfYear: {} as Record<number, number>,
    monthOfYear: {} as Record<number, number>,
  };

  const result = getDaily(releases);

  releases.forEach((release) => {
    const date = release.releaseDate;
    const pattern: ReleasePattern = {
      hour: date.getHours(),
      weekDay: date.getDay() + 1,
      monthDay: date.getDate(),
      weekOfMonth: getWeekOfMonth(date),
      weekOfYear: getWeekNumber(date),
      monthOfYear: date.getMonth(),
      events: 1,
      indices: [release.combiIndex],
      date,
    };

    const previous = patterns[patterns.length - 1];

    if (previous) {
      const diff = date.getTime() - previous.date.getTime();

      // a diff greater than a hour
      if (diff > 1000 * 3600) {
        diffs.push(diff);
      }
    }

    if (
      previous &&
      previous.hour === pattern.hour &&
      previous.monthDay === pattern.monthDay &&
      previous.weekOfYear[0] === pattern.weekOfYear[0] &&
      previous.weekOfYear[1] === pattern.weekOfYear[1]
    ) {
      previous.indices.push(release.combiIndex);
      return;
    }

    occurrences.hour[pattern.hour] = (occurrences.hour[pattern.hour] || 0) + 1;
    occurrences.weekDay[pattern.weekDay] = (occurrences.weekDay[pattern.weekDay] || 0) + 1;
    occurrences.monthDay[pattern.monthDay] = (occurrences.monthDay[pattern.monthDay] || 0) + 1;
    occurrences.weekOfMonth[pattern.weekOfMonth] = (occurrences.weekOfMonth[pattern.weekOfMonth] || 0) + 1;
    occurrences.weekOfYear[pattern.weekOfYear[1]] = (occurrences.weekOfYear[pattern.weekOfYear[1]] || 0) + 1;
    occurrences.monthOfYear[pattern.monthOfYear] = (occurrences.monthOfYear[pattern.monthOfYear] || 0) + 1;
    patterns.push(pattern);
  });

  const [filtered, outlier] = (() => {
    // eslint-disable-next-line @typescript-eslint/require-array-sort-compare
    const sorted = [...diffs].sort();
    function getMedian(list: number[]) {
      let median: number;
      let lowerMidIndex;
      let upperMidIndex;

      if (sorted.length % 2) {
        lowerMidIndex = Math.floor(list.length / 2);
        upperMidIndex = lowerMidIndex + 1;
        median = (list[lowerMidIndex] + list[upperMidIndex]) / 2;
      } else {
        lowerMidIndex = Math.floor(list.length / 2) + 1;
        upperMidIndex = lowerMidIndex;
        median = list[lowerMidIndex];
      }
      return [median, lowerMidIndex, upperMidIndex];
    }
    const [median, lowerIndex, upperIndex] = getMedian(sorted);
    const [firstQuartile] = getMedian(sorted.slice(0, lowerIndex));
    const [thirdQuartile] = getMedian(sorted.slice(upperIndex + 1));
    const interQuartilRange = thirdQuartile - firstQuartile;
    const upperFence = thirdQuartile + 1.5 * interQuartilRange;
    const lowerFence = firstQuartile - 1.5 * interQuartilRange;

    console.log("median: %d, Q1: %d, Q3: %d", median, firstQuartile, thirdQuartile);
    const outlier: number[] = [];
    return [
      diffs.filter((value) => {
        if (value >= upperFence || value <= lowerFence) {
          outlier.push(value);
          return false;
        }
        return true;
      }),
      outlier,
    ];
  })();

  const xValues = Array.from(new Array(diffs.length), (_v, index) => index);
  const regression = linearRegression(diffs.slice(-10), xValues.slice(-10));

  await writeFile(
    "./regression.csv",
    diffs.map((value, index) => index + "," + value.toString() + "\n"),
  );

  console.log(patterns.map((value) => JSON.stringify(value)).slice(-10));
  console.log(regression);
  const totalTimeMillisToNextRelease = regression.slope * diffs.length + regression.intercept;
  const nextRelease = new Date(releases[releases.length - 1].releaseDate.getTime() + totalTimeMillisToNextRelease);
  console.log("Releases: %d, Patterns: %d, Diffs: %d", releases.length, patterns.length, diffs.length);
  const average = diffs.slice(-10).reduce((previous, current) => previous + current) / 10;

  console.log("outlier", outlier);
  console.log(
    "diffs",
    linearRegression(
      diffs,
      Array.from(new Array(diffs.length), (_v, index) => index),
    ),
  );
  console.log(
    "diffs-10",
    linearRegression(
      diffs.slice(-10),
      Array.from(new Array(diffs.slice(-10).length), (_v, index) => index),
    ),
  );
  console.log(
    "filtered",
    linearRegression(
      filtered,
      Array.from(new Array(filtered.length), (_v, index) => index),
    ),
  );
  console.log(
    "filtered-10",
    linearRegression(
      filtered.slice(-10),
      Array.from(new Array(10), (_v, index) => index),
    ),
  );

  console.log(
    diffs.slice(-10).reduce((previous, current) => previous + current) / 10,
    releases.slice(-10).map((v) => JSON.stringify(v)),
    totalTimeMillisToNextRelease,
    nextRelease,
    new Date(releases[releases.length - 1].releaseDate.getTime() + average),
  );
}

/**
 * Modified from https://stackoverflow.com/a/31566791/9492864
 *
 * @param y y values
 * @param x x values
 * @returns regression
 */
function linearRegression(y: number[], x: number[]): { slope: number; intercept: number; r2: number } {
  const n = y.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  let sumYY = 0;

  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumXX += x[i] * x[i];
    sumYY += y[i] * y[i];
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  return {
    slope,
    intercept: (sumY - slope * sumX) / n,
    r2: Math.pow((n * sumXY - sumX * sumY) / Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY)), 2),
  };
}

/* For a given date, get the ISO week number
 *
 * Based on information at:
 *
 *    THIS PAGE (DOMAIN EVEN) DOESN'T EXIST ANYMORE UNFORTUNATELY
 *    http://www.merlyn.demon.co.uk/weekcalc.htm#WNR
 *
 * Algorithm is to find nearest thursday, it's year
 * is the year of the week number. Then get weeks
 * between that date and the first day of that year.
 *
 * Note that dates in one year can be weeks of previous
 * or next year, overlap is up to 3 days.
 *
 * e.g. 2014/12/29 is Monday in week  1 of 2015
 *      2012/1/1   is Sunday in week 52 of 2011
 */
function getWeekNumber(date: Date): [number, number] {
  // Copy date so don't modify original
  date = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Set to nearest Thursday: current date + 4 - current day number
  // Make Sunday's day number 7
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  // Get first day of year
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  // Calculate full weeks to nearest Thursday
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  // Return array of year and week number
  return [date.getUTCFullYear(), weekNo];
}

/**
 * https://stackoverflow.com/a/50476817/9492864
 */
function getWeekOfMonth(date: Date): number {
  const startWeekDayIndex = 1; // 1 MonthDay 0 Sundays
  const firstDate = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstDay = firstDate.getDay();

  let weekNumber = Math.ceil((date.getDate() + firstDay) / 7);
  if (startWeekDayIndex === 1) {
    if (date.getDay() === 0 && date.getDate() > 1) {
      weekNumber -= 1;
    }

    if (firstDate.getDate() === 1 && firstDay === 0 && date.getDate() > 1) {
      weekNumber += 1;
    }
  }
  return weekNumber;
}
