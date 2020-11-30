import { EpisodeRelease, MultiSingle, Uuid, PromiseMultiSingle, EmptyPromise, Unpack, UnpackArray, Optional, Nullable, Indexable, ExtractedIndex } from "./types";
import { TocEpisode, TocPart, TocContent } from "./externals/types";
import crypt from "crypto";
import crypto from "crypto";
// FIXME: bcrypt-nodejs is now deprecated/not maintained anymore, test whether a switch
//  to 'https://github.com/dcodeIO/bcrypt.js' is feasible
import bcrypt from "bcryptjs";
import emojiStrip from "emoji-strip";
import * as fs from "fs";
import * as path from "path";
import { Query } from "mysql";
import * as dns from "dns";
import EventEmitter from "events";
import { validate as validateUuid } from "uuid";
import { isNumber } from "validate.js"
import { AsyncResource } from "async_hooks";


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

export function promiseMultiSingle<T, R>(item: T, cb: multiSingleCallback<Unpack<T>, R>): PromiseMultiSingle<T, Unpack<R>> {
    if (typeof cb !== "function") {
        return Promise.reject(new TypeError(`callback is not a function: '${cb}'`)) as any;
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
        map.set(key, value = valueCb());
    }
    return value;
}

export function getElseSetObj<K extends (string | number), V>(map: Record<K, V>, key: K, valueCb: () => V): V {
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
 * Returns true if the value is a TocEpisode.
 * 
 * @param tocContent value to check
 */
export function isTocEpisode(tocContent: TocContent): tocContent is TocEpisode {
    // @ts-expect-error
    return !!tocContent.url;
}

/**
 * Returns true if the value is a TocPart.
 * 
 * @param tocContent value to check
 */
export function isTocPart(tocContent: TocContent): tocContent is TocPart {
    // @ts-expect-error
    return !!tocContent.episodes;
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
        let counted = occurrenceMap.get(value);

        if (!counted) {
            counted = 0;
        }
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
        // @ts-expect-error
        ? (previousValue: T, currentValue: T) => previousValue[comparator] - currentValue[comparator]
        : comparator as Comparator<T>;

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
        // @ts-expect-error
        ? (previousValue: T, currentValue: T) => previousValue[comparator] - currentValue[comparator]
        : comparator as Comparator<T>;

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
    let exec: Nullable<string[]> = /\s*(\d+|an?)\s+(\w+)\s+(ago)\s*/i.exec(relative);
    if (!exec) {
        if (!relative || relative.toLowerCase() !== "just now") {
            return null;
        }
        exec = ["", "30", "s"];
    }
    const [, value, unit] = exec;
    const absolute = new Date();
    const timeValue = value && value.match("an?") ? 1 : Number(value);

    // should not happen?
    if (Number.isNaN(timeValue)) {
        throw new Error(`'${value}' is not a number`);
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
        throw new Error(`unknown time unit: '${unit}'`);
    }
    return absolute;
}

/**
 * A convenience delay function.
 * Returns a promise which resolves after the given time in milliseconds.
 * The true delayed time will most likely not equal the given delay time
 * as this uses setTimeout.
 * 
 * @param timeout time to delay the promise
 */
export function delay(timeout = 1000): EmptyPromise {
    return new Promise((resolve) => {
        setTimeout(AsyncResource.bind(() => resolve()), timeout);
    });
}

/**
 * Tests whether two releases should be equal.
 * This equality ignores the releaseDate attribute.
 * 
 * @param firstRelease first release
 * @param secondRelease second release
 */
export function equalsRelease(firstRelease?: EpisodeRelease, secondRelease?: EpisodeRelease): boolean {
    return (firstRelease == secondRelease)
        || (
            (!!firstRelease && !!secondRelease)
            && firstRelease.url === secondRelease.url
            && firstRelease.episodeId === secondRelease.episodeId
            && firstRelease.tocId === secondRelease.tocId
            && !!firstRelease.locked === !!secondRelease.locked
            // tslint:disable-next-line:triple-equals
            && firstRelease.sourceType == secondRelease.sourceType
            && firstRelease.title === secondRelease.title
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
    return emojiStrip(s).trim().replace(/\s+/g, " ");
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
            const salt = crypt.randomBytes(Math.ceil(saltLength / 2))
                .toString("hex") // convert to hexadecimal format
                .slice(0, saltLength); // return required number of characters */
            return { salt, hash: this.innerHash(text, salt) };
        });
    },

    innerHash(text, salt) {
        if (!isString(text)) {
            throw TypeError(`'${text}' not a string`);
        }
        if (!isString(salt)) {
            throw TypeError(`'${salt}' not a string`);
        }
        const hash = crypt.createHash("sha512");
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
                throw TypeError(`'${text}' not a string`);
            }
            const newsHash = crypto
                .createHash("md5")
                .update(text)
                .digest("hex");
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
    return (Object.values(MediaType) as number[])
        .reduce((previousValue, currentValue) => previousValue | currentValue) || 0;
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
        throw Error(`invalid argument: total: '${value.totalIndex}', partial: '${value.partialIndex}'`);
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
        throw Error("invalid toc content, totalIndex invalid");
    }
    if (value.partialIndex != null && (value.partialIndex < 0 || !Number.isInteger(value.partialIndex))) {
        throw Error("invalid toc content, partialIndex invalid");
    }
}

export function extractIndices(groups: string[], allPosition: number, totalPosition: number, partialPosition: number): Nullable<ExtractedIndex> {
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
        throw Error("not a number");
    }
    const exec = indexRegex.exec(value + "");
    if (!exec) {
        throw Error("not a number");
    }
    const totalIndex = Number(exec[1]);
    const partialIndex = exec[3] != null ? Number(exec[3]) : undefined;

    if (Number.isNaN(totalIndex) || Number.isNaN(partialIndex)) {
        throw Error("invalid number");
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
 */
export function findProjectDirPath(file: string): string {
    let dir = process.cwd();
    let filePath = file;
    let currentDirFiles: string[] = fs.readdirSync(dir);

    while (!currentDirFiles.includes("package.json")) {
        filePath = ".." + path.sep + filePath;
        dir = path.dirname(dir);
        currentDirFiles = fs.readdirSync(dir);
    }
    return filePath;
}

export function isQuery(value: any): value is Query {
    return value && typeof value.on === "function" && typeof value.stream === "function";
}

export function invalidId(id: any): boolean {
    return !Number.isInteger(id) || id <= 0;
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
    return isString(value) && value.length == 36 && validateUuid(value);
}

export interface InternetTester extends EventEmitter.EventEmitter {
    on(evt: "online" | "offline", listener: (previousSince: Date) => void): this;

    isOnline(): boolean;

    stop(): void;
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
    let lo = -1, hi = array.length;
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

class InternetTesterImpl extends EventEmitter.EventEmitter implements InternetTester {
    private offline?: boolean = undefined;
    private since: Date = new Date();
    private stopLoop = false;

    public constructor() {
        super();
        // should never call catch callback
        this.checkInternet().catch(console.error);
    }

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
            await delay(1000);
        }
    }
}

export const internetTester: InternetTester = new InternetTesterImpl();
