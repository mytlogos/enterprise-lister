import logger from "./logger";
import crypt from "crypto";
import crypto from "crypto";
// FIXME: bcrypt-nodejs is now deprecated/not maintained anymore, test whether a switch
//  to 'https://github.com/dcodeIO/bcrypt.js' is feasible
import bcrypt from "bcrypt-nodejs";
import emojiStrip from "emoji-strip";
export function remove(array, item) {
    const index = array.indexOf(item);
    if (index < 0) {
        return false;
    }
    array.splice(index, 1);
    return true;
}
export function removeLike(array, equals) {
    const index = array.findIndex(equals);
    if (index < 0) {
        return false;
    }
    array.splice(index, 1);
    return true;
}
export function forEachArrayLike(arrayLike, callback, start = 0) {
    for (let i = start; i < arrayLike.length; i++) {
        callback(arrayLike[i], i);
    }
}
export function promiseMultiSingle(item, cb) {
    if (Array.isArray(item)) {
        const maxIndex = item.length - 1;
        return Promise.all(item.map((value, index) => Promise.resolve(cb(value, index, index < maxIndex))));
    }
    return new Promise((resolve, reject) => {
        try {
            resolve(cb(item));
        }
        catch (e) {
            reject(e);
        }
    });
}
export function multiSingle(item, cb) {
    if (Array.isArray(item)) {
        const maxIndex = item.length - 1;
        return item.map((value, index) => cb(value, index, index >= maxIndex));
    }
    return cb(item, 0, true);
}
export function addMultiSingle(array, item, allowNull) {
    if (item != null || allowNull) {
        if (Array.isArray(item)) {
            array.push(...item);
        }
        else {
            array.push(item);
        }
    }
}
export function removeMultiSingle(array, item, allowNull) {
    if (item != null || allowNull) {
        if (Array.isArray(item)) {
            item.forEach((value) => remove(array, value));
        }
        else {
            remove(array, item);
        }
    }
}
export function getElseSet(map, key, valueCb) {
    let value = map.get(key);
    if (value == null) {
        map.set(key, value = valueCb());
    }
    return value;
}
export function unique(array, isEqualCb) {
    const uniques = [];
    if (isEqualCb) {
        forEachArrayLike(array, (value, index) => {
            const notUnique = some(array, (otherValue) => isEqualCb(value, otherValue), index + 1);
            if (notUnique) {
                return;
            }
            uniques.push(value);
        });
    }
    else {
        const set = new Set();
        forEachArrayLike(array, (value) => set.add(value));
        uniques.push(...set);
    }
    return uniques;
}
export function isTocEpisode(tocContent) {
    return tocContent.url;
}
export function isTocPart(tocContent) {
    return tocContent.episodes;
}
export function some(array, predicate, start) {
    for (let i = start; i < array.length; i++) {
        if (predicate(array[i], i)) {
            return true;
        }
    }
    return false;
}
const apostrophe = /['´`’′‘]/g;
export function equalsIgnore(s1, s2) {
    if (apostrophe.test(s1)) {
        s1 = s1.replace(apostrophe, "");
    }
    if (apostrophe.test(s2)) {
        s2 = s2.replace(apostrophe, "");
    }
    return s1.localeCompare(s2, undefined, { sensitivity: "base" }) === 0;
}
export function countOccurrence(array) {
    const occurrenceMap = new Map();
    for (const value of array) {
        let counted = occurrenceMap.get(value);
        if (!counted) {
            counted = 0;
        }
        occurrenceMap.set(value, counted + 1);
    }
    return occurrenceMap;
}
export function count(array, condition) {
    let countNumber = 0;
    for (let i = 0; i < array.length; i++) {
        if (condition(array[i], i)) {
            countNumber++;
        }
    }
    return countNumber;
}
export function max(array, comparator) {
    if (!array.length) {
        return;
    }
    // @ts-ignore
    const comparatorFunction = isString(comparator)
        // @ts-ignore
        ? (previousValue, currentValue) => previousValue[comparator] - currentValue[comparator]
        : comparator;
    return array.reduce((previousValue, currentValue) => {
        return comparatorFunction(previousValue, currentValue) < 0 ? currentValue : previousValue;
    });
}
export function maxValue(array) {
    if (!array.length) {
        return;
    }
    return array.reduce((previousValue, currentValue) => {
        return previousValue < currentValue ? currentValue : previousValue;
    });
}
export function minValue(array) {
    if (!array.length) {
        return;
    }
    return array.reduce((previousValue, currentValue) => {
        return previousValue > currentValue ? currentValue : previousValue;
    });
}
export function min(array, comparator) {
    if (!array.length) {
        return;
    }
    // @ts-ignore
    const comparatorFunction = isString(comparator)
        // @ts-ignore
        ? (previousValue, currentValue) => previousValue[comparator] - currentValue[comparator]
        : comparator;
    return array.reduce((previousValue, currentValue) => {
        return comparatorFunction(previousValue, currentValue) < 0 ? previousValue : currentValue;
    });
}
export function relativeToAbsoluteTime(relative) {
    let exec = /\s*(\d+|an?)\s+(\w+)\s+(ago)\s*/i.exec(relative);
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
        logger.warn(`'${value}' is not a number`);
        return null;
    }
    if (/^(s|secs?|seconds?)$/.test(unit)) {
        absolute.setSeconds(absolute.getSeconds() - timeValue);
    }
    else if (/^(mins?|minutes?)$/.test(unit)) {
        absolute.setMinutes(absolute.getMinutes() - timeValue);
    }
    else if (/^(hours?|hr)$/.test(unit)) {
        absolute.setHours(absolute.getHours() - timeValue);
    }
    else if (/^(days?)$/.test(unit)) {
        absolute.setDate(absolute.getDate() - timeValue);
    }
    else if (/^(weeks?)$/.test(unit)) {
        absolute.setDate(absolute.getDate() - 7 * timeValue);
    }
    else if (/^(months?)$/.test(unit)) {
        absolute.setMonth(absolute.getMonth() - timeValue);
    }
    else if (/^(years?)$/.test(unit)) {
        absolute.setFullYear(absolute.getFullYear() - timeValue);
    }
    else {
        logger.info(`unknown time unit: '${unit}'`);
        return null;
    }
    return absolute;
}
export function delay(timeout = 1000) {
    return new Promise((resolve) => {
        setTimeout(() => resolve(), timeout);
    });
}
export function sanitizeString(s) {
    if (!s) {
        return s;
    }
    return emojiStrip(s).trim().replace(/\s+/g, " ");
}
export function isString(value) {
    return Object.prototype.toString.call(value) === "[object String]";
}
export function stringToNumberList(s) {
    return s
        .split(/[[\],]/)
        .map((value) => Number(value))
        .filter((value) => !Number.isNaN(value) && value);
}
const ShaHash = {
    tag: "sha512",
    /**
     *
     * @param {number} saltLength
     * @param {string} text
     * @return {{salt: string, hash: string}}
     */
    hash(text, saltLength = 20) {
        const salt = crypt.randomBytes(Math.ceil(saltLength / 2))
            .toString("hex") // convert to hexadecimal format
            .slice(0, saltLength); // return required number of characters */
        return { salt, hash: this.innerHash(text, salt) };
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
export const Md5Hash = {
    tag: "md5",
    hash(text) {
        const newsHash = crypto
            .createHash("md5")
            .update(text)
            .digest("hex");
        return { hash: newsHash };
    },
    /**
     * Checks whether the text hashes to the same hash.
     */
    equals(text, hash) {
        return this.hash(text).hash === hash;
    },
};
export const BcryptHash = {
    tag: "bcrypt",
    hash(text) {
        return { salt: undefined, hash: bcrypt.hashSync(text) };
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
export const Hashes = [ShaHash, BcryptHash];
export var Errors;
(function (Errors) {
    Errors["USER_EXISTS_ALREADY"] = "USER_EXISTS_ALREADY";
    Errors["INVALID_INPUT"] = "INVALID_INPUT";
    Errors["INVALID_DATA"] = "INVALID_DATA";
    Errors["USER_DOES_NOT_EXIST"] = "USER_DOES_NOT_EXIST";
    Errors["CORRUPT_DATA"] = "CORRUPT_DATA";
    Errors["UNKNOWN"] = "UNKNOWN";
    Errors["INVALID_MESSAGE"] = "INVALID_MESSAGE";
    Errors["INVALID_SESSION"] = "INVALID_SESSION";
    Errors["DOES_NOT_EXIST"] = "DOES_NOT_EXIST";
    Errors["UNSUCCESSFUL"] = "UNSUCCESSFUL";
})(Errors || (Errors = {}));
export const isError = (error) => {
    return Object.values(Errors).includes(error);
};
export var MediaType;
(function (MediaType) {
    MediaType[MediaType["TEXT"] = 1] = "TEXT";
    MediaType[MediaType["AUDIO"] = 2] = "AUDIO";
    MediaType[MediaType["VIDEO"] = 4] = "VIDEO";
    MediaType[MediaType["IMAGE"] = 8] = "IMAGE";
})(MediaType || (MediaType = {}));
export function allTypes() {
    return Object.values(MediaType).reduce((previousValue, currentValue) => previousValue | currentValue) || 0;
}
export function combiIndex(value) {
    const combi = Number(`${value.totalIndex}.${value.partialIndex || 0}`);
    if (Number.isNaN(combi)) {
        throw Error(`invalid argument: total: '${value.totalIndex}', partial: '${value.partialIndex}'`);
    }
    return combi;
}
export function extractIndices(groups, allPosition, totalPosition, partialPosition) {
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
const indexRegex = /\d+(\.(\d+))/;
export function separateIndex(value) {
    const total = Math.floor(value);
    const partial = value - total;
    return { totalIndex: total, partialIndex: partial ? partial : undefined };
}
//# sourceMappingURL=tools.js.map