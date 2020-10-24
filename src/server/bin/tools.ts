import {EpisodeRelease, MultiSingle, Uuid} from "./types";
import {TocEpisode, TocPart} from "./externals/types";
import crypt from "crypto";
import crypto from "crypto";
// FIXME: bcrypt-nodejs is now deprecated/not maintained anymore, test whether a switch
//  to 'https://github.com/dcodeIO/bcrypt.js' is feasible
import bcrypt from "bcryptjs";
import emojiStrip from "emoji-strip";
import * as fs from "fs";
import * as path from "path";
import {Query} from "mysql";
import * as dns from "dns";
import EventEmitter from "events";
import { validate as validateUuid } from "uuid";
import { isNumber } from "validate.js"


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

type multiSingleCallback<T, R> = (value: T, index?: number, last?: boolean) => R;

export function promiseMultiSingle<T, R>(item: T, cb: multiSingleCallback<T, R>): Promise<R>;
export function promiseMultiSingle<T, R>(item: T[], cb: multiSingleCallback<T, R>): Promise<R[]>;

export function promiseMultiSingle<T, R>(item: T | T[], cb: multiSingleCallback<T, R>): Promise<MultiSingle<R>> {
    if (typeof cb !== "function") {
        return Promise.reject(new TypeError(`callback is not a function: '${cb}'`));
    }
    if (Array.isArray(item)) {
        const maxIndex = item.length - 1;
        return Promise.all(item.map((value: T, index) => Promise.resolve(cb(value, index, index < maxIndex))));
    }
    return new Promise((resolve, reject) => {
        try {
            resolve(cb(item, 0, false));
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

export function getElseSetObj<K, V>(map: Record<string | number, K>, key: string | number, valueCb: () => V): V {
    // @ts-ignore
    let value: V = map[key];
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

export function equalsIgnore(s1: string, s2: string): boolean {
    if (apostrophe.test(s1)) {
        s1 = s1.replace(apostrophe, "");
    }
    if (apostrophe.test(s2)) {
        s2 = s2.replace(apostrophe, "");
    }
    return s1.localeCompare(s2, undefined, {sensitivity: "base"}) === 0;
}

export function contains(s1: string, s2: string): boolean {
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

export function equalsRelease(firstRelease: EpisodeRelease, secondRelease: EpisodeRelease): boolean {
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

export function stringify(object: any): string {
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
            // @ts-ignore
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
            return {salt, hash: this.innerHash(text, salt)};
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
            return {hash: newsHash};
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
            return {salt: undefined, hash};
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

export const isError = (error: unknown): boolean => {
    // @ts-ignore
    return Object.values(Errors).includes(error);
};

export enum MediaType {
    TEXT = 0x1,
    AUDIO = 0x2,
    VIDEO = 0x4,
    IMAGE = 0x8,
}

export function hasMediaType(container: MediaType, testFor: MediaType): boolean {
    return (container & testFor) === testFor;
}

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

export function combiIndex(value: { totalIndex: number; partialIndex?: number }): number {
    const combi = Number(`${value.totalIndex}.${value.partialIndex || 0}`);
    if (Number.isNaN(combi)) {
        throw Error(`invalid argument: total: '${value.totalIndex}', partial: '${value.partialIndex}'`);
    }
    return combi;
}

export function checkIndices(value: { totalIndex: number; partialIndex?: number }): void {
    if (value.totalIndex == null || value.totalIndex < -1) {
        throw Error("invalid toc content, totalIndex invalid");
    }
    if (value.partialIndex != null && (value.partialIndex < 0 || !Number.isInteger(value.partialIndex))) {
        throw Error("invalid toc content, partialIndex invalid");
    }
}

export function extractIndices(groups: string[], allPosition: number, totalPosition: number, partialPosition: number)
    : { combi: number; total: number; fraction?: number } | null {

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

/**
 * Separates a number into an object of the value before and after the decimal point.
 * If the number does not have a decimal point (integers), the partialIndex attribute
 * is undefined.
 * Trailing zeroes in the decimal places are ignored.
 * 
 * @param value the number to separate
 */
export function separateIndex(value: number): { totalIndex: number; partialIndex?: number } {
    if (!isNumber(value)) {
        throw Error("not a number");
    }
    const exec = indexRegex.exec(value + "");
    if (!exec) {
        throw Error("not a number");
    }
    const totalIndex = Number(exec[1]);
    const partialIndex = exec[3] != null ? Number(exec[3]) : undefined;

    // @ts-ignore
    if (Number.isNaN(totalIndex) || Number.isNaN(partialIndex)) {
        throw Error("invalid number");
    }
    return {totalIndex, partialIndex};
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

export function getDate(value: string): Date | null {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
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
