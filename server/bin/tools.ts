import {EpisodeRelease, MultiSingle} from "./types";
import {TocEpisode, TocPart} from "./externals/types";
import crypt from "crypto";
import crypto from "crypto";
// FIXME: bcrypt-nodejs is now deprecated/not maintained anymore, test whether a switch
//  to 'https://github.com/dcodeIO/bcrypt.js' is feasible
import bcrypt from "bcrypt-nodejs";
import emojiStrip from "emoji-strip";
import * as fs from "fs";
import * as path from "path";
import {Query} from "mysql";


export function remove<T>(array: T[], item: T): boolean {
    const index = array.indexOf(item);
    if (index < 0) {
        return false;
    }
    array.splice(index, 1);
    return true;
}

export function removeLike<T>(array: T[], equals: (item: T) => boolean): boolean {
    const index = array.findIndex(equals);
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

type multiSingleCallback<T, R> = (value: T, index?: number, last?: boolean) => R;

export function promiseMultiSingle<T, R>(item: T, cb: multiSingleCallback<T, R>): Promise<R>;
export function promiseMultiSingle<T, R>(item: T[], cb: multiSingleCallback<T, R>): Promise<R[]>;

export function promiseMultiSingle<T, R>(item: T | T[], cb: multiSingleCallback<T, R>): Promise<MultiSingle<R>> {
    if (Array.isArray(item)) {
        const maxIndex = item.length - 1;
        return Promise.all(item.map((value: T, index) => Promise.resolve(cb(value, index, index < maxIndex))));
    }
    return new Promise((resolve, reject) => {
        try {
            resolve(cb(item));
        } catch (e) {
            reject(e);
        }
    });
}

export function multiSingle<T, R>(item: T, cb: multiSingleCallback<T, R>): R;
export function multiSingle<T, R>(item: T[], cb: multiSingleCallback<T, R>): R[];

export function multiSingle<T, R>(item: T | T[], cb: multiSingleCallback<T, R>): R | R[] {
    if (Array.isArray(item)) {
        const maxIndex = item.length - 1;
        return item.map((value, index) => cb(value, index, index >= maxIndex));
    }
    return cb(item, 0, true);
}

export function addMultiSingle<T>(array: T[], item: MultiSingle<T>, allowNull?: boolean): void {
    if (item != null || allowNull) {
        if (Array.isArray(item)) {
            array.push(...item);
        } else {
            array.push(item);
        }
    }
}

export function removeMultiSingle<T>(array: T[], item: MultiSingle<T>, allowNull?: boolean): void {
    if (item != null || allowNull) {
        if (Array.isArray(item)) {
            item.forEach((value) => remove(array, value));
        } else {
            remove(array, item);
        }
    }
}

export function getElseSet<K, V>(map: Map<K, V>, key: K, valueCb: () => V): V {
    let value = map.get(key);
    if (value == null) {
        map.set(key, value = valueCb());
    }
    return value;
}

export function getElseSetObj<K, V>(map: object, key: string | number, valueCb: () => V): V {
    // @ts-ignore
    let value = map[key];
    if (value == null) {
        // @ts-ignore
        map[key] = value = valueCb();
    }
    return value;
}


export function unique<T>(array: ArrayLike<T>, isEqualCb?: (value: T, other: T) => boolean): T[] {
    const uniques: T[] = [];

    if (isEqualCb) {
        forEachArrayLike(array, (value, index) => {
            const notUnique = some(array, (otherValue) => isEqualCb(value, otherValue), index + 1);

            if (notUnique) {
                return;
            }
            uniques.push(value);
        });
    } else {
        const set = new Set<T>();
        forEachArrayLike(array, (value) => set.add(value));
        uniques.push(...set);
    }
    return uniques;
}

export function isTocEpisode(tocContent: any): tocContent is TocEpisode {
    return tocContent.url;
}

export function isTocPart(tocContent: any): tocContent is TocPart {
    return tocContent.episodes;
}


export function some<T>(array: ArrayLike<T>, predicate: Predicate<T>, start: number): boolean {
    for (let i = start; i < array.length; i++) {
        if (predicate(array[i], i)) {
            return true;
        }
    }
    return false;
}

const apostrophe = /['´`’′‘]/g;

export function equalsIgnore(s1: string, s2: string) {
    if (apostrophe.test(s1)) {
        s1 = s1.replace(apostrophe, "");
    }
    if (apostrophe.test(s2)) {
        s2 = s2.replace(apostrophe, "");
    }
    return s1.localeCompare(s2, undefined, {sensitivity: "base"}) === 0;
}

export function contains(s1: string, s2: string) {
    s1 = s1.replace(apostrophe, "");
    s2 = s2.replace(apostrophe, "");
    return s1.toLocaleLowerCase().includes(s2.toLocaleLowerCase());
}

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

export function max<T>(array: T[], comparator: keyof T | Comparator<T>): T | undefined {
    if (!array.length) {
        return;
    }
    // @ts-ignore
    const comparatorFunction: Comparator<T> = isString(comparator)
        // @ts-ignore
        ? (previousValue: T, currentValue: T) => previousValue[comparator] - currentValue[comparator]
        : comparator;

    return array.reduce((previousValue, currentValue) => {
        return comparatorFunction(previousValue, currentValue) < 0 ? currentValue : previousValue;
    });
}

export function maxValue<T>(array: T[]): T | undefined {
    if (!array.length) {
        return;
    }
    return array.reduce((previousValue, currentValue) => {
        return previousValue < currentValue ? currentValue : previousValue;
    });
}

export function minValue<T>(array: T[]): T | undefined {
    if (!array.length) {
        return;
    }
    return array.reduce((previousValue, currentValue) => {
        return previousValue > currentValue ? currentValue : previousValue;
    });
}

export function min<T>(array: T[], comparator: keyof T | Comparator<T>): T | undefined {
    if (!array.length) {
        return;
    }
    // @ts-ignore
    const comparatorFunction: Comparator<T> = isString(comparator)
        // @ts-ignore
        ? (previousValue: T, currentValue: T) => previousValue[comparator] - currentValue[comparator]
        : comparator;

    return array.reduce((previousValue, currentValue) => {
        return comparatorFunction(previousValue, currentValue) < 0 ? previousValue : currentValue;
    });
}

export function relativeToAbsoluteTime(relative: string): Date | null {
    let exec: string[] | null = /\s*(\d+|an?)\s+(\w+)\s+(ago)\s*/i.exec(relative);
    if (!exec) {
        if (!relative || relative.toLowerCase() !== "just now") {
            return null;
        }
        exec = ["", "30", "s"];
    }
    const [, value, unit] = exec;
    const absolute = new Date();
    const timeValue = value && value.match("an?") ? 1 : Number(value);

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

export function delay(timeout = 1000): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(() => resolve(), timeout);
    });
}

export function equalsRelease(firstRelease: EpisodeRelease, secondRelease: EpisodeRelease) {
    return (firstRelease === secondRelease)
        || (
            (firstRelease && secondRelease)
            && firstRelease.url === secondRelease.url
            && firstRelease.episodeId === secondRelease.episodeId
            && !!firstRelease.locked === !!secondRelease.locked
            // tslint:disable-next-line:triple-equals
            && firstRelease.sourceType == secondRelease.sourceType
            && firstRelease.releaseDate.getTime() === secondRelease.releaseDate.getTime()
            && firstRelease.title === secondRelease.title
        );
}

export function stringify(object: any) {
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

export function jsonReplacer(key: any, value: any) {
    if (value instanceof Error) {
        const error: any = {};

        Object.getOwnPropertyNames(value).forEach((errorKey) => {
            // @ts-ignore
            error[errorKey] = value[errorKey];
        });

        return error;
    }
    return value;
}

export function sanitizeString(s: string): string {
    if (!s) {
        return s;
    }
    return emojiStrip(s).trim().replace(/\s+/g, " ");
}

export function isString(value: any): value is string {
    return Object.prototype.toString.call(value) === "[object String]";
}

export function stringToNumberList(s: string): number[] {
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

    hash(text: string, saltLength?: number): Hash;

    equals(text: string, hash: string, salt: string): boolean;
}

interface ShaHasher extends Hasher {
    innerHash(text: string, salt: string): string;
}

const ShaHash: ShaHasher = {
    tag: "sha512",

    /**
     *
     * @param {number} saltLength
     * @param {string} text
     * @return {{salt: string, hash: string}}
     */
    hash(text: string, saltLength: number = 20): { salt: string, hash: string } {
        const salt = crypt.randomBytes(Math.ceil(saltLength / 2))
            .toString("hex") // convert to hexadecimal format
            .slice(0, saltLength); // return required number of characters */
        return {salt, hash: this.innerHash(text, salt)};
    },

    innerHash(text, salt) {
        const hash = crypt.createHash("sha512");
        hash.update(salt + text);
        return hash.digest("hex");
    },


    /**
     * Checks whether the text hashes to the same hash.
     */
    equals(text, hash, salt) {
        return this.innerHash(text, salt) === hash;
    },
};
export const Md5Hash: Hasher = {
    tag: "md5",

    hash(text: string) {
        const newsHash = crypto
            .createHash("md5")
            .update(text)
            .digest("hex");
        return {hash: newsHash};
    },

    /**
     * Checks whether the text hashes to the same hash.
     */
    equals(text, hash) {
        return this.hash(text).hash === hash;
    },
};
export const BcryptHash: Hasher = {
    tag: "bcrypt",

    hash(text) {
        return {salt: undefined, hash: bcrypt.hashSync(text)};
    },

    /**
     * Checks whether the text hashes to the same hash.
     *
     * @param {string} text
     * @param {string} hash
     * @return boolean
     */
    equals(text, hash) {
        return bcrypt.compareSync(text, hash);
    },
};
export const Hashes: Hasher[] = [ShaHash, BcryptHash];

export enum Errors {
    USER_EXISTS_ALREADY = "USER_EXISTS_ALREADY",
    INVALID_INPUT = "INVALID_INPUT",
    INVALID_DATA = "INVALID_DATA",
    USER_DOES_NOT_EXIST = "USER_DOES_NOT_EXIST",
    CORRUPT_DATA = "CORRUPT_DATA",
    UNKNOWN = "UNKNOWN",
    INVALID_MESSAGE = "INVALID_MESSAGE",
    INVALID_SESSION = "INVALID_SESSION",
    DOES_NOT_EXIST = "DOES_NOT_EXIST",
    UNSUCCESSFUL = "UNSUCCESSFUL",
}

export const isError = (error: any) => {
    return Object.values(Errors).includes(error);
};

export enum MediaType {
    TEXT = 0x1,
    AUDIO = 0x2,
    VIDEO = 0x4,
    IMAGE = 0x8,
}

export function hasMediaType(container: MediaType, testFor: MediaType) {
    return (container & testFor) === testFor;
}

export function allTypes() {
    return (Object.values(MediaType) as number[])
        .reduce((previousValue, currentValue) => previousValue | currentValue) || 0;
}

export function combiIndex(value: { totalIndex: number, partialIndex?: number }): number {
    const combi = Number(`${value.totalIndex}.${value.partialIndex || 0}`);
    if (Number.isNaN(combi)) {
        throw Error(`invalid argument: total: '${value.totalIndex}', partial: '${value.partialIndex}'`);
    }
    return combi;
}

export function checkIndices(value: { totalIndex: number, partialIndex?: number }) {
    if (value.totalIndex == null || value.totalIndex < -1) {
        throw Error("invalid toc content, totalIndex invalid");
    }
    if (value.partialIndex != null && (value.partialIndex < 0 || !Number.isInteger(value.partialIndex))) {
        throw Error("invalid toc content, partialIndex invalid");
    }
}

export function extractIndices(groups: string[], allPosition: number, totalPosition: number, partialPosition: number)
    : { combi: number, total: number, fraction?: number } | null {

    const whole = Number(groups[allPosition]);

    if (Number.isNaN(whole)) {
        return null;
    }
    const totalIndex = Number(groups[totalPosition]);
    let partialIndex;

    if (groups[partialPosition]) {
        partialIndex = Number(groups[partialPosition]);
    }
    return {combi: whole, total: totalIndex, fraction: partialIndex};
}

const indexRegex = /(-?\d+)(\.(\d+))?/;

export function separateIndex(value: number): { totalIndex: number, partialIndex?: number; } {
    const exec = indexRegex.exec(value + "");
    if (!exec) {
        throw Error("not a positive number");
    }
    const totalIndex = Number(exec[1]);
    const partialIndex = exec[3] != null ? Number(exec[3]) : undefined;

    // @ts-ignore
    if (Number.isNaN(totalIndex) || Number.isNaN(partialIndex)) {
        throw Error("invalid number");
    }
    return {totalIndex, partialIndex};
}

export function createCircularReplacer() {
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

export function ignore() {
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
