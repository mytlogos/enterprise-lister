"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const crypto_1 = tslib_1.__importDefault(require("crypto"));
const crypto_2 = tslib_1.__importDefault(require("crypto"));
// FIXME: bcrypt-nodejs is now deprecated/not maintained anymore, test whether a switch
//  to 'https://github.com/dcodeIO/bcrypt.js' is feasible
const bcryptjs_1 = tslib_1.__importDefault(require("bcryptjs"));
const emoji_strip_1 = tslib_1.__importDefault(require("emoji-strip"));
const fs = tslib_1.__importStar(require("fs"));
const path = tslib_1.__importStar(require("path"));
const dns = tslib_1.__importStar(require("dns"));
const events_1 = tslib_1.__importDefault(require("events"));
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
function getElseSetObj(map, key, valueCb) {
    // @ts-ignore
    let value = map[key];
    if (value == null) {
        // @ts-ignore
        map[key] = value = valueCb();
    }
    return value;
}
exports.getElseSetObj = getElseSetObj;
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
function contains(s1, s2) {
    s1 = s1.replace(apostrophe, "");
    s2 = s2.replace(apostrophe, "");
    return s1.toLocaleLowerCase().includes(s2.toLocaleLowerCase());
}
exports.contains = contains;
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
        throw new Error(`'${value}' is not a number`);
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
        throw new Error(`unknown time unit: '${unit}'`);
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
function equalsRelease(firstRelease, secondRelease) {
    return (firstRelease === secondRelease)
        || ((firstRelease && secondRelease)
            && firstRelease.url === secondRelease.url
            && firstRelease.episodeId === secondRelease.episodeId
            && !!firstRelease.locked === !!secondRelease.locked
            // tslint:disable-next-line:triple-equals
            && firstRelease.sourceType == secondRelease.sourceType
            && firstRelease.releaseDate.getTime() === secondRelease.releaseDate.getTime()
            && firstRelease.title === secondRelease.title);
}
exports.equalsRelease = equalsRelease;
function stringify(object) {
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
exports.stringify = stringify;
function jsonReplacer(key, value) {
    if (value instanceof Error) {
        const error = {};
        Object.getOwnPropertyNames(value).forEach((errorKey) => {
            // @ts-ignore
            error[errorKey] = value[errorKey];
        });
        return error;
    }
    return value;
}
exports.jsonReplacer = jsonReplacer;
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
        return Promise.resolve({ salt, hash: this.innerHash(text, salt) });
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
        return Promise.resolve(this.innerHash(text, salt) === hash);
    },
};
exports.Md5Hash = {
    tag: "md5",
    hash(text) {
        const newsHash = crypto_2.default
            .createHash("md5")
            .update(text)
            .digest("hex");
        return Promise.resolve({ hash: newsHash });
    },
    /**
     * Checks whether the text hashes to the same hash.
     */
    equals(text, hash) {
        return this.hash(text).then((hashValue) => hashValue.hash === hash);
    },
};
exports.BcryptHash = {
    tag: "bcrypt",
    hash(text) {
        return bcryptjs_1.default.hash(text, 10).then((hash) => {
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
        return bcryptjs_1.default.compare(text, hash);
    },
};
exports.Hashes = [ShaHash, exports.Md5Hash, exports.BcryptHash];
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
function hasMediaType(container, testFor) {
    return (container & testFor) === testFor;
}
exports.hasMediaType = hasMediaType;
function allTypes() {
    return Object.values(MediaType)
        .reduce((previousValue, currentValue) => previousValue | currentValue) || 0;
}
exports.allTypes = allTypes;
function combiIndex(value) {
    const combi = Number(`${value.totalIndex}.${value.partialIndex || 0}`);
    if (Number.isNaN(combi)) {
        throw Error(`invalid argument: total: '${value.totalIndex}', partial: '${value.partialIndex}'`);
    }
    return combi;
}
exports.combiIndex = combiIndex;
function checkIndices(value) {
    if (value.totalIndex == null || value.totalIndex < -1) {
        throw Error("invalid toc content, totalIndex invalid");
    }
    if (value.partialIndex != null && (value.partialIndex < 0 || !Number.isInteger(value.partialIndex))) {
        throw Error("invalid toc content, partialIndex invalid");
    }
}
exports.checkIndices = checkIndices;
function extractIndices(groups, allPosition, totalPosition, partialPosition) {
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
exports.extractIndices = extractIndices;
const indexRegex = /(-?\d+)(\.(\d+))?/;
function separateIndex(value) {
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
    return { totalIndex, partialIndex };
}
exports.separateIndex = separateIndex;
function createCircularReplacer() {
    const seen = new WeakSet();
    return (key, value) => {
        if (typeof value === "object" && value !== null) {
            if (seen.has(value)) {
                return "[circular Reference]";
            }
            seen.add(value);
        }
        return value;
    };
}
exports.createCircularReplacer = createCircularReplacer;
function ignore() {
    return undefined;
}
exports.ignore = ignore;
/**
 * Searches for a project directory by searching  current working directory
 * and all its parent directories for a package.json.
 *
 * Relativize the path of file to project dir.
 */
function findProjectDirPath(file) {
    let dir = process.cwd();
    let filePath = file;
    let currentDirFiles = fs.readdirSync(dir);
    while (!currentDirFiles.includes("package.json")) {
        filePath = ".." + path.sep + filePath;
        dir = path.dirname(dir);
        currentDirFiles = fs.readdirSync(dir);
    }
    return filePath;
}
exports.findProjectDirPath = findProjectDirPath;
function isQuery(value) {
    return value && typeof value.on === "function" && typeof value.stream === "function";
}
exports.isQuery = isQuery;
class InternetTesterImpl extends events_1.default {
    constructor() {
        super();
        this.offline = undefined;
        this.since = new Date();
        this.checkInternet();
    }
    on(evt, listener) {
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
    checkInternet() {
        dns.promises.lookup("google.com")
            .then(() => {
            if (this.offline || this.offline == null) {
                this.offline = false;
                const since = new Date();
                this.emit("online", this.since);
                this.since = since;
            }
        })
            .catch(() => {
            if (!this.offline) {
                this.offline = true;
                const since = new Date();
                this.emit("offline", this.since);
                this.since = since;
            }
        })
            .finally(() => setTimeout(() => this.checkInternet(), 1000));
    }
}
exports.internetTester = new InternetTesterImpl();
//# sourceMappingURL=tools.js.map