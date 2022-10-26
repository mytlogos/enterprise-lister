"use strict";
import dns from "dns";
import logger from "../logger";
import * as tools from "../tools";
import { internetTester } from "../internetTester";
import { v1, NIL as NIL_UUID, v4 } from "uuid";
import { Nullable } from "../types";

process.on("unhandledRejection", () => console.log("an unhandled rejection!"));
process.on("uncaughtException", (args) => console.log("an unhandled exception!", args));
afterAll(() => internetTester.stop());

type TimeUnit = "Seconds" | "Minutes" | "Hours" | "Date" | "Week" | "Month" | "FullYear";

/**
 * A test case convenience function for the relativeToAbsoluteTime function.
 * Ignores differences in milliseconds.
 *
 * @param value string to parse
 * @param offset offset to the past in seconds
 */
function testRelative(value: string, offset: number, unit: TimeUnit): void {
  const result = tools.relativeToAbsoluteTime(value) as Date;
  expect(result).toBeDefined();

  // ignore milliseconds
  result.setMilliseconds(0);
  const now = new Date();
  now.setMilliseconds(0);

  if (unit === "Week") {
    now.setDate(now.getDate() - offset * 7);
  } else {
    const setter = now[`set${unit}`].bind(now);
    const getter = now[`get${unit}`].bind(now);
    setter(getter() - offset);
  }

  expect(result.getTime() / 1000).toBeCloseTo(now.getTime() / 1000, 0);
}

/**
 * Test whether "relativeToAbsoluteTime" parses a relative date
 * correctly for multiple values of a given unit like
 * "second|minute|hour|day|week|month|year".
 */
function testRelativeUnit(unitName: string, unit: TimeUnit) {
  testRelative(`1 ${unitName} ago`, 1, unit);
  testRelative(`a ${unitName} ago`, 1, unit);
  testRelative(`5 ${unitName}s ago`, 5, unit);
}

describe("testing tool.js", () => {
  const mocks = [] as jest.SpyInstance[];

  beforeAll(() => {
    for (const key of Object.keys(console)) {
      // @ts-expect-error
      if (typeof console[key] === "function") {
        // @ts-expect-error
        mocks.push(jest.spyOn(console, key));
      }
    }

    for (const key of Object.keys(logger)) {
      // @ts-expect-error
      if (typeof logger[key] === "function") {
        // @ts-expect-error
        mocks.push(jest.spyOn(logger, key).mockImplementation(() => undefined));
      }
    }
  });
  afterAll(() => mocks.forEach((value) => value.mockRestore()));
  describe("hash functions", () => {
    const tags = [] as string[];
    const testStrings = ["", "a", "11237897319283781927397$!()=()89"];

    for (const hashTool of tools.Hashes) {
      it(`should have valid tag - '${hashTool.tag}'`, () => {
        expect(hashTool.tag).toBeDefined();
        expect(typeof hashTool.tag).toBe("string");
        expect(hashTool.tag.length).toBeGreaterThan(0);
      });
      it(`should have unique tag - '${hashTool.tag}'`, () => {
        expect(tags).not.toContain(hashTool.tag);
        tags.push(hashTool.tag);
      });
      it(`should not be empty - '${hashTool.tag}'`, async () => {
        for (const testString of testStrings) {
          const result = await hashTool.hash(testString);
          expect(typeof result.hash).toBe("string");
          expect(result.hash.length).toBeGreaterThan(0);
        }
      });
      it(`should always return true if same string - '${hashTool.tag}'`, async () => {
        for (const testString of testStrings) {
          const hash = await hashTool.hash(testString);
          await expect(hashTool.equals(testString, hash.hash, hash.salt)).resolves.toBe(true);
        }
      });
      it(`hash should throw ${hashTool.tag}'`, async () => {
        // @ts-expect-error
        await expect(hashTool.hash(undefined)).rejects.toBeDefined();
      });
      it(`equals should throw ${hashTool.tag}'`, async () => {
        // @ts-expect-error
        await expect(hashTool.equals(undefined, "123", "123")).rejects.toBeDefined();
      });
    }
  });
  describe.skip("internet tester", () => {
    const internetMocks = [] as jest.SpyInstance[];
    let up = false;

    beforeAll(() => {
      jest
        .spyOn(dns.promises, "lookup")
        .mockImplementation(() =>
          up ? Promise.resolve({ address: "", family: 0 }) : Promise.reject(Error("is down")),
        );
      jest.spyOn(internetTester, "isOnline").mockImplementation(() => up);
    });
    beforeEach(() => internetTester.stop());
    afterAll(() => internetMocks.forEach((value) => value.mockRestore()));

    it("should fire online event within time limit", () => {
      jest.setTimeout(3000);
      internetTester.start();
      return tools.delay(500).then(() => {
        return new Promise<void>((resolve, reject) => {
          try {
            expect(internetTester.isOnline()).toBe(false);
            internetTester.on("online", () => {
              expect(internetTester.isOnline()).toBe(true);
              resolve();
            });
            up = true;
          } catch (e) {
            reject(e);
          }
        });
      });
    });
    it("should fire offline event within time limit", () => {
      jest.setTimeout(3000);
      internetTester.start();
      return tools.delay(500).then(() => {
        return new Promise<void>((resolve, reject) => {
          try {
            expect(internetTester.isOnline()).toBe(true);
            internetTester.on("offline", () => {
              expect(internetTester.isOnline()).toBe(false);
              resolve();
            });
            up = false;
          } catch (e) {
            reject(e);
          }
        });
      });
    });
    it("should be called at least once", async () => {
      internetTester.start();
      await tools.delay(1100);
      expect(dns.promises.lookup).toBeCalled();
    });
  });
  describe("test remove", () => {
    it("should remove item with '===' equality", () => {
      const items = [1, 2, 3, undefined, 4, null];

      // @ts-expect-error
      tools.remove(items, "1");
      expect(items).toEqual([1, 2, 3, undefined, 4, null]);

      tools.remove(items, 1);
      expect(items).toEqual([2, 3, undefined, 4, null]);

      tools.remove(items, 1);
      expect(items).toEqual([2, 3, undefined, 4, null]);

      tools.remove(items, undefined);
      expect(items).toEqual([2, 3, 4, null]);

      tools.remove(items, null);
      expect(items).toEqual([2, 3, 4]);

      const emptyItems: any[] = [];
      tools.remove(emptyItems, 1);
      expect(emptyItems).toEqual([]);
    });
    it("should remove the first item only", () => {
      const items = [1, 2, 3, 1, 4];

      tools.remove(items, 1);
      expect(items).toEqual([2, 3, 1, 4]);
      tools.remove(items, 1);
      expect(items).toEqual([2, 3, 4]);
    });
  });
  describe("test removeLike", () => {
    it("should remove item with defined equality", () => {
      const items = [1, 2, 3, 4];
      // @ts-expect-error
      tools.removeLike(items, (item) => item === "1");
      expect(items).toEqual([1, 2, 3, 4]);
      // @ts-expect-error
      // eslint-disable-next-line eqeqeq
      tools.removeLike(items, (item) => item == "1");
      expect(items).toEqual([2, 3, 4]);

      tools.removeLike(items, (item) => item === 1);
      expect(items).toEqual([2, 3, 4]);

      const emptyItems: any[] = [];
      tools.removeLike(emptyItems, (item) => item === 1);
      expect(emptyItems).toEqual([]);
    });
    it("should remove the first item only", () => {
      const items = [1, 2, 3, 1, 4];

      tools.removeLike(items, (item) => item === 1);
      expect(items).toEqual([2, 3, 1, 4]);
      tools.removeLike(items, (item) => item === 1);
      expect(items).toEqual([2, 3, 4]);
    });
    it("should have one argument only for callback", () => {
      const items = [1, 2, 3, 1, 4];

      const equals = function (item: number) {
        expect(arguments.length).toBe(1);
        return item === 1;
      };
      tools.removeLike(items, equals);
      expect(items).toEqual([2, 3, 1, 4]);
      tools.removeLike(items, equals);
      expect(items).toEqual([2, 3, 4]);

      const emptyItems: any[] = [];
      tools.removeLike(emptyItems, equals);
      expect(emptyItems).toEqual([]);
    });
  });
  describe("test forEachArrayLike", () => {
    const arrayLikeMocks = [] as jest.SpyInstance[];
    const callback = jest.fn(function (_, index) {
      expect(arguments.length).toBe(2);
      expect(index).not.toBe(Number.POSITIVE_INFINITY);
      expect(index).toBeGreaterThanOrEqual(0);
    });

    afterEach(() => callback.mockReset());
    afterAll(() => arrayLikeMocks.forEach((value) => value.mockRestore()));

    it("should equal the times called and length of arrayLike", () => {
      const arrayLike = { 0: 1, 1: 2, 2: 3, 3: 4, length: 4 };

      tools.forEachArrayLike(arrayLike, callback);
      expect(callback).toBeCalledTimes(arrayLike.length);
    });
    it("should be called for each element once and in order", () => {
      const arrayLike = { 0: 1, 1: 2, 2: 3, 3: 4, length: 4 };
      tools.forEachArrayLike(arrayLike, callback);

      expect(callback).nthCalledWith(1, 1, 0);
      expect(callback).nthCalledWith(2, 2, 1);
      expect(callback).nthCalledWith(3, 3, 2);
      expect(callback).nthCalledWith(4, 4, 3);
    });
  });
  describe("test promiseMultiSingle", () => {
    it("should always return a promise", () => {
      expect(tools.promiseMultiSingle(null, () => null)).toBeInstanceOf(Promise);
      // @ts-expect-error
      expect(tools.promiseMultiSingle(null, null)).rejects.toBeDefined();
      // @ts-expect-error
      expect(tools.promiseMultiSingle([], null)).rejects.toBeDefined();
      expect(tools.promiseMultiSingle([], () => 1)).toBeInstanceOf(Promise);
      expect(tools.promiseMultiSingle(1, () => 1)).toBeInstanceOf(Promise);
      expect(tools.promiseMultiSingle({ 0: 1, length: 1 }, () => 1)).toBeInstanceOf(Promise);
    });
    it("should throw if no callback provided", async () => {
      // @ts-expect-error
      await expect(tools.promiseMultiSingle(null, null)).rejects.toBeInstanceOf(TypeError);

      // @ts-expect-error
      await expect(tools.promiseMultiSingle([], null)).rejects.toBeInstanceOf(TypeError);

      // @ts-expect-error
      await expect(tools.promiseMultiSingle([1, 2], null)).rejects.toBeInstanceOf(TypeError);
      // @ts-expect-error
      await expect(tools.promiseMultiSingle([1, 2], 1)).rejects.toBeInstanceOf(TypeError);
      // @ts-expect-error
      await expect(tools.promiseMultiSingle(2, 1)).rejects.toBeInstanceOf(TypeError);
      // @ts-expect-error
      await expect(tools.promiseMultiSingle(1, "1")).rejects.toBeInstanceOf(TypeError);
      // @ts-expect-error
      await expect(tools.promiseMultiSingle([1, 2], "1")).rejects.toBeInstanceOf(TypeError);
      // @ts-expect-error
      await expect(tools.promiseMultiSingle([1, 2], { callback: () => undefined })).rejects.toBeInstanceOf(TypeError);
      // @ts-expect-error
      await expect(tools.promiseMultiSingle(1, { callback: () => undefined })).rejects.toBeInstanceOf(TypeError);
    });
    it("should always have 3 arguments, being an item, a number and a boolean", async () => {
      const callback = jest.fn(function () {
        expect(arguments.length).toBe(3);
        // eslint-disable-next-line prefer-rest-params
        expect(arguments[1]).toBeGreaterThan(-1);
        // eslint-disable-next-line prefer-rest-params
        expect(typeof arguments[2]).toBe("boolean");
      });
      await tools.promiseMultiSingle([1, 2], callback);
      await tools.promiseMultiSingle(1, callback);
      await tools.promiseMultiSingle(null, callback);
      await tools.promiseMultiSingle(undefined, callback);
      await tools.promiseMultiSingle([undefined, null, 1, {}, "3"], callback);
    });
  });
  describe("test multiSingle", () => {
    it("should work correctly when using it with a non-array value", () => {
      const spy = jest.fn((item) => item);
      const result = tools.multiSingle("item", spy);
      expect(result).toBe("item");

      expect(spy).toBeCalledTimes(1);
      expect(spy).toBeCalledWith("item", 0, true);
    });

    it("should work correctly when using it with an array", () => {
      const spy = jest.fn((item) => item);
      const result = tools.multiSingle(["item1", "item2", "item3"], spy);
      expect(result).toEqual(["item1", "item2", "item3"]);

      expect(spy).toBeCalledTimes(3);
      expect(spy).nthCalledWith(1, "item1", 0, false);
      expect(spy).nthCalledWith(2, "item2", 1, false);
      expect(spy).nthCalledWith(3, "item3", 2, true);
    });
  });
  describe("test addMultiSingle", () => {
    it("should work correctly", () => {
      const array: number[] = [];
      let result = tools.addMultiSingle(array, null);
      expect(result).toBeUndefined();
      expect(array).toHaveLength(0);

      result = tools.addMultiSingle(array, 1);
      expect(result).toBeUndefined();
      expect(array).toEqual([1]);

      result = tools.addMultiSingle(array, [2, null, 5]);
      expect(result).toBeUndefined();
      expect(array).toEqual([1, 2, null, 5]);

      result = tools.addMultiSingle(array, null, true);
      expect(result).toBeUndefined();
      expect(array).toEqual([1, 2, null, 5, null]);
    });
  });
  describe("test removeMultiSingle", () => {
    it("should work correctly", () => {
      const array: Array<Nullable<number>> = [1, 2, 0, 2, null, 5, null];
      // should not remove null
      let result = tools.removeMultiSingle(array, null);
      expect(result).toBeUndefined();
      expect(array).toEqual([1, 2, 0, 2, null, 5, null]);

      // should remove the first null
      result = tools.removeMultiSingle(array, null, true);
      expect(result).toBeUndefined();
      expect(array).toEqual([1, 2, 0, 2, 5, null]);

      result = tools.removeMultiSingle(array, [1, 2]);
      expect(result).toBeUndefined();
      expect(array).toEqual([0, 2, 5, null]);

      result = tools.removeMultiSingle(array, 5);
      expect(result).toBeUndefined();
      expect(array).toEqual([0, 2, null]);
    });
  });
  describe("test getElseSet", () => {
    it("should work correctly", () => {
      const map = new Map<number, number>();
      let supplier = jest.fn(() => 1);

      let result = tools.getElseSet(map, 1, supplier);
      expect(result).toBe(1);
      let value = map.get(1);
      expect(value).toBeDefined();
      expect(value).toBe(1);
      expect(supplier).toBeCalledTimes(1);

      // if calling it again, callCount should not increase as it has a mapping for key
      result = tools.getElseSet(map, 1, supplier);
      expect(result).toBe(1);
      expect(supplier).toBeCalledTimes(1);

      supplier = jest.fn(() => Number.MAX_VALUE);
      // ensure it takes the value from the supplier, by using a different default value
      result = tools.getElseSet(map, 2, supplier);
      expect(result).toBe(Number.MAX_VALUE);
      value = map.get(2);
      expect(value).toBeDefined();

      expect(value).toBe(Number.MAX_VALUE);
      expect(supplier).toBeCalledTimes(1);
    });
  });
  describe("test getElseSetObj", () => {
    it("should work correctly", () => {
      const map: { [key: string]: number } = {};
      let supplier = jest.fn(() => 1);

      // @ts-expect-error
      let result = tools.getElseSetObj(map, "1", supplier);
      expect(result).toBe(1);
      let value = map["1"];
      expect(value).toBeDefined();
      expect(value).toBe(1);
      expect(supplier).toBeCalledTimes(1);

      // if calling it again, callCount should not increase as it has a mapping for key
      // @ts-expect-error
      result = tools.getElseSetObj(map, "1", supplier);
      expect(result).toBe(1);
      expect(supplier).toBeCalledTimes(1);

      supplier = jest.fn(() => Number.MAX_VALUE);
      // ensure it takes the value from the supplier, by using a different default value
      // @ts-expect-error
      result = tools.getElseSetObj(map, "2", supplier);
      expect(result).toBe(Number.MAX_VALUE);
      value = map["2"];
      expect(value).toBeDefined();
      expect(value).toBe(Number.MAX_VALUE);
      expect(supplier).toBeCalledTimes(1);
    });
  });
  describe("test unique", () => {
    it("should not modify an empty array", () => {
      let result = tools.unique([]);
      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(0);

      result = tools.unique([], (value1, value2) => value1 === value2);
      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(0);
    });
    it("should preserver order", () => {
      let result = tools.unique([1, 2, 3, 4, 4, 3, 2, 1]);
      expect(result).toBeInstanceOf(Array);
      expect(result).toEqual([1, 2, 3, 4]);

      result = tools.unique([1, 2, 3, 4, 4, 3, 2, 1], (value1, value2) => value1 === value2);
      expect(result).toBeInstanceOf(Array);
      expect(result).toEqual([1, 2, 3, 4]);
    });
    it("should work correctly on object equality", () => {
      let result = tools.unique([
        { id: 1 },
        { id: 2 },
        { id: 3 },
        { id: 4 },
        { id: 4 },
        { id: 3 },
        { id: 2 },
        { id: 1 },
      ]);
      expect(result).toBeInstanceOf(Array);
      expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 4 }, { id: 3 }, { id: 2 }, { id: 1 }]);

      result = tools.unique(
        [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 4 }, { id: 3 }, { id: 2 }, { id: 1 }],
        (value1, value2) => value1.id === value2.id,
      );
      expect(result).toBeInstanceOf(Array);
      expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]);
    });
  });
  describe("test some", () => {
    it("should work correctly on empty array", () => {
      // if array is empty, no elements could satisfy the trivial condition
      expect(tools.some([], () => true)).toBe(false);
      expect(tools.some({ length: 0 }, () => true)).toBe(false);
    });
    it("should work correctly when array is not empty", () => {
      // if at least a single element is given, it should return true, as condition is always true
      expect(tools.some([1], () => true)).toBe(true);
      expect(tools.some([null], () => true)).toBe(true);
      expect(tools.some({ 0: 1, length: 1 }, () => true)).toBe(true);
      expect(tools.some({ 0: null, length: 1 }, () => true)).toBe(true);
    });
    it("should ascertain that the predicate is used", () => {
      expect(tools.some([1], (value) => !!value)).toBe(true);
      expect(tools.some([null], (value) => !!value)).toBe(false);
      expect(tools.some({ 0: 1, length: 1 }, (value) => !!value)).toBe(true);
      expect(tools.some({ 0: null, length: 1 }, (value) => !!value)).toBe(false);
    });
    it("should ascertain that the predicate is used correctly in the given bounds", () => {
      // look at all elements except the first (in this case none)
      expect(tools.some([1], (value) => !!value, 1)).toBe(false);
      expect(tools.some([null], (value) => !!value, 1)).toBe(false);
      expect(tools.some({ 0: 1, length: 0 }, (value) => !!value, 1)).toBe(false);
      expect(tools.some({ 0: null, length: 0 }, (value) => !!value, 1)).toBe(false);

      // look at all elements except the first
      expect(tools.some([null, 1], (value) => !!value, 1)).toBe(true);
      expect(tools.some([null, null], (value) => !!value, 1)).toBe(false);
      expect(tools.some({ 0: null, 1: 1, length: 2 }, (value) => !!value, 1)).toBe(true);
      expect(tools.some({ 0: null, 1: null, length: 2 }, (value) => !!value, 1)).toBe(false);

      // look at all elements except the last
      expect(tools.some([null, 1, 2], (value) => !!value, 0, 2)).toBe(true);
      expect(tools.some([null, null, 2], (value) => !!value, 0, 2)).toBe(false);
      expect(tools.some({ 0: null, 1: 1, 2: 2, length: 3 }, (value) => !!value, 0, 2)).toBe(true);
      expect(tools.some({ 0: null, 1: null, 2: 2, length: 3 }, (value) => !!value, 0, 2)).toBe(false);

      // look at second element only
      expect(tools.some([null, null, 1], (value) => !!value, 1, 2)).toBe(false);
      expect(tools.some([null, 1, null], (value) => !!value, 1, 2)).toBe(true);
      expect(tools.some({ 0: null, 1: null, 2: 1, length: 3 }, (value) => !!value, 1, 2)).toBe(false);
      expect(tools.some({ 0: null, 1: 1, 2: null, length: 3 }, (value) => !!value, 1, 2)).toBe(true);

      // look at no elements
      expect(tools.some([1, 2, 3, 4], (value) => !!value, 1, 0)).toBe(false);
      expect(tools.some([null, 2, 3, 4], (value) => !!value, 1, 0)).toBe(false);
    });
    it("should throw when using invalid range", () => {
      expect(() => tools.some([1, 2, 3, 4], () => true, -1)).toThrowError();
      expect(() => tools.some([1, 2, 3, 4], () => true, 0, 5)).toThrowError();
      expect(() => tools.some([1, 2, 3, 4], () => true, -1, 0)).toThrowError();
      expect(() => tools.some([1, 2, 3, 4], () => true, -1, 5)).toThrowError();
    });
  });
  describe("test equalsIgnore", () => {
    it("should work correctly", () => {
      expect(tools.equalsIgnore("", "a")).toBe(false);
      // should equal a same string
      expect(tools.equalsIgnore("", "")).toBe(true);
      // should equal a same string
      expect(tools.equalsIgnore("a", "a")).toBe(true);

      // test commutative property of equality
      expect(tools.equalsIgnore("a", "A")).toBe(true);
      expect(tools.equalsIgnore("A", "a")).toBe(true);

      expect(tools.equalsIgnore("a", "ASBB")).toBe(false);

      // test transitive property of equality
      expect(tools.equalsIgnore("Alfred's", "Alfred´s")).toBe(true);
      expect(tools.equalsIgnore("Alfred's", "Alfred`s")).toBe(true);
      expect(tools.equalsIgnore("Alfred´s", "Alfred`s")).toBe(true);
    });
  });
  describe("test contains", () => {
    it("should work correctly", () => {
      // empty string cannot contain any non empty string
      expect(tools.contains("", "a")).toBe(false);
      // should always contain an empty string
      expect(tools.contains("", "")).toBe(true);
      expect(tools.contains("a", "")).toBe(true);

      expect(tools.contains("a", "A")).toBe(true);
      expect(tools.contains("A", "a")).toBe(true);

      expect(tools.contains("a", "ASBB")).toBe(false);
      expect(tools.contains("ASBB", "a")).toBe(true);

      expect(tools.contains("Alfred's", "Alfred´s")).toBe(true);
      expect(tools.contains("Sigmund Alfred's", "Alfred`s")).toBe(true);
      expect(tools.contains("Alfred´s", "Sigmund expect(Alfred`s")).toBe(false);
    });
  });
  describe("test countOccurrence", () => {
    it("should work correctly", () => {
      const result = tools.countOccurrence([1, 5, 2, 3, 4, 5, 5, null, null, null]);
      expect([...result.entries()].sort((a, b) => (a[0] || 0) - (b[0] || 0))).toEqual([
        [null, 3],
        [1, 1],
        [2, 1],
        [3, 1],
        [4, 1],
        [5, 3],
      ]);
    });
  });
  describe("test max", () => {
    it("should return nothing on empty array", () => {
      expect(tools.max([], "id")).toBeUndefined();
      expect(tools.max([], (value, other) => value - other)).toBeUndefined();
    });
    it("should work correctly when using comparator", () => {
      let result = tools.max([4, 2, 3, 1], (value, other) => value - other);
      expect(result).toBe(4);

      result = tools.max([4, 2, 3, 1], (value, other) => other - value);
      expect(result).toBe(1);
    });
    it("should work correctly when using field comparator", () => {
      const result = tools.max([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }], "id");
      expect(result).toEqual({ id: 4 });
    });
  });
  describe("test maxValue", () => {
    it("should work correctly", () => {
      const result = tools.maxValue([1, 4, 3, 2]);
      expect(result).toBe(4);
    });
  });
  describe("test min", () => {
    it("should return nothing on empty array", () => {
      expect(tools.min([], "id")).toBeUndefined();
      expect(tools.min([], (value, other) => value - other)).toBeUndefined();
    });
    it("should work correctly when using comparator", () => {
      let result = tools.min([4, 2, 3, 1], (value, other) => value - other);
      expect(result).toBe(1);

      result = tools.min([4, 2, 3, 1], (value, other) => other - value);
      expect(result).toBe(4);
    });
    it("should work correctly when using field comparator", () => {
      const result = tools.min([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }], "id");
      expect(result).toEqual({ id: 1 });
    });
  });
  describe("test minValue", () => {
    it("should work correctly", () => {
      const result = tools.minValue([1, 4, 3, 2]);
      expect(result).toBe(1);
    });
  });
  describe("test relativeToAbsoluteTime", () => {
    it("should return null on invalid relative time", () => {
      expect(tools.relativeToAbsoluteTime("")).toBeNull();
      expect(tools.relativeToAbsoluteTime("27.12.2020")).toBeNull();
    });

    it("should parse 'just now' correctly", () => {
      testRelative("just now", 30, "Seconds");
    });
    it("should parse 'seconds ago' correctly", () => {
      testRelativeUnit("second", "Seconds");
    });
    it("should parse 'minutes ago' correctly", () => {
      testRelativeUnit("minute", "Minutes");
    });
    it("should parse 'hours ago' correctly", () => {
      testRelativeUnit("hour", "Hours");
    });
    it("should parse 'days ago' correctly", () => {
      testRelativeUnit("day", "Date");
    });
    it("should parse 'weeks ago' correctly", () => {
      testRelativeUnit("week", "Week");
    });
    it("should parse 'months ago' correctly", () => {
      testRelativeUnit("month", "Month");
    });
    it("should parse 'years ago' correctly", () => {
      testRelativeUnit("year", "FullYear");
    });
  });
  describe("test delay", () => {
    it("should work correctly", async () => {
      jest.setTimeout(6000);
      const start = new Date();

      await tools.delay(3000);

      const end = new Date();
      end.setSeconds(end.getSeconds() - 3);
      expect(start.getTime() / 1000).toBeCloseTo(end.getTime() / 1000, 0);
    });
  });
  describe("test equalsRelease", () => {
    it("should work correctly", () => {
      const now = new Date();

      const testRelease = {
        id: 1,
        episodeId: 1,
        releaseDate: now,
        title: "none",
        url: "google.de",
        locked: false,
      };
      // should always equals itself
      expect(tools.equalsRelease(testRelease, testRelease)).toBe(true);
      expect(
        tools.equalsRelease(testRelease, {
          id: 1,
          locked: false,
          episodeId: 1,
          releaseDate: now,
          title: "none",
          url: "google.de",
        }),
      ).toBe(true);
      expect(
        tools.equalsRelease(testRelease, {
          id: 1,
          episodeId: 1,
          releaseDate: now,
          title: "none",
          url: "google.de",
          locked: false,
        }),
      ).toBe(true);

      expect(
        tools.equalsRelease(testRelease, {
          id: 1,
          episodeId: 1,
          releaseDate: now,
          title: "none",
          url: "google.de",
          locked: true,
        }),
      ).toBe(false);
    });
  });
  describe("test stringify", () => {
    it("should work correctly", () => {
      expect(tools.stringify({ value: 5 })).toBe('{"value":5}');

      const value: any = {};
      value.value = value;
      expect(tools.stringify(value)).toBe('{"value":"[circular reference]"}');
      expect(tools.stringify([value, value, 1])).toBe('[{"value":"[circular reference]"},"[circular reference]",1]');
    });
  });
  describe("test sanitizeString", () => {
    it("should normalize multiple whitespaces", () => {
      expect(tools.sanitizeString("    ")).toBe("");
      expect(tools.sanitizeString("a    ")).toBe("a");
      expect(tools.sanitizeString("    a")).toBe("a");
      expect(tools.sanitizeString("  a  ")).toBe("a");
      expect(tools.sanitizeString("  a     b  ")).toBe("a b");
    });
  });
  describe("test isString", () => {
    it("should work correctly", () => {
      expect(tools.isString("")).toBe(true);
      expect(tools.isString(String("hello"))).toBe(true);

      expect(tools.isString(1)).toBe(false);
      expect(tools.isString(() => "true")).toBe(false);
      expect(tools.isString({})).toBe(false);
      expect(tools.isString(true)).toBe(false);
      expect(tools.isString([])).toBe(false);
      expect(tools.isString(Object())).toBe(false);
    });
  });
  describe("test stringToNumberList", () => {
    it("should work correctly", () => {
      expect(tools.stringToNumberList("")).toEqual([]);
      expect(tools.stringToNumberList("[]")).toEqual([]);
      expect(tools.stringToNumberList("hello")).toEqual([]);
      expect(tools.stringToNumberList("{1,2,3,4}")).toEqual([]);
      expect(tools.stringToNumberList('["1"]')).toEqual([]);
      expect(tools.stringToNumberList("true")).toEqual([]);
      expect(tools.stringToNumberList("() => [1,2,3,4]")).toEqual([]);
      expect(tools.stringToNumberList("1")).toEqual([]);

      expect(tools.stringToNumberList("[1]")).toEqual([1]);
      expect(tools.stringToNumberList("[2]")).toEqual([2]);
      expect(tools.stringToNumberList("[3,4]")).toEqual([3, 4]);
      expect(tools.stringToNumberList("[ 3,  4]")).toEqual([3, 4]);
      expect(tools.stringToNumberList("[3.1, 4.2]")).toEqual([3.1, 4.2]);
    });
  });
  describe("test isError", () => {
    it("should work correctly", () => {
      expect(tools.isError(1)).toBe(false);
      expect(tools.isError(true)).toBe(false);
      expect(tools.isError([])).toBe(false);
      expect(tools.isError({})).toBe(false);
      expect(tools.isError(tools.Errors)).toBe(false);
      expect(tools.isError("")).toBe(false);

      expect(tools.isError(tools.Errors.CORRUPT_DATA)).toBe(true);
      expect(tools.isError("CORRUPT_DATA")).toBe(true);
    });
  });
  describe("test hasMediaType", () => {
    it("should work correctly", () => {
      expect(tools.hasMediaType(0, tools.MediaType.VIDEO)).toBe(false);
      expect(tools.hasMediaType(0, 1)).toBe(false);
      expect(tools.hasMediaType(4, 1)).toBe(false);
      expect(tools.hasMediaType(0, 0)).toBe(true);
      expect(tools.hasMediaType(1, 1)).toBe(true);
      expect(tools.hasMediaType(1, tools.MediaType.TEXT)).toBe(true);
      expect(tools.hasMediaType(15, tools.MediaType.TEXT)).toBe(true);
      expect(tools.hasMediaType(15, tools.MediaType.VIDEO | tools.MediaType.AUDIO)).toBe(true);
    });
  });
  describe("test allTypes", () => {
    it("should work correctly", () => {
      expect(tools.allTypes()).toBe(15);
      expect(tools.allTypes()).toBe(
        tools.MediaType.AUDIO | tools.MediaType.IMAGE | tools.MediaType.VIDEO | tools.MediaType.TEXT,
      );
    });
  });
  describe("test combiIndex", () => {
    it("should work correctly", () => {
      expect(tools.combiIndex({ totalIndex: 1 })).toBe(1);
      expect(tools.combiIndex({ totalIndex: -1 })).toBe(-1);
      expect(tools.combiIndex({ totalIndex: 1, partialIndex: undefined })).toBe(1);
      expect(tools.combiIndex({ totalIndex: 1, partialIndex: NaN })).toBe(1);
      expect(tools.combiIndex({ totalIndex: 1, partialIndex: 5 })).toBe(1.5);
      expect(tools.combiIndex({ totalIndex: 1, partialIndex: Number.MIN_VALUE })).toBe(0);
    });
    it("should throw when giving invalid parameter", () => {
      expect(() => tools.combiIndex({ totalIndex: NaN })).toThrowError();
      expect(() => tools.combiIndex({ totalIndex: Number.POSITIVE_INFINITY })).toThrowError();
      expect(() => tools.combiIndex({ totalIndex: Number.NEGATIVE_INFINITY })).toThrowError();
      expect(() => tools.combiIndex({ totalIndex: Number.MAX_VALUE })).toThrowError();
      expect(() => tools.combiIndex({ totalIndex: Number.MIN_VALUE })).toThrowError();
      expect(() => tools.combiIndex({ totalIndex: 1, partialIndex: Number.NEGATIVE_INFINITY })).toThrowError();
      expect(() => tools.combiIndex({ totalIndex: 1, partialIndex: Number.POSITIVE_INFINITY })).toThrowError();
      expect(() => tools.combiIndex({ totalIndex: 1, partialIndex: Number.MAX_VALUE })).toThrowError();
    });
  });
  describe("test checkIndices", () => {
    it("should work correctly", () => {
      tools.checkIndices({ totalIndex: -1 });
      tools.checkIndices({ totalIndex: -1, partialIndex: undefined });
      tools.checkIndices({ totalIndex: 0 });
      tools.checkIndices({ totalIndex: 100 });
      tools.checkIndices({ totalIndex: -1, partialIndex: 0 });
      tools.checkIndices({ totalIndex: -1, partialIndex: 1 });
      tools.checkIndices({ totalIndex: 100, partialIndex: 0 });
      tools.checkIndices({ totalIndex: 11231, partialIndex: 15021 });
      expect(() => tools.checkIndices({ totalIndex: -2 })).toThrowError();
      expect(() => tools.checkIndices({ totalIndex: NaN })).toThrowError();
      expect(() => tools.checkIndices({ totalIndex: -1.5 })).toThrowError();
      expect(() => tools.checkIndices({ totalIndex: 111.5 })).toThrowError();
      expect(() => tools.checkIndices({ totalIndex: 10, partialIndex: -1 })).toThrowError();
      expect(() => tools.checkIndices({ totalIndex: 12, partialIndex: 123.3 })).toThrowError();
      expect(() => tools.checkIndices({ totalIndex: 10, partialIndex: NaN })).toThrowError();
    });
  });
  describe("test separateIndices", () => {
    it("should work correctly", () => {
      // @ts-expect-error
      expect(() => tools.separateIndex("")).toThrowError("not a number");
      // @ts-expect-error
      expect(() => tools.separateIndex("7.0")).toThrowError("not a number");

      expect(tools.separateIndex(1)).toEqual({ totalIndex: 1, partialIndex: undefined });
      expect(tools.separateIndex(-1)).toEqual({ totalIndex: -1, partialIndex: undefined });
      expect(tools.separateIndex(1.5)).toEqual({ totalIndex: 1, partialIndex: 5 });
      expect(tools.separateIndex(-1.5)).toEqual({ totalIndex: -1, partialIndex: 5 });

      expect(tools.separateIndex(11230.51239)).toEqual({ totalIndex: 11230, partialIndex: 51239 });
      expect(tools.separateIndex(-11230.51239)).toEqual({ totalIndex: -11230, partialIndex: 51239 });
      expect(tools.separateIndex(11230.51239)).toEqual({ totalIndex: 11230, partialIndex: 51239 });
      expect(tools.separateIndex(-11230.51239)).toEqual({ totalIndex: -11230, partialIndex: 51239 });
    });
  });
  describe("test ignore", () => {
    it("should work correctly", () => {
      expect(tools.ignore()).toBeUndefined();
      // @ts-expect-error
      expect(tools.ignore(123, "sd", true, {})).toBeUndefined();
    });
  });
  describe("test findProjectDirPath", () => {
    it.todo("should not throw when using valid parameters");
  });
  describe("test isQuery", () => {
    it.todo("should not throw when using valid parameters");
  });
  describe("test isInvalidId", () => {
    it("should never throw", () => {
      tools.isInvalidId("");
      tools.isInvalidId("1212368");
      tools.isInvalidId(1);
      tools.isInvalidId(() => null);
      tools.isInvalidId(null);
      tools.isInvalidId(true);
      tools.isInvalidId(undefined);
    });
    it("should validate correctly", () => {
      expect(tools.isInvalidId("")).toBe(true);
      expect(tools.isInvalidId("1212368")).toBe(true);
      expect(tools.isInvalidId(Number.MIN_VALUE)).toBe(true);
      expect(tools.isInvalidId(-1)).toBe(true);
      expect(tools.isInvalidId(0)).toBe(true);
      expect(tools.isInvalidId(0.6)).toBe(true);
      expect(tools.isInvalidId(120.1)).toBe(true);
      expect(tools.isInvalidId(Number.POSITIVE_INFINITY)).toBe(true);
      expect(tools.isInvalidId(NaN)).toBe(true);
      expect(tools.isInvalidId(() => null)).toBe(true);
      expect(tools.isInvalidId(null)).toBe(true);
      expect(tools.isInvalidId(true)).toBe(true);
      expect(tools.isInvalidId(undefined)).toBe(true);

      expect(tools.isInvalidId(1)).toBe(false);
      expect(tools.isInvalidId(1239090909)).toBe(false);
      expect(tools.isInvalidId(Number.MAX_VALUE)).toBe(false);
    });
  });

  describe("test invalidUuid", () => {
    it("should never throw", () => {
      tools.validUuid("");
      tools.validUuid("1212368");
      tools.validUuid(v1());
      tools.validUuid(v4());
      tools.validUuid(NIL_UUID);
      tools.validUuid(1);
      tools.validUuid(() => null);
      tools.validUuid(null);
      tools.validUuid(true);
      tools.validUuid(undefined);
    });
    it("should validate correctly", () => {
      expect(tools.validUuid("")).toBe(false);
      expect(tools.validUuid("1212368")).toBe(false);
      expect(tools.validUuid(1)).toBe(false);
      expect(tools.validUuid(() => null)).toBe(false);
      expect(tools.validUuid(null)).toBe(false);
      expect(tools.validUuid(false)).toBe(false);
      expect(tools.validUuid(undefined)).toBe(false);

      expect(tools.validUuid(NIL_UUID)).toBe(true);
      expect(tools.validUuid(v1())).toBe(true);
      expect(tools.validUuid(v4())).toBe(true);
    });
  });
  describe("never call output functions", () => {
    it("should never call console", () => {
      for (const key of Object.keys(console)) {
        // @ts-expect-error
        if (typeof console[key] === "function") {
          // @ts-expect-error
          expect(console[key]).toBeCalledTimes(0);
        }
      }
    });
    it("should never call logger", () => {
      for (const key of Object.keys(logger)) {
        // @ts-expect-error
        if (typeof logger[key] === "function") {
          // @ts-expect-error
          expect(logger[key]).toBeCalledTimes(0);
        }
      }
    });
  });
});
