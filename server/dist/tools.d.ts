import { EpisodeRelease, MultiSingle } from "./types";
import { TocEpisode, TocPart } from "./externals/types";
export declare function remove<T>(array: T[], item: T): boolean;
export declare function removeLike<T>(array: T[], equals: (item: T) => boolean): boolean;
export declare type ArrayCallback<T> = (value: T, index: number) => void;
export declare function forEachArrayLike<T>(arrayLike: ArrayLike<T>, callback: ArrayCallback<T>, start?: number): void;
declare type multiSingleCallback<T, R> = (value: T, index?: number, last?: boolean) => R;
export declare function promiseMultiSingle<T, R>(item: T, cb: multiSingleCallback<T, R>): Promise<R>;
export declare function promiseMultiSingle<T, R>(item: T[], cb: multiSingleCallback<T, R>): Promise<R[]>;
export declare function multiSingle<T, R>(item: T, cb: multiSingleCallback<T, R>): R;
export declare function multiSingle<T, R>(item: T[], cb: multiSingleCallback<T, R>): R[];
export declare function addMultiSingle<T>(array: T[], item: MultiSingle<T>, allowNull?: boolean): void;
export declare function removeMultiSingle<T>(array: T[], item: MultiSingle<T>, allowNull?: boolean): void;
export declare function getElseSet<K, V>(map: Map<K, V>, key: K, valueCb: () => V): V;
export declare function unique<T>(array: ArrayLike<T>, isEqualCb?: (value: T, other: T) => boolean): T[];
export declare function isTocEpisode(tocContent: any): tocContent is TocEpisode;
export declare function isTocPart(tocContent: any): tocContent is TocPart;
export declare function some<T>(array: ArrayLike<T>, predicate: Predicate<T>, start: number): boolean;
export declare function equalsIgnore(s1: string, s2: string): boolean;
export declare function contains(s1: string, s2: string): boolean;
export declare function countOccurrence<T>(array: T[]): Map<T, number>;
export declare type Predicate<T> = (value: T, index: number) => boolean;
export declare function count<T>(array: T[], condition: Predicate<T>): number;
export declare type Comparator<T> = (previous: T, current: T) => number;
export declare function max<T>(array: T[], comparator: keyof T | Comparator<T>): T | undefined;
export declare function maxValue<T>(array: T[]): T | undefined;
export declare function minValue<T>(array: T[]): T | undefined;
export declare function min<T>(array: T[], comparator: keyof T | Comparator<T>): T | undefined;
export declare function relativeToAbsoluteTime(relative: string): Date | null;
export declare function delay(timeout?: number): Promise<void>;
export declare function equalsRelease(firstRelease: EpisodeRelease, secondRelease: EpisodeRelease): boolean;
export declare function sanitizeString(s: string): string;
export declare function isString(value: any): value is string;
export declare function stringToNumberList(s: string): number[];
interface Hash {
    salt?: string;
    hash: string;
}
export interface Hasher {
    tag: string;
    hash(text: string, saltLength?: number): Hash;
    equals(text: string, hash: string, salt: string): boolean;
}
export declare const Md5Hash: Hasher;
export declare const BcryptHash: Hasher;
export declare const Hashes: Hasher[];
export declare enum Errors {
    USER_EXISTS_ALREADY = "USER_EXISTS_ALREADY",
    INVALID_INPUT = "INVALID_INPUT",
    INVALID_DATA = "INVALID_DATA",
    USER_DOES_NOT_EXIST = "USER_DOES_NOT_EXIST",
    CORRUPT_DATA = "CORRUPT_DATA",
    UNKNOWN = "UNKNOWN",
    INVALID_MESSAGE = "INVALID_MESSAGE",
    INVALID_SESSION = "INVALID_SESSION",
    DOES_NOT_EXIST = "DOES_NOT_EXIST",
    UNSUCCESSFUL = "UNSUCCESSFUL"
}
export declare const isError: (error: any) => boolean;
export declare enum MediaType {
    TEXT = 1,
    AUDIO = 2,
    VIDEO = 4,
    IMAGE = 8
}
export declare function hasMediaType(container: MediaType, testFor: MediaType): boolean;
export declare function allTypes(): any;
export declare function combiIndex(value: {
    totalIndex: number;
    partialIndex?: number;
}): number;
export declare function checkIndices(value: {
    totalIndex: number;
    partialIndex?: number;
}): void;
export declare function extractIndices(groups: string[], allPosition: number, totalPosition: number, partialPosition: number): {
    combi: number;
    total: number;
    fraction?: number;
} | null;
export declare function separateIndex(value: number): {
    totalIndex: number;
    partialIndex?: number;
};
export declare function ignore(): undefined;
/**
 * Searches for a project directory by searching  current working directory
 * and all its parent directories for a package.json.
 *
 * Relativize the path of file to project dir.
 */
export declare function findProjectDirPath(file: string): string;
export {};
