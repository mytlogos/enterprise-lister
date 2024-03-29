import {
  EpisodeRelease,
  MultiSingle,
  Uuid,
  PromiseMultiSingle,
  Unpack,
  UnpackArray,
  Optional,
  Nullable,
  Indexable,
  ExtractedIndex,
  NetworkTrack,
} from "./types";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import emojiRegex from "emoji-regex";
import * as fs from "fs";
import * as path from "path";
import { Query } from "mysql";
import { validate as validateUuid } from "uuid";
import { isNumber } from "validate.js";
import { setTimeout as setTimeoutPromise } from "timers/promises";
import { ParseError, ValidationError } from "./error";
import { networkInterfaces } from "os";

export function isAbortError(error: unknown): error is Error {
  return error instanceof Error && error.name === "AbortError";
}

export function isNumberOrArray(value: number | any[]): boolean {
  return Array.isArray(value) ? !!value.length : Number.isInteger(value);
}

export function isInvalidId(id: unknown): boolean {
  return !Number.isInteger(id) || (id as number) < 1;
}

export function toArray(value: string): Nullable<any[]> {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

export function isInvalidSimpleMedium(value: unknown): boolean {
  if (typeof value !== "object" || !value) {
    return true;
  }
  const medium = value as any;

  return (
    medium.title == null ||
    !isString(medium.title) ||
    // valid medium types are 1-8
    !Number.isInteger(medium.medium) ||
    medium.medium < 1 ||
    medium.medium > 8
  );
}

export function remove<T>(array: T[], item: T): boolean {
  const index = array.indexOf(item);
  if (index < 0) {
    return false;
  }
  array.splice(index, 1);
  return true;
}

export function removeLike<T>(array: T[], equals: (item: T) => boolean): boolean {
  const index = array.findIndex((value) => equals(value));
  if (index < 0) {
    return false;
  }
  array.splice(index, 1);
  return true;
}

export type ArrayCallback<T> = (value: T, index: number) => void;

export function forEachArrayLike<T>(arrayLike: ArrayLike<T>, callback: ArrayCallback<T>, start = 0): void {
  for (let i = start; i < arrayLike.length; i++) {
    callback(arrayLike[i], i);
  }
}

type multiSingleCallback<T, R> = (value: T, index?: number, last?: boolean) => R | Promise<R>;

export function promiseMultiSingle<T, R>(
  item: T,
  cb: multiSingleCallback<Unpack<T>, R>,
): PromiseMultiSingle<T, Unpack<R>> {
  if (typeof cb !== "function") {
    return Promise.reject(new TypeError(`callback is not a function: '${cb + ""}'`)) as any;
  }
  if (Array.isArray(item)) {
    const maxIndex = item.length - 1;
    // @ts-expect-error
    return Promise.all(item.map((value: T, index) => Promise.resolve(cb(value, index, index < maxIndex))));
  }
  return new Promise((resolve, reject) => {
    try {
      // @ts-expect-error
      resolve(cb(item, 0, false));
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Calls the callback on the parameter item or on all elements of item if item is an Array.
 * Returns the return Value of the Callback as a normal value (if item is no Array) or an Array of return Values
 * if item is an Array.
 *
 * @param item value to act on
 * @param cb function to be called on a single or multiple values
 */
export function multiSingle<T, R>(item: T, cb: multiSingleCallback<UnpackArray<T>, R>): MultiSingle<T, R> {
  if (Array.isArray(item)) {
    const maxIndex = item.length - 1;
    // @ts-expect-error
    return item.map((value, index) => cb(value, index, index >= maxIndex));
  }
  // @ts-expect-error
  return cb(item, 0, true);
}

/**
 * Appends one or multiple items to the end of the array.
 * It does not append a null-ish item parameter, except when allowNull is true.
 *
 * @param array array to push the values to
 * @param item item or items to add to the array
 * @param allowNull if a null-ish item value can be added to the array
 */
export function addMultiSingle<T>(array: T[], item: T | T[], allowNull?: boolean): void {
  if (item != null || allowNull) {
    if (Array.isArray(item)) {
      array.push(...item);
    } else {
      array.push(item);
    }
  }
}

/**
 * Removes the first occurrence of one or multiple items from the array.
 * It does not remove a null-ish item parameter, except when allowNull is true.
 *
 * @param array array to remove the values from
 * @param item item or items to remove from the array
 * @param allowNull if a null-ish item value can be removed from the array
 */
export function removeMultiSingle<T>(array: T[], item: T | T[], allowNull?: boolean): void {
  if (item != null || allowNull) {
    if (Array.isArray(item)) {
      item.forEach((value) => remove(array, value));
    } else {
      remove(array, item);
    }
  }
}

/**
 * Return the value mapped to the key in the map.
 * If no such non-null-ish value exists, a new value is generated
 * from the callback, mapped to the key and returned instead.
 *
 * @param map map to modify
 * @param key a key value for the map
 * @param valueCb value supplier if no non-null-ish value is mapped to the key
 */
export function getElseSet<K, V>(map: Map<K, V>, key: K, valueCb: () => V): V {
  let value = map.get(key);
  if (value == null) {
    value = valueCb();
    map.set(key, value);
  }
  return value;
}

export function getElseSetObj<K extends string | number, V>(map: Record<K, V>, key: K, valueCb: () => V): V {
  let value: V = map[key];
  if (value == null) {
    map[key] = value = valueCb();
  }
  return value;
}

/**
 * Returns an Array of unique values.
 * If no callback is provided, the set-equality is used.
 * The Order of elements is preserved, with the first occurrence
 * being preserved.
 *
 * @param array array to filter all duplicates out
 * @param isEqualCb alternative predicate determining if two values are equal
 */
export function unique<T>(array: ArrayLike<T>, isEqualCb?: (value: T, other: T) => boolean): T[] {
  const uniques: T[] = [];

  if (isEqualCb) {
    forEachArrayLike(array, (value, index) => {
      const notUnique = some(array, (otherValue) => isEqualCb(value, otherValue), 0, index);

      if (notUnique) {
        return;
      }
      uniques.push(value);
    });
  } else {
    const set = new Set<T>();
    forEachArrayLike(array, (value) => {
      if (!set.has(value)) {
        set.add(value);
        uniques.push(value);
      }
    });
  }
  return uniques;
}

/**
 * Test whether a single Element of the Array-Like Object satisfies the condition of the predicate.
 * If the startIndex is greater or equal to the endIndex, it returns false.
 *
 * @param array array-like object to test on
 * @param predicate condition to test
 * @param start startIndex of the search (inclusively), a number greater than zero
 * @param end endIndex of the search (exclusively), a number smaller or equal to the length of the array-like
 */
export function some<T>(array: ArrayLike<T>, predicate: Predicate<T>, start = 0, end = array.length): boolean {
  if (start < 0 || end > array.length) {
    throw RangeError(`Invalid Search Range, Valid: 0-${array.length}, Given: ${start}-${end}`);
  }

  for (let i = start; i < end; i++) {
    if (predicate(array[i], i)) {
      return true;
    }
  }
  return false;
}

const apostrophe = /['´`’′‘]/g;

/**
 * Test whether two string are equal to each other (case-insensitive), irregardless
 * which version of apostrophes or look alikes are used.
 *
 * @param s1 string to test
 * @param s2 other string to test
 */
export function equalsIgnore(s1: string, s2: string): boolean {
  if (apostrophe.test(s1)) {
    s1 = s1.replace(apostrophe, "");
  }
  if (apostrophe.test(s2)) {
    s2 = s2.replace(apostrophe, "");
  }
  return s1.localeCompare(s2, undefined, { sensitivity: "base" }) === 0;
}

/**
 * Test whether the first string contains the other string, irregardless
 * which version of apostrophes or look alikes or case is used.
 *
 * @param s1 string to test
 * @param s2 other string to test
 */
export function contains(s1: string, s2: string): boolean {
  s1 = s1.replace(apostrophe, "");
  s2 = s2.replace(apostrophe, "");
  return s1.toLocaleLowerCase().includes(s2.toLocaleLowerCase());
}

/**
 * Counts the number of time each element in an array occurs.
 *
 * @param array array to count the value occurrences of
 */
export function countOccurrence<T>(array: T[]): Map<T, number> {
  const occurrenceMap: Map<T, number> = new Map();
  for (const value of array) {
    const counted = occurrenceMap.get(value) ?? 0;
    occurrenceMap.set(value, counted + 1);
  }
  return occurrenceMap;
}

export type Predicate<T> = (value: T, index: number) => boolean;

export function count<T>(array: T[], condition: Predicate<T>): number {
  let countNumber = 0;
  for (let i = 0; i < array.length; i++) {
    if (condition(array[i], i)) {
      countNumber++;
    }
  }
  return countNumber;
}

export type Comparator<T> = (previous: T, current: T) => number;

function createComparator<T>(key: keyof T): Comparator<T> {
  // @ts-expect-error
  return (previousValue: T, currentValue: T) => previousValue[key] - currentValue[key];
}

/**
 * Returns the biggest Element in the Array according to the given comparator.
 * If given a field comparator (string key of an element), it is searched according to the natural
 * order of the property.
 * If given a value comparator (function), it searches according to the natural order
 * of the result of the value comparator.
 *
 * @param array array to inspect
 * @param comparator field comparator or value comparator to compare values with
 */
export function max<T>(array: T[], comparator: keyof T | Comparator<T>): Optional<T> {
  if (!array.length) {
    return;
  }
  const comparatorFunction: Comparator<T> = isString(comparator)
    ? createComparator(comparator as keyof T)
    : (comparator as Comparator<T>);

  return array.reduce((previousValue, currentValue) => {
    return comparatorFunction(previousValue, currentValue) < 0 ? currentValue : previousValue;
  });
}

/**
 * Returns the biggest Element in the array according to their own
 * natural order.
 * To work correctly, the elements need to be comparable by the "<" operator.
 *
 * @param array array to inspect
 */
export function maxValue<T>(array: T[]): Optional<T> {
  if (!array.length) {
    return;
  }
  return array.reduce((previousValue, currentValue) => {
    return previousValue < currentValue ? currentValue : previousValue;
  });
}

/**
 * Returns the smallest Element in the array according to their own
 * natural order.
 * To work correctly, the elements need to be comparable by the "<" operator.
 *
 * @param array array to inspect
 */
export function minValue<T>(array: T[]): Optional<T> {
  if (!array.length) {
    return;
  }
  return array.reduce((previousValue, currentValue) => {
    return previousValue > currentValue ? currentValue : previousValue;
  });
}

/**
 * Returns the smallest Element in the Array according to the given comparator.
 * If given a field comparator (string key of an element), it is searched according to the natural
 * order of the property.
 * If given a value comparator (function), it searches according to the natural order
 * of the result of the value comparator.
 *
 * @param array array to inspect
 * @param comparator field comparator or value comparator to compare values with
 */
export function min<T>(array: T[], comparator: keyof T | Comparator<T>): Optional<T> {
  if (!array.length) {
    return;
  }

  const comparatorFunction: Comparator<T> = isString(comparator)
    ? createComparator(comparator as keyof T)
    : (comparator as Comparator<T>);

  return array.reduce((previousValue, currentValue) => {
    return comparatorFunction(previousValue, currentValue) < 0 ? previousValue : currentValue;
  });
}

/**
 * Parses a string of relative Time to a absolute Date relative to
 * the time of calling.
 * The relative words are expected to be in english (seconds, minutes etc.).
 * Returns null if it does not match the expected pattern.
 *
 * @param relative string to parse to a absolute time
 */
export function relativeToAbsoluteTime(relative: string): Nullable<Date> {
  let exec: Nullable<string[]> = /\s*(\d+|an?)\s+(\w+)(\s+(ago))?\s*/i.exec(relative);
  if (!exec) {
    if (!relative || relative.toLowerCase() !== "just now") {
      return null;
    }
    exec = ["", "30", "s"];
  }
  const [, value, unit] = exec;
  const absolute = new Date();
  const timeValue = value?.match("an?") ? 1 : Number(value);

  // should not happen?
  if (Number.isNaN(timeValue)) {
    throw new TypeError(`'${value}' is not a number`);
  }

  if (/^(s|secs?|seconds?)$/.test(unit)) {
    absolute.setSeconds(absolute.getSeconds() - timeValue);
  } else if (/^(mins?|minutes?)$/.test(unit)) {
    absolute.setMinutes(absolute.getMinutes() - timeValue);
  } else if (/^(hours?|hr)$/.test(unit)) {
    absolute.setHours(absolute.getHours() - timeValue);
  } else if (/^(days?)$/.test(unit)) {
    absolute.setDate(absolute.getDate() - timeValue);
  } else if (/^(weeks?)$/.test(unit)) {
    absolute.setDate(absolute.getDate() - 7 * timeValue);
  } else if (/^(months?)$/.test(unit)) {
    absolute.setMonth(absolute.getMonth() - timeValue);
  } else if (/^(years?)$/.test(unit)) {
    absolute.setFullYear(absolute.getFullYear() - timeValue);
  } else {
    throw new ParseError(`unknown time unit: '${unit}'`);
  }
  return absolute;
}

/**
 * Node.js 16 introduced stable promise timers api.
 * Now delay is only an alias for setTimeout.
 *
 * @param timeout time to delay the promise
 */
export const delay = setTimeoutPromise;

/**
 * Tests whether two releases should be equal.
 * This equality ignores the releaseDate attribute.
 *
 * @param firstRelease first release
 * @param secondRelease second release
 */
export function equalsRelease(firstRelease?: EpisodeRelease, secondRelease?: EpisodeRelease): boolean {
  return (
    // eslint-disable-next-line eqeqeq
    firstRelease == secondRelease ||
    (!!firstRelease &&
      !!secondRelease &&
      firstRelease.url === secondRelease.url &&
      firstRelease.episodeId === secondRelease.episodeId &&
      firstRelease.tocId === secondRelease.tocId &&
      !!firstRelease.locked === !!secondRelease.locked &&
      // tslint:disable-next-line:triple-equals
      // eslint-disable-next-line eqeqeq
      firstRelease.sourceType == secondRelease.sourceType &&
      firstRelease.title === secondRelease.title)
  );
}

/**
 * Stringifies an object.
 * Replaces all occurrences of an object except the first one
 * with the string "[circular reference]".
 *
 * @param object object to stringify
 */
export function stringify(object: unknown): string {
  const seen = new WeakSet();
  return JSON.stringify(object, (key, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return "[circular reference]";
      }
      seen.add(value);
    }
    return jsonReplacer(key, value);
  });
}

export function jsonReplacer(key: unknown, value: unknown): unknown {
  if (value instanceof Error) {
    const error: any = {};

    Object.getOwnPropertyNames(value).forEach((errorKey) => {
      // @ts-expect-error
      error[errorKey] = value[errorKey];
    });

    return error;
  } else if (value instanceof Map) {
    const map: any = {};
    for (const [k, v] of value.entries()) {
      map[JSON.stringify(k)] = v;
    }
    return map;
  }
  return value;
}

const emojiReplaceRegex = emojiRegex();

/**
 * Wrapper for Emoji-Regex.
 *
 * @param s string to strip
 * @returns stripped string
 */
export function emojiStrip(s: string): string {
  return s.replace(emojiReplaceRegex, "");
}

/**
 * Sanitizes a given string.
 * Removes any unicode emojis.
 * Removes any excess whitespace at the front and at the end.
 * Normalizes multiple whitespaces into a single one.
 *
 * @param s string to sanitize
 */
export function sanitizeString(s: string): string {
  if (!s) {
    return s;
  }
  return s.replace(emojiReplaceRegex, "").trim().replace(/\s+/g, " ");
}

/**
 * Checks whether the given value is a string.
 *
 * @param value value to test
 */
export function isString(value: unknown): value is string {
  return Object.prototype.toString.call(value) === "[object String]";
}

/**
 * Parses a string to an array of numbers.
 * It is expected that the string has a format
 * of "[<number>,...]". Any values that could not be parsed
 * are not a number or are falsy are filtered out.
 *
 * @param s string to parse
 */
export function stringToNumberList(s: string): number[] {
  s = s.trim();
  if (!s.startsWith("[") || !s.endsWith("]")) {
    return [];
  }
  return s
    .split(/[[\],]/)
    .map((value: any) => Number(value))
    .filter((value: number) => !Number.isNaN(value) && value);
}

interface Hash {
  salt?: string;
  hash: string;
}

export interface Hasher {
  tag: string;

  hash(text: string, saltLength?: number): Promise<Hash>;

  equals(text: string, hash: string, salt: string): Promise<boolean>;
}

interface ShaHasher extends Hasher {
  innerHash(text: string, salt: string): string;
}

export const ShaHash: ShaHasher = {
  tag: "sha512",

  hash(text: string, saltLength = 20): Promise<{ salt: string; hash: string }> {
    return promisify(() => {
      if (!Number.isInteger(saltLength)) {
        throw TypeError(`'${saltLength}' not an integer`);
      }
      const salt = crypto
        .randomBytes(Math.ceil(saltLength / 2))
        .toString("hex") // convert to hexadecimal format
        .slice(0, saltLength); // return required number of characters */
      return { salt, hash: this.innerHash(text, salt) };
    });
  },

  innerHash(text, salt) {
    if (!isString(text)) {
      throw TypeError(`'${text + ""}' not a string`);
    }
    if (!isString(salt)) {
      throw TypeError(`'${salt + ""}' not a string`);
    }
    const hash = crypto.createHash("sha512");
    hash.update(salt + text);
    return hash.digest("hex");
  },

  /**
   * Checks whether the text hashes to the same hash.
   */
  equals(text, hash, salt) {
    return promisify(() => this.innerHash(text, salt) === hash);
  },
};
export const Md5Hash: Hasher = {
  tag: "md5",

  hash(text: string) {
    return promisify(() => {
      if (!isString(text)) {
        throw TypeError(`'${text + ""}' not a string`);
      }
      const newsHash = crypto.createHash("md5").update(text).digest("hex");
      return { hash: newsHash };
    });
  },

  /**
   * Checks whether the text hashes to the same hash.
   */
  equals(text, hash) {
    return this.hash(text).then((hashValue) => hashValue.hash === hash);
  },
};
export const BcryptHash: Hasher = {
  tag: "bcrypt",

  hash(text) {
    return bcrypt.hash(text, 10).then((hash) => {
      return { salt: undefined, hash };
    });
  },

  /**
   * Checks whether the text hashes to the same hash.
   *
   * @param {string} text
   * @param {string} hash
   * @return boolean
   */
  equals(text, hash) {
    return bcrypt.compare(text, hash);
  },
};
export const Hashes: Hasher[] = [ShaHash, Md5Hash, BcryptHash];

export enum Errors {
  USER_EXISTS_ALREADY = "USER_EXISTS_ALREADY",
  INVALID_INPUT = "INVALID_INPUT",
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  INVALID_DATA = "INVALID_DATA",
  USER_DOES_NOT_EXIST = "USER_DOES_NOT_EXIST",
  CORRUPT_DATA = "CORRUPT_DATA",
  UNKNOWN = "UNKNOWN",
  INVALID_MESSAGE = "INVALID_MESSAGE",
  INVALID_SESSION = "INVALID_SESSION",
  DOES_NOT_EXIST = "DOES_NOT_EXIST",
  UNSUCCESSFUL = "UNSUCCESSFUL",
}

/**
 * Checks if the given error value has the same value
 * as one of the Errors member.
 *
 * @param error value to check
 */
export const isError = (error: unknown): boolean => {
  // @ts-expect-error
  return Object.values(Errors).includes(error);
};

export enum MediaType {
  TEXT = 0x1,
  AUDIO = 0x2,
  VIDEO = 0x4,
  IMAGE = 0x8,
}
/**
 * Check whether the given container has the given flag activated.
 *
 * @param container value to check
 * @param testFor flag which should be tested for
 */
export function hasMediaType(container: number, testFor: MediaType): boolean {
  return (container & testFor) === testFor;
}

/**
 * Returns a MediaType flag with all available flags activated.
 */
export function allTypes(): number {
  return (
    (Object.values(MediaType) as number[]).reduce((previousValue, currentValue) => previousValue | currentValue) || 0
  );
}

export function promisify<T>(callback: () => T): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    try {
      resolve(callback());
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Combines an object with totalIndex and partialIndex, the part before
 * and after the decimal point, to a single number.
 *
 * Example:
 * combiIndex({ totalIndex: 1 }) === 1
 * combiIndex({ totalIndex: 1, partialIndex: 0 }) === 1
 * combiIndex({ totalIndex: 1, partialIndex: 5}) === 1.5
 *
 * @param value object to combine
 */
export function combiIndex(value: Indexable): number {
  const combi = Number(`${value.totalIndex}.${value.partialIndex || 0}`);
  if (Number.isNaN(combi)) {
    throw new ParseError(`invalid argument: total: '${value.totalIndex}', partial: '${value.partialIndex + ""}'`);
  }
  return combi;
}

/**
 * Checks whether the indices on the given object are valid.
 * A totalIndex is greater or equal to -1 and an integer.
 * A partialIndex may be undefined|null, but should not be smaller than zero or not an integer.
 *
 * @param value value to check the Indices from
 */
export function checkIndices(value: Indexable): void {
  if (value.totalIndex == null || value.totalIndex < -1 || !Number.isInteger(value.totalIndex)) {
    throw new ValidationError("invalid toc content, totalIndex invalid");
  }
  if (value.partialIndex != null && (value.partialIndex < 0 || !Number.isInteger(value.partialIndex))) {
    throw new ValidationError("invalid toc content, partialIndex invalid");
  }
}

export function extractIndices(
  groups: string[],
  allPosition: number,
  totalPosition: number,
  partialPosition: number,
): Nullable<ExtractedIndex> {
  const whole = Number(groups[allPosition]);

  if (Number.isNaN(whole)) {
    return null;
  }
  const totalIndex = Number(groups[totalPosition]);
  let partialIndex;

  if (groups[partialPosition]) {
    partialIndex = Number(groups[partialPosition]);
  }
  return { combi: whole, total: totalIndex, fraction: partialIndex };
}

const indexRegex = /(-?\d+)(\.(\d+))?/;

/**
 * Separates a number into an object of the value before and after the decimal point.
 * If the number does not have a decimal point (integers), the partialIndex attribute
 * is undefined.
 * Trailing zeroes in the decimal places are ignored.
 *
 * @param value the number to separate
 */
export function separateIndex(value: number): Indexable {
  if (!isNumber(value)) {
    throw new TypeError("not a number");
  }
  const exec = indexRegex.exec(value + "");
  if (!exec) {
    throw new TypeError("not a number");
  }
  const totalIndex = Number(exec[1]);
  const partialIndex = exec[3] != null ? Number(exec[3]) : undefined;

  if (Number.isNaN(totalIndex) || Number.isNaN(partialIndex)) {
    throw new TypeError("invalid number");
  }
  return { totalIndex, partialIndex };
}

export function createCircularReplacer(): (key: any, value: any) => any {
  const seen = new WeakSet();
  return (key: any, value: any) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return "[circular Reference]";
      }
      seen.add(value);
    }
    return value;
  };
}

export function ignore(): void {
  return undefined;
}

/**
 * Searches for a project directory by searching  current working directory
 * and all its parent directories for a package.json.
 *
 * Relativize the path of file to project dir.
 * Returns an empty string if it could not find a valid path.
 */
export function findProjectDirPath(file: string): string {
  return findRelativeProjectDirPath(process.cwd(), file);
}

export function hasProps<T, U extends string | number | symbol>(
  obj: T,
  ...propName: U[]
): obj is T & { [P in U]: unknown } {
  return obj && propName.every((x) => x in obj);
}

export function hasProp<T, U extends string | number | symbol>(obj: T, propName: U): obj is T & { [P in U]: unknown } {
  return obj && propName in obj;
}

export function hasPropType<
  V,
  T extends Record<string, any> = Record<string, any>,
  U extends string | number | symbol = string | number | symbol,
>(obj: T, propName: U): obj is T & { [P in U]: V } {
  return obj && propName in obj;
}

export function findRelativeProjectDirPath(dir: string, file: string): string {
  let filePath = file;
  let currentDirFiles: string[] = fs.readdirSync(dir);

  while (!currentDirFiles.includes("package.json")) {
    filePath = ".." + path.sep + filePath;

    const currentDir = dir;
    dir = path.dirname(currentDir);

    if (dir === currentDir) {
      return "";
    }

    currentDirFiles = fs.readdirSync(dir);
  }
  if (currentDirFiles.includes(file)) {
    return filePath;
  }
  const subPath = findRelativeProjectDirPath(path.dirname(dir), file);
  return subPath ? ".." + path.sep + subPath : subPath;
}

export function findAbsoluteProjectDirPath(dir = process.cwd()): string {
  let currentDirFiles: string[] = fs.readdirSync(dir);

  while (!currentDirFiles.includes("package.json")) {
    dir = path.dirname(dir);
    currentDirFiles = fs.readdirSync(dir);
  }
  return dir;
}

export function isQuery(value: unknown): value is Query {
  return (
    typeof value === "object" &&
    !!value &&
    typeof (value as any).on === "function" &&
    typeof (value as any).stream === "function"
  );
}

/**
 * Validate a value to a UUID string.
 * A valid UUID String in this Projects
 * needs to have the fixed length of 36 characters.
 *
 * Accepts the NIL-UUID as a valid UUID.
 *
 * @param value value to validate as an uuid
 */
export function validUuid(value: unknown): value is Uuid {
  return isString(value) && value.length === 36 && validateUuid(value);
}

export function getDate(value: string): Nullable<Date> {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Return 0 <= i <= array.length such that !pred(array[i - 1]) && pred(array[i]).
 * From Stackoverflow: https://stackoverflow.com/a/41956372
 */
export function binarySearch<T>(array: T[], pred: (value: T) => boolean): number {
  let lo = -1;
  let hi = array.length;
  while (1 + lo < hi) {
    const mi = lo + ((hi - lo) >> 1);
    if (pred(array[mi])) {
      hi = mi;
    } else {
      lo = mi;
    }
  }
  return hi;
}

/**
 * Splits an array into multiple batches with each a length of batchSize.
 * The last batch may have less than batchSize, but is never empty.
 * A negative batchSize always yields an array with a single batch with all values.
 *
 * @param array the array to batch
 * @param batchSize the maximum size of a batch
 */
export function batch<T>(array: T[], batchSize: number): T[][] {
  const batches = [];
  let currentBatch = [];

  for (const value of array) {
    if (currentBatch.length >= batchSize) {
      batches.push(currentBatch);
      currentBatch = [];
    }
    currentBatch.push(value);
  }
  if (currentBatch.length) {
    batches.push(currentBatch);
  }
  return batches;
}

/**
 * Get the first interface on the current local network.
 * Must be on the '192.168.x.x' subnet.
 */
export function getMainInterface(): string | undefined {
  for (const arrays of Object.values(networkInterfaces())) {
    if (!Array.isArray(arrays)) {
      continue;
    }
    const foundIpInterface = arrays.find((value) => value.family === "IPv4");

    if (!foundIpInterface?.address?.startsWith("192.168.")) {
      continue;
    }
    return foundIpInterface.address;
  }
}

export function aborted(signal: AbortSignal): Promise<never> {
  return new Promise((_resolve, reject) => {
    // FIXME: for some reason, it does not have AbortSignal and Event Types from lib.dom.ts etc.
    // but it does not fail in github actions lint job?
    // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
    // @ts-ignore
    signal.addEventListener("abort", (event: Event) => {
      reject(event);
    });
  });
}

export function abortable<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (signal) {
    return Promise.race([promise, aborted(signal)]);
  } else {
    return promise;
  }
}

interface DeferableTimeoutPromise {
  promise: Promise<void>;
  defer: () => void;
  resolved: boolean;
}

/**
 * A promise which resolves after the time in timeoutMillis has passed.
 * The resolve can be deferred, by calling the defer function.
 * Rejects with an error if it would defer the promise such, that it
 * would resolve after timeoutMillis * (maxRetries + 1)
 *
 * @param timeoutMillis the timeout value in milliseconds
 * @param maxRetries maximum times the timeout can be repeated
 * @returns a deferable promise
 */
export function deferableTimeout(timeoutMillis: number, maxRetries = 0): DeferableTimeoutPromise {
  let resolveFunction: undefined | (() => void);
  let rejectFunction: undefined | ((error: any) => void);
  let timeoutId: undefined | NodeJS.Timeout;
  let resolved = false;
  const maxResolveTime = Date.now() + timeoutMillis * (maxRetries + 1);

  const result: DeferableTimeoutPromise = {
    resolved: false,

    defer: () => {
      if (resolved) {
        throw Error("cannot defer a resolved promise");
      }
      // do not defer if it would resolve beyond maxResolveTime
      if (Date.now() + timeoutMillis > maxResolveTime && rejectFunction) {
        return;
      }

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        resolved = true;
        result.resolved = true;

        if (resolveFunction) {
          resolveFunction();
        } else {
          throw Error("No resolve function after Timeout!");
        }
      }, timeoutMillis);
    },
    promise: new Promise<void>((resolve, reject) => {
      resolveFunction = resolve;
      rejectFunction = reject;
    }),
  };
  result.defer();
  return result;
}

export function defaultNetworkTrack(): NetworkTrack {
  return {
    count: 0,
    sent: 0,
    received: 0,
    cloudflareCount: 0,
    cloudflareSolved: 0,
    puppeteerCount: 0,
    retryCount: 0,
    hooksUsed: [],
    history: [],
  };
}
