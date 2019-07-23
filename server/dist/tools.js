"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const logger_1 = tslib_1.__importDefault(require("./logger"));
const crypto_1 = tslib_1.__importDefault(require("crypto"));
const crypto_2 = tslib_1.__importDefault(require("crypto"));
const bcrypt_nodejs_1 = tslib_1.__importDefault(require("bcrypt-nodejs"));
const emoji_strip_1 = tslib_1.__importDefault(require("emoji-strip"));
function remove(array, item) {
    const index = array.indexOf(item);
    if (index < 0) {
        return false;
    }
    array.splice(index, 1);
    return true;
}
exports.remove = remove;
function removeLike(array, equals) {
    const index = array.findIndex(equals);
    if (index < 0) {
        return false;
    }
    array.splice(index, 1);
    return true;
}
exports.removeLike = removeLike;
function forEachArrayLike(arrayLike, callback, start = 0) {
    for (let i = start; i < arrayLike.length; i++) {
        callback(arrayLike[i], i);
    }
}
exports.forEachArrayLike = forEachArrayLike;
function promiseMultiSingle(item, cb) {
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
exports.promiseMultiSingle = promiseMultiSingle;
function multiSingle(item, cb) {
    if (Array.isArray(item)) {
        const maxIndex = item.length - 1;
        return item.map((value, index) => cb(value, index, index >= maxIndex));
    }
    return cb(item, 0, true);
}
exports.multiSingle = multiSingle;
function addMultiSingle(array, item, allowNull) {
    if (item != null || allowNull) {
        if (Array.isArray(item)) {
            array.push(...item);
        }
        else {
            array.push(item);
        }
    }
}
exports.addMultiSingle = addMultiSingle;
function removeMultiSingle(array, item, allowNull) {
    if (item != null || allowNull) {
        if (Array.isArray(item)) {
            item.forEach((value) => remove(array, value));
        }
        else {
            remove(array, item);
        }
    }
}
exports.removeMultiSingle = removeMultiSingle;
function getElseSet(map, key, valueCb) {
    let value = map.get(key);
    if (value == null) {
        map.set(key, value = valueCb());
    }
    return value;
}
exports.getElseSet = getElseSet;
function unique(array, isEqualCb) {
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
exports.unique = unique;
function isTocEpisode(tocContent) {
    return tocContent.url;
}
exports.isTocEpisode = isTocEpisode;
function isTocPart(tocContent) {
    return tocContent.episodes;
}
exports.isTocPart = isTocPart;
function some(array, predicate, start) {
    for (let i = start; i < array.length; i++) {
        if (predicate(array[i], i)) {
            return true;
        }
    }
    return false;
}
exports.some = some;
const apostrophe = /['´`’′‘]/g;
function equalsIgnore(s1, s2) {
    if (apostrophe.test(s1)) {
        s1 = s1.replace(apostrophe, "");
    }
    if (apostrophe.test(s2)) {
        s2 = s2.replace(apostrophe, "");
    }
    return s1.localeCompare(s2, undefined, { sensitivity: "base" }) === 0;
}
exports.equalsIgnore = equalsIgnore;
function countOccurrence(array) {
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
exports.countOccurrence = countOccurrence;
function count(array, condition) {
    let countNumber = 0;
    for (let i = 0; i < array.length; i++) {
        if (condition(array[i], i)) {
            countNumber++;
        }
    }
    return countNumber;
}
exports.count = count;
function max(array, comparator) {
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
exports.max = max;
function maxValue(array) {
    if (!array.length) {
        return;
    }
    return array.reduce((previousValue, currentValue) => {
        return previousValue < currentValue ? currentValue : previousValue;
    });
}
exports.maxValue = maxValue;
function minValue(array) {
    if (!array.length) {
        return;
    }
    return array.reduce((previousValue, currentValue) => {
        return previousValue > currentValue ? currentValue : previousValue;
    });
}
exports.minValue = minValue;
function min(array, comparator) {
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
exports.min = min;
function relativeToAbsoluteTime(relative) {
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
        logger_1.default.warn(`'${value}' is not a number`);
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
        logger_1.default.info(`unknown time unit: '${unit}'`);
        return null;
    }
    return absolute;
}
exports.relativeToAbsoluteTime = relativeToAbsoluteTime;
function delay(timeout = 1000) {
    return new Promise((resolve) => {
        setTimeout(() => resolve(), timeout);
    });
}
exports.delay = delay;
function sanitizeString(s) {
    if (!s) {
        return s;
    }
    return emoji_strip_1.default(s).trim().replace(/\s+/g, " ");
}
exports.sanitizeString = sanitizeString;
function isString(value) {
    return Object.prototype.toString.call(value) === "[object String]";
}
exports.isString = isString;
function stringToNumberList(s) {
    return s
        .split(/[[\],]/)
        .map((value) => Number(value))
        .filter((value) => !Number.isNaN(value) && value);
}
exports.stringToNumberList = stringToNumberList;
const ShaHash = {
    tag: "sha512",
    /**
     *
     * @param {number} saltLength
     * @param {string} text
     * @return {{salt: string, hash: string}}
     */
    hash(text, saltLength = 20) {
        const salt = crypto_1.default.randomBytes(Math.ceil(saltLength / 2))
            .toString("hex") // convert to hexadecimal format
            .slice(0, saltLength); // return required number of characters */
        return { salt, hash: this.innerHash(text, salt) };
    },
    innerHash(text, salt) {
        const hash = crypto_1.default.createHash("sha512");
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
exports.Md5Hash = {
    tag: "md5",
    hash(text) {
        const newsHash = crypto_2.default
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
exports.BcryptHash = {
    tag: "bcrypt",
    hash(text) {
        return { salt: undefined, hash: bcrypt_nodejs_1.default.hashSync(text) };
    },
    /**
     * Checks whether the text hashes to the same hash.
     *
     * @param {string} text
     * @param {string} hash
     * @return boolean
     */
    equals(text, hash) {
        return bcrypt_nodejs_1.default.compareSync(text, hash);
    },
};
exports.Hashes = [ShaHash, exports.BcryptHash];
var Errors;
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
})(Errors = exports.Errors || (exports.Errors = {}));
exports.isError = (error) => {
    return Object.values(Errors).includes(error);
};
var MediaType;
(function (MediaType) {
    MediaType[MediaType["TEXT"] = 1] = "TEXT";
    MediaType[MediaType["AUDIO"] = 2] = "AUDIO";
    MediaType[MediaType["VIDEO"] = 4] = "VIDEO";
    MediaType[MediaType["IMAGE"] = 8] = "IMAGE";
})(MediaType = exports.MediaType || (exports.MediaType = {}));
function allTypes() {
    return Object.values(MediaType).reduce((previousValue, currentValue) => previousValue | currentValue) || 0;
}
exports.allTypes = allTypes;
function combiIndex(value) {
    const combi = Number(`${value.totalIndex}.${value.partialIndex || 0}`);
    return combi;
}
exports.combiIndex = combiIndex;
function separateIndex(value) {
    const total = Math.floor(value);
    const partial = value - total;
    return { totalIndex: total, partialIndex: partial ? partial : undefined };
}
exports.separateIndex = separateIndex;
//# sourceMappingURL=tools.js.map