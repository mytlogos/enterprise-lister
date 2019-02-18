export function remove<T>(array: T[], item: T): boolean {
    const index = array.indexOf(item);
    if (index < 0) {
        return false;
    }
    array.splice(index, 1);
    return true;
}

export function forEachArrayLike<T>(arrayLike: ArrayLike<T>, callback: (value: T, index: number) => void, start = 0) {
    for (let i = start; i < arrayLike.length; i++) {
        callback(arrayLike[i], i);
    }
}

type multiSingleCallback<T, R> = (value: T, index?: number, last?: boolean) => R;

export function promiseMultiSingle<T, R>(item: T | T[], cb: multiSingleCallback<T, R>): Promise<R | R[]> {
    if (Array.isArray(item)) {
        const max = item.length - 1;
        return Promise.all(item.map((value, index) => Promise.resolve(cb(value, index, index < max))));
    }
    return new Promise((resolve, reject) => {
        try {
            resolve(cb(item));
        } catch (e) {
            reject(e);
        }
    });
}

export function multiSingle<T, R>(item: T | T[], cb: multiSingleCallback<T, R>): R | R[] {
    if (Array.isArray(item)) {
        const max = item.length - 1;
        return item.map((value, index) => cb(value, index, index < max));
    }
    return cb(item);
}

export function addMultiSingle<T>(array: T[], item: T | T[], allowNull?: boolean) {
    if (item != null || allowNull) {
        if (Array.isArray(item)) {
            array.push(...item);
        } else {
            array.push(item);
        }
    }
}

export function removeMultiSingle<T>(array: T[], item: T | T[], allowNull?: boolean) {
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


export function unique<T>(array: ArrayLike<T>, isEqualCb: (value: T, other: T) => boolean) {
    const uniques: T[] = [];
    forEachArrayLike(array, (value, index) => {
        const notUnique = some(array, (otherValue) => isEqualCb(value, otherValue), index + 1);

        if (notUnique) {
            return;
        }
        uniques.push(value);
    });
    return uniques;
}


export function some<T>(array: ArrayLike<T>, predicate: (value: T, index: number) => boolean, start: number): boolean {
    for (let i = start; i < array.length; i++) {
        if (predicate(array[i], i)) {
            return true;
        }
    }
    return false;
}
