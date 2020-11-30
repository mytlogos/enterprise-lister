"use strict";
import sinon from "sinon";
import sinon_chai from "sinon-chai";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import dns from "dns";
import logger from "../logger";
import * as tools from "../tools";
import { describe, before, after, it } from "mocha";
import { v1, NIL as NIL_UUID, v4 } from "uuid";
import { Nullable } from "../types";

chai.use(sinon_chai);
chai.use(chaiAsPromised);
const should = chai.should();

process.on("unhandledRejection", () => console.log("an unhandled rejection!"));
process.on("uncaughtException", (args) => console.log("an unhandled exception!", args));
after(() => tools.internetTester.stop());

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
    should.exist(result);

    // ignore milliseconds
    result.setMilliseconds(0);
    const now = new Date();
    now.setMilliseconds(0);

    if (unit === "Week") {
        now.setDate(now.getDate() - offset * 7);
    } else {
        // @ts-expect-error
        const setter = now[`set${unit}`].bind(now);
        // @ts-expect-error
        const getter = now[`get${unit}`].bind(now);
        setter(getter() - offset);
    }

    result.getTime().should.approximately(now.getTime(), 1000);
}

describe("testing tool.js", () => {
    const sandbox = sinon.createSandbox();
    before("setting up", () => {
        for (const key of Object.keys(console)) {
            // @ts-expect-error
            if (typeof console[key] === "function") {

                // @ts-expect-error
                sandbox.spy(console, key);
            }
        }

        for (const key of Object.keys(logger)) {
            // @ts-expect-error
            if (typeof logger[key] === "function") {
                // @ts-expect-error
                sandbox.stub(logger, key);
            }
        }
    });
    after(() => sandbox.restore());
    describe("hash functions", () => {
        // @ts-expect-error
        const tags = [];
        const testStrings = ["", "a", "11237897319283781927397$!\"()=()89"];
        for (const hashTool of tools.Hashes) {
            it(`should have valid tag - '${hashTool.tag}'`, function () {
                hashTool.should.have.own.property("tag").that.is.a("string").and.not.empty;
            });
            it(`should have unique tag - '${hashTool.tag}'`, function () {
                // @ts-expect-error
                tags.should.not.contain(hashTool.tag);
                tags.push(hashTool.tag);
            });
            it(`should not be empty - '${hashTool.tag}'`, async function () {
                for (const testString of testStrings) {
                    await hashTool.hash(testString).should.eventually.be.an("object").and.have.ownProperty("hash").that.is.a("string").and.not.empty;
                }
            });
            it(`should always return true if same string - '${hashTool.tag}'`, async function () {
                for (const testString of testStrings) {
                    /**
                     * @type {{hash: string, salt?: string}}
                     */
                    const hash = await hashTool.hash(testString);
                    // @ts-expect-error
                    await hashTool.equals(testString, hash.hash, hash.salt).should.eventually.be.true;
                }
            });
            it(`hash should throw ${hashTool.tag}'`, async function () {
                // @ts-expect-error
                await hashTool.hash(undefined).should.eventually.be.rejected;
            });
            it(`equals should throw ${hashTool.tag}'`, async function () {
                // @ts-expect-error
                await hashTool.equals(undefined, "123", "123").should.eventually.be.rejected;
            });
        }
    });
    describe("internet tester", function () {
        const internetSandbox = sinon.createSandbox();
        let up = false;

        before(function () {
            // @ts-expect-error
            internetSandbox.stub(dns.promises, "lookup").callsFake(() => up ? Promise.resolve() : Promise.reject());
            internetSandbox.stub(tools.internetTester, "isOnline").callsFake(() => up);
            // FIXME skip this this suite for now, on jenkins this fails, while in develop it does not
            this.skip();
        });
        after(() => internetSandbox.restore());

        it("should fire online event within time limit", function () {
            this.timeout(3000);
            return tools.delay(500).then(() => {
                return new Promise((resolve, reject) => {
                    try {
                        tools.internetTester.isOnline().should.be.false;
                        tools.internetTester.on("online", () => {
                            tools.internetTester.isOnline().should.be.true;
                            resolve();
                        });
                        up = true;
                    } catch (e) {
                        reject(e);
                    }
                });
            }).should.eventually.not.be.rejected;
        });
        it("should fire offline event within time limit", function () {
            this.timeout(3000);
            return tools.delay(500).then(() => {
                return new Promise((resolve, reject) => {
                    try {
                        tools.internetTester.isOnline().should.be.true;
                        tools.internetTester.on("offline", () => {
                            tools.internetTester.isOnline().should.be.false;
                            resolve();
                        });
                        up = false;
                    } catch (e) {
                        reject(e);
                    }
                });
            }).should.eventually.not.be.rejected;
        });
        // FIXME this test is somewhat broken, sinon does not stub dns.promises.lookup correctly, original function still called
        it("should be called at least once", async function () {
            this.timeout(5000);
            await tools.delay(500);
            dns.promises.lookup.should.have.been.called
        });
    });
    describe("test remove", function () {
        it("should remove item with '===' equality", function () {
            const items = [1, 2, 3, undefined, 4, null];

            // @ts-expect-error
            tools.remove(items, "1");
            items.should.be.eql([1, 2, 3, undefined, 4, null]);

            tools.remove(items, 1);
            items.should.be.eql([2, 3, undefined, 4, null]);

            tools.remove(items, 1);
            items.should.be.eql([2, 3, undefined, 4, null]);

            tools.remove(items, undefined);
            items.should.be.eql([2, 3, 4, null]);

            tools.remove(items, null);
            items.should.be.eql([2, 3, 4]);

            const emptyItems: any[] = [];
            tools.remove(emptyItems, 1);
            emptyItems.should.be.eql([]);
        });
        it("should remove the first item only", function () {
            const items = [1, 2, 3, 1, 4];

            tools.remove(items, 1);
            items.should.be.eql([2, 3, 1, 4]);
            tools.remove(items, 1);
            items.should.be.eql([2, 3, 4]);
        });
    });
    describe("test removeLike", function () {
        it("should remove item with defined equality", function () {
            const items = [1, 2, 3, 4];
            // @ts-expect-error
            tools.removeLike(items, item => item === "1");
            items.should.be.eql([1, 2, 3, 4]);
            // @ts-expect-error
            tools.removeLike(items, item => item == "1");
            items.should.be.eql([2, 3, 4]);

            tools.removeLike(items, item => item === 1);
            items.should.be.eql([2, 3, 4]);

            const emptyItems: any[] = [];
            tools.removeLike(emptyItems, item => item === 1);
            emptyItems.should.be.eql([]);
        });
        it("should remove the first item only", function () {
            const items = [1, 2, 3, 1, 4];

            tools.removeLike(items, item => item === 1);
            items.should.be.eql([2, 3, 1, 4]);
            tools.removeLike(items, item => item === 1);
            items.should.be.eql([2, 3, 4]);
        });
        it("should have one argument only for callback", function () {
            const items = [1, 2, 3, 1, 4];

            const equals = function (item: number) {
                arguments.length.should.be.equal(1);
                arguments.length.should.not.be.equal("1");
                return item === 1;
            };
            tools.removeLike(items, equals);
            items.should.be.eql([2, 3, 1, 4]);
            tools.removeLike(items, equals);
            items.should.be.eql([2, 3, 4]);

            const emptyItems: any[] = [];
            tools.removeLike(emptyItems, equals);
            emptyItems.should.be.eql([]);
        });
    });
    describe("test forEachArrayLike", function () {
        const arrayLikeSandbox = sinon.createSandbox();
        // @ts-expect-error
        let callback;

        before(() => {
            callback = arrayLikeSandbox.stub().callsFake(function () {
                arguments.should.have.length(2);
                // eslint-disable-next-line prefer-rest-params
                arguments[1].should.be.finite;
            });
        });
        // @ts-expect-error
        afterEach(() => callback.reset());
        after(() => arrayLikeSandbox.restore());

        it("should equal the times called and length of arrayLike", function () {
            const arrayLike = { 0: 1, 1: 2, 2: 3, 3: 4, length: 4 };
            // @ts-expect-error
            tools.forEachArrayLike(arrayLike, callback);
            // @ts-expect-error
            callback.should.have.callCount(arrayLike.length);
        });
        it("should be called for each element once and in order", function () {
            const arrayLike = { 0: 1, 1: 2, 2: 3, 3: 4, length: 4 };
            // @ts-expect-error
            tools.forEachArrayLike(arrayLike, callback);

            // @ts-expect-error
            const firstCall = callback.getCall(0);
            // @ts-expect-error
            const secondCall = callback.getCall(1);
            // @ts-expect-error
            const thirdCall = callback.getCall(2);
            // @ts-expect-error
            const fourthCall = callback.getCall(3);

            firstCall.should.be.calledBefore(secondCall).and.be.calledBefore(fourthCall);
            secondCall.should.be.calledBefore(thirdCall);
            thirdCall.should.be.calledBefore(fourthCall);

            firstCall.should.be.calledWith(1, 0);
            secondCall.should.be.calledWith(2, 1);
            thirdCall.should.be.calledWith(3, 2);
            fourthCall.should.be.calledWith(4, 3);
        });
    });
    describe("test promiseMultiSingle", function () {
        it("should always return a promise", function () {
            return Promise.all([
                tools.promiseMultiSingle(null, () => null).should.be.a("promise"),
                // @ts-expect-error
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                tools.promiseMultiSingle(null, null).catch(() => {
                }).should.be.a("promise"),
                // @ts-expect-error
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                tools.promiseMultiSingle([], null).catch(() => {
                }).should.be.a("promise"),
                tools.promiseMultiSingle([], () => 1).should.be.a("promise"),
                tools.promiseMultiSingle(1, () => 1).should.be.a("promise"),
                tools.promiseMultiSingle({ 0: 1, length: 1 }, () => 1).should.be.a("promise"),
            ]);
        });
        it("should throw if no callback provided", async function () {

            // @ts-expect-error
            await tools.promiseMultiSingle(null, null).should.be.rejectedWith(TypeError);

            // @ts-expect-error
            await tools.promiseMultiSingle([], null).should.be.rejectedWith(TypeError);

            // @ts-expect-error
            await tools.promiseMultiSingle([1, 2], null).should.be.rejectedWith(TypeError);
            // @ts-expect-error
            await tools.promiseMultiSingle([1, 2], 1).should.be.rejectedWith(TypeError);
            // @ts-expect-error
            await tools.promiseMultiSingle(2, 1).should.be.rejectedWith(TypeError);
            // @ts-expect-error
            await tools.promiseMultiSingle(1, "1").should.be.rejectedWith(TypeError);
            // @ts-expect-error
            await tools.promiseMultiSingle([1, 2], "1").should.be.rejectedWith(TypeError);
            // @ts-expect-error
            await tools.promiseMultiSingle([1, 2], { callback: () => undefined }).should.be.rejectedWith(TypeError);
            // @ts-expect-error
            await tools.promiseMultiSingle(1, { callback: () => undefined }).should.be.rejectedWith(TypeError);
        });
        it("should always have 3 arguments, being an item, a number and a boolean", async function () {
            const callback = sandbox.stub().callsFake(function () {
                arguments.should.have.length(3);
                // eslint-disable-next-line prefer-rest-params
                arguments[1].should.be.finite.and.above(-1);
                // eslint-disable-next-line prefer-rest-params
                arguments[2].should.be.a("boolean");
            });
            await tools.promiseMultiSingle([1, 2], callback);
            await tools.promiseMultiSingle(1, callback);
            await tools.promiseMultiSingle(null, callback);
            await tools.promiseMultiSingle(undefined, callback);
            await tools.promiseMultiSingle([undefined, null, 1, {}, "3"], callback);
        });
    });
    describe("test multiSingle", function () {
        it("should work correctly when using it with a non-array value", () => {
            const spy = sinon.spy((item) => item);
            const result = tools.multiSingle("item", spy);
            result.should.equal("item");

            spy.should.have.callCount(1);
            spy.should.have.been.calledWith("item", 0, true);
        });

        it("should work correctly when using it with an array", () => {
            const spy = sinon.spy((item) => item);
            const result = tools.multiSingle(["item1", "item2", "item3"], spy);
            result.should.deep.equal(["item1", "item2", "item3"]);

            spy.should.have.callCount(3);
            spy.args[0].should.deep.equal(["item1", 0, false]);
            spy.args[1].should.deep.equal(["item2", 1, false]);
            spy.args[2].should.deep.equal(["item3", 2, true]);
        });
    });
    describe("test addMultiSingle", function () {
        it("should work correctly", () => {
            const array: number[] = [];
            let result = tools.addMultiSingle(array, null);
            should.not.exist(result);
            array.should.be.empty;

            result = tools.addMultiSingle(array, 1);
            should.not.exist(result);
            array.should.deep.equal([1]);

            result = tools.addMultiSingle(array, [2, null, 5]);
            should.not.exist(result);
            array.should.deep.equal([1, 2, null, 5]);

            result = tools.addMultiSingle(array, null, true);
            should.not.exist(result);
            array.should.deep.equal([1, 2, null, 5, null]);
        });
    });
    describe("test removeMultiSingle", function () {
        it("should work correctly", () => {
            const array: Array<Nullable<number>> = [1, 2, 0, 2, null, 5, null];
            // should not remove null
            let result = tools.removeMultiSingle(array, null);
            should.not.exist(result);
            array.should.be.deep.equal([1, 2, 0, 2, null, 5, null]);

            // should remove the first null
            result = tools.removeMultiSingle(array, null, true);
            should.not.exist(result);
            array.should.be.deep.equal([1, 2, 0, 2, 5, null]);

            result = tools.removeMultiSingle(array, [1, 2]);
            should.not.exist(result);
            array.should.deep.equal([0, 2, 5, null]);

            result = tools.removeMultiSingle(array, 5);
            should.not.exist(result);
            array.should.deep.equal([0, 2, null]);
        });
    });
    describe("test getElseSet", function () {
        it("should work correctly", () => {
            const map = new Map<number, number>();
            let supplier = sinon.spy(() => 1);

            let result = tools.getElseSet(map, 1, supplier);
            result.should.equal(1);
            let value = map.get(1);
            should.exist(value);
            // @ts-expect-error
            value.should.equal(1);
            supplier.should.have.callCount(1);

            // if calling it again, callCount should not increase as it has a mapping for key
            result = tools.getElseSet(map, 1, supplier);
            result.should.equal(1);
            supplier.should.have.callCount(1);

            supplier = sinon.spy(() => Number.MAX_VALUE);
            // ensure it takes the value from the supplier, by using a different default value
            result = tools.getElseSet(map, 2, supplier);
            result.should.equal(Number.MAX_VALUE);
            value = map.get(2);
            should.exist(value);
            // @ts-expect-error
            value.should.equal(Number.MAX_VALUE);
            supplier.should.have.callCount(1);
        });
    });
    describe("test getElseSetObj", function () {
        it("should work correctly", () => {
            const map: { [key: string]: number } = {};
            let supplier = sinon.spy(() => 1);

            // @ts-expect-error
            let result = tools.getElseSetObj(map, "1", supplier);
            result.should.equal(1);
            let value = map["1"];
            should.exist(value);
            value.should.equal(1);
            supplier.should.have.callCount(1);

            // if calling it again, callCount should not increase as it has a mapping for key
            // @ts-expect-error
            result = tools.getElseSetObj(map, "1", supplier);
            result.should.equal(1);
            supplier.should.have.callCount(1);

            supplier = sinon.spy(() => Number.MAX_VALUE);
            // ensure it takes the value from the supplier, by using a different default value
            // @ts-expect-error
            result = tools.getElseSetObj(map, "2", supplier);
            result.should.equal(Number.MAX_VALUE);
            value = map["2"];
            should.exist(value);
            value.should.equal(Number.MAX_VALUE);
            supplier.should.have.callCount(1);
        });
    });
    describe("test unique", function () {
        it("should not modify an empty array", () => {
            let result = tools.unique([]);
            result.should.be.an("Array");
            result.should.be.empty;

            result = tools.unique([], (value1, value2) => value1 === value2);
            result.should.be.an("Array");
            result.should.be.empty;
        });
        it("should preserver order", () => {
            let result = tools.unique([1, 2, 3, 4, 4, 3, 2, 1]);
            result.should.be.an("Array");
            result.should.be.deep.equal([1, 2, 3, 4]);

            result = tools.unique([1, 2, 3, 4, 4, 3, 2, 1], (value1, value2) => value1 === value2);
            result.should.be.an("Array");
            result.should.be.deep.equal([1, 2, 3, 4]);
        });
        it("should work correctly on object equality", () => {
            let result = tools.unique([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 4 }, { id: 3 }, { id: 2 }, { id: 1 }]);
            result.should.be.an("Array");
            result.should.be.deep.equal([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 4 }, { id: 3 }, { id: 2 }, { id: 1 }]);

            result = tools.unique(
                [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 4 }, { id: 3 }, { id: 2 }, { id: 1 }],
                (value1, value2) => value1.id === value2.id
            );
            result.should.be.an("Array");
            result.should.be.deep.equal([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]);
        });
    });
    describe("test isTocPart", function () {
        it("should work correctly when given a valid value", () => {
            tools.isTocPart({ combiIndex: 1, title: "ajsio", totalIndex: 1 }).should.equal(false);
            // @ts-expect-error
            tools.isTocPart({ combiIndex: 1, title: "ajsio", totalIndex: 1, url: "sjid" }).should.equal(false);
            // @ts-expect-error
            tools.isTocPart({ combiIndex: 1, title: "ajsio", totalIndex: 1, episodes: [] }).should.equal(true);
        });
    });
    describe("test isTocEpisode", function () {
        it("should work correctly when given a valid value", () => {
            tools.isTocEpisode({ combiIndex: 1, title: "ajsio", totalIndex: 1 }).should.equal(false);
            // @ts-expect-error
            tools.isTocEpisode({ combiIndex: 1, title: "ajsio", totalIndex: 1, episodes: [] }).should.equal(false);
            // @ts-expect-error
            tools.isTocEpisode({ combiIndex: 1, title: "ajsio", totalIndex: 1, url: "sjid" }).should.equal(true);
        });
    });
    describe("test some", function () {
        it("should work correctly on empty array", () => {
            // if array is empty, no elements could satisfy the trivial condition
            tools.some([], () => true).should.equal(false);
            tools.some({ length: 0 }, () => true).should.equal(false);
        });
        it("should work correctly when array is not empty", () => {
            // if at least a single element is given, it should return true, as condition is always true
            tools.some([1], () => true).should.equal(true);
            tools.some([null], () => true).should.equal(true);
            tools.some({ 0: 1, length: 1 }, () => true).should.equal(true);
            tools.some({ 0: null, length: 1 }, () => true).should.equal(true);
        });
        it("should ascertain that the predicate is used", () => {
            tools.some([1], (value) => !!value).should.equal(true);
            tools.some([null], (value) => !!value).should.equal(false);
            tools.some({ 0: 1, length: 1 }, (value) => !!value).should.equal(true);
            tools.some({ 0: null, length: 1 }, (value) => !!value).should.equal(false);
        });
        it("should ascertain that the predicate is used correctly in the given bounds", () => {
            // look at all elements except the first (in this case none)
            tools.some([1], (value) => !!value, 1).should.equal(false);
            tools.some([null], (value) => !!value, 1).should.equal(false);
            tools.some({ 0: 1, length: 0 }, (value) => !!value, 1).should.equal(false);
            tools.some({ 0: null, length: 0 }, (value) => !!value, 1).should.equal(false);

            // look at all elements except the first
            tools.some([null, 1], (value) => !!value, 1).should.equal(true);
            tools.some([null, null], (value) => !!value, 1).should.equal(false);
            tools.some({ 0: null, 1: 1, length: 2 }, (value) => !!value, 1).should.equal(true);
            tools.some({ 0: null, 1: null, length: 2 }, (value) => !!value, 1).should.equal(false);

            // look at all elements except the last
            tools.some([null, 1, 2], (value) => !!value, 0, 2).should.equal(true);
            tools.some([null, null, 2], (value) => !!value, 0, 2).should.equal(false);
            tools.some({ 0: null, 1: 1, 2: 2, length: 3 }, (value) => !!value, 0, 2).should.equal(true);
            tools.some({ 0: null, 1: null, 2: 2, length: 3 }, (value) => !!value, 0, 2).should.equal(false);

            // look at second element only
            tools.some([null, null, 1], (value) => !!value, 1, 2).should.equal(false);
            tools.some([null, 1, null], (value) => !!value, 1, 2).should.equal(true);
            tools.some({ 0: null, 1: null, 2: 1, length: 3 }, (value) => !!value, 1, 2).should.equal(false);
            tools.some({ 0: null, 1: 1, 2: null, length: 3 }, (value) => !!value, 1, 2).should.equal(true);

            // look at no elements
            tools.some([1, 2, 3, 4], (value) => !!value, 1, 0).should.equal(false);
            tools.some([null, 2, 3, 4], (value) => !!value, 1, 0).should.equal(false);
        });
        it("should throw when using invalid range", () => {
            should.throw(() => tools.some([1, 2, 3, 4], () => true, -1));
            should.throw(() => tools.some([1, 2, 3, 4], () => true, 0, 5));
            should.throw(() => tools.some([1, 2, 3, 4], () => true, -1, 0));
            should.throw(() => tools.some([1, 2, 3, 4], () => true, -1, 5));
        });
    });
    describe("test equalsIgnore", function () {
        it("should work correctly", () => {
            tools.equalsIgnore("", "a").should.equal(false);
            // should equal a same string
            tools.equalsIgnore("", "").should.equal(true);
            // should equal a same string
            tools.equalsIgnore("a", "a").should.equal(true);

            // test commutative property of equality
            tools.equalsIgnore("a", "A").should.equal(true);
            tools.equalsIgnore("A", "a").should.equal(true);

            tools.equalsIgnore("a", "ASBB").should.equal(false);

            // test transitive property of equality
            tools.equalsIgnore("Alfred's", "Alfred´s").should.equal(true);
            tools.equalsIgnore("Alfred's", "Alfred`s").should.equal(true);
            tools.equalsIgnore("Alfred´s", "Alfred`s").should.equal(true);
        });
    });
    describe("test contains", function () {
        it("should work correctly", () => {
            // empty string cannot contain any non empty string
            tools.contains("", "a").should.equal(false);
            // should always contain an empty string
            tools.contains("", "").should.equal(true);
            tools.contains("a", "").should.equal(true);

            tools.contains("a", "A").should.equal(true);
            tools.contains("A", "a").should.equal(true);

            tools.contains("a", "ASBB").should.equal(false);
            tools.contains("ASBB", "a").should.equal(true);

            tools.contains("Alfred's", "Alfred´s").should.equal(true);
            tools.contains("Sigmund Alfred's", "Alfred`s").should.equal(true);
            tools.contains("Alfred´s", "Sigmund Alfred`s").should.equal(false);
        });
    });
    describe("test countOccurrence", function () {
        it("should work correctly", () => {
            const result = tools.countOccurrence([1, 5, 2, 3, 4, 5, 5, null, null, null]);
            [...result.entries()].sort().should.deep.equal([[null, 3], [1, 1], [2, 1], [3, 1], [4, 1], [5, 3]]);
        });
    });
    describe("test max", function () {
        it("should return nothing on empty array", () => {
            should.not.exist(tools.max([], "id"));
            should.not.exist(tools.max([], (value, other) => value - other));
        });
        it("should work correctly when using comparator", () => {
            let result = tools.max([4, 2, 3, 1], (value, other) => value - other);
            should.exist(result);
            // @ts-expect-error
            result.should.equal(4);

            result = tools.max([4, 2, 3, 1], (value, other) => other - value);
            should.exist(result);
            // @ts-expect-error
            result.should.equal(1);
        });
        it("should work correctly when using field comparator", () => {
            const result = tools.max([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }], "id");
            should.exist(result);
            // @ts-expect-error
            result.should.deep.equal({ id: 4 });
        });
    });
    describe("test maxValue", function () {
        it("should work correctly", () => {
            const result = tools.maxValue([1, 4, 3, 2]);
            should.exist(result);
            // @ts-expect-error
            result.should.equal(4);
        });
    });
    describe("test min", function () {
        it("should return nothing on empty array", () => {
            should.not.exist(tools.min([], "id"));
            should.not.exist(tools.min([], (value, other) => value - other));
        });
        it("should work correctly when using comparator", () => {
            let result = tools.min([4, 2, 3, 1], (value, other) => value - other);
            should.exist(result);
            // @ts-expect-error
            result.should.equal(1);

            result = tools.min([4, 2, 3, 1], (value, other) => other - value);
            should.exist(result);
            // @ts-expect-error
            result.should.equal(4);
        });
        it("should work correctly when using field comparator", () => {
            const result = tools.min([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }], "id");
            should.exist(result);
            // @ts-expect-error
            result.should.deep.equal({ id: 1 });
        });
    });
    describe("test minValue", function () {
        it("should work correctly", () => {
            const result = tools.minValue([1, 4, 3, 2]);
            should.exist(result);
            // @ts-expect-error
            result.should.equal(1);
        });
    });
    describe("test relativeToAbsoluteTime", function () {
        it("should return null on invalid relative time", () => {
            should.not.exist(tools.relativeToAbsoluteTime(""));
            should.not.exist(tools.relativeToAbsoluteTime("27.12.2020"));
        });

        it("should parse 'just now' correctly", () => {
            testRelative("just now", 30, "Seconds");
        });
        it("should parse 'seconds ago' correctly", () => {
            testRelative("1 second ago", 1, "Seconds");
            testRelative("a second ago", 1, "Seconds");
            testRelative("5 seconds ago", 5, "Seconds");
        });
        it("should parse 'minutes ago' correctly", () => {
            testRelative("1 minute ago", 1, "Minutes");
            testRelative("a minute ago", 1, "Minutes");
            testRelative("5 minutes ago", 5, "Minutes");
        });
        it("should parse 'hours ago' correctly", () => {
            testRelative("1 hour ago", 1, "Hours");
            testRelative("a hour ago", 1, "Hours");
            testRelative("5 hours ago", 5, "Hours");
        });
        it("should parse 'days ago' correctly", () => {
            testRelative("1 day ago", 1, "Date");
            testRelative("a day ago", 1, "Date");
            testRelative("5 days ago", 5, "Date");
        });
        it("should parse 'weeks ago' correctly", () => {
            testRelative("1 week ago", 1, "Week");
            testRelative("a week ago", 1, "Week");
            testRelative("5 weeks ago", 5, "Week");
        });
        it("should parse 'months ago' correctly", () => {
            testRelative("1 month ago", 1, "Month");
            testRelative("a month ago", 1, "Month");
            testRelative("5 months ago", 5, "Month");
        });
        it("should parse 'years ago' correctly", () => {
            testRelative("1 year ago", 1, "FullYear");
            testRelative("a year ago", 1, "FullYear");
            testRelative("5 years ago", 5, "FullYear");
        });
    });
    describe("test delay", function () {
        it("should work correctly", async function () {
            this.timeout(6000);
            const start = new Date();

            await tools.delay(3000);

            const end = new Date();
            end.setSeconds(end.getSeconds() - 3);
            start.getTime().should.be.approximately(end.getTime(), 1000);
        });
    });
    describe("test equalsRelease", function () {
        it("should work correctly", () => {
            const now = new Date();

            const testRelease = {
                episodeId: 1,
                releaseDate: now,
                title: "none",
                url: "google.de"
            };
            // should always equals itself
            tools.equalsRelease(testRelease, testRelease).should.be.equal(true);
            tools.equalsRelease(
                testRelease,
                {
                    episodeId: 1,
                    releaseDate: now,
                    title: "none",
                    url: "google.de"
                }
            ).should.be.equal(true);
            tools.equalsRelease(
                testRelease,
                {
                    episodeId: 1,
                    releaseDate: now,
                    title: "none",
                    url: "google.de",
                    locked: false
                }
            ).should.be.equal(true);

            tools.equalsRelease(
                testRelease,
                {
                    episodeId: 1,
                    releaseDate: now,
                    title: "none",
                    url: "google.de",
                    locked: true
                }
            ).should.be.equal(false);
        });
    });
    describe("test stringify", function () {
        it("should work correctly", () => {
            tools.stringify({ value: 5 }).should.equal("{\"value\":5}");

            const value: any = {};
            value.value = value;
            tools.stringify(value).should.equal("{\"value\":\"[circular reference]\"}");
            tools.stringify([value, value, 1]).should.equal("[{\"value\":\"[circular reference]\"},\"[circular reference]\",1]");
        });
    });
    describe("test sanitizeString", function () {
        it("should normalize multiple whitespaces", () => {
            tools.sanitizeString("    ").should.equal("");
            tools.sanitizeString("a    ").should.equal("a");
            tools.sanitizeString("    a").should.equal("a");
            tools.sanitizeString("  a  ").should.equal("a");
            tools.sanitizeString("  a     b  ").should.equal("a b");
        });
    });
    describe("test isString", function () {
        it("should work correctly", () => {
            tools.isString("").should.equal(true);
            tools.isString(String("hello")).should.equal(true);

            tools.isString(1).should.equal(false);
            tools.isString(() => "true").should.equal(false);
            tools.isString({}).should.equal(false);
            tools.isString(true).should.equal(false);
            tools.isString([]).should.equal(false);
            tools.isString(Object()).should.equal(false);
        });
    });
    describe("test stringToNumberList", function () {
        it("should work correctly", () => {
            tools.stringToNumberList("").should.deep.equal([]);
            tools.stringToNumberList("[]").should.deep.equal([]);
            tools.stringToNumberList("hello").should.deep.equal([]);
            tools.stringToNumberList("{1,2,3,4}").should.deep.equal([]);
            tools.stringToNumberList("[\"1\"]").should.deep.equal([]);
            tools.stringToNumberList("true").should.deep.equal([]);
            tools.stringToNumberList("() => [1,2,3,4]").should.deep.equal([]);
            tools.stringToNumberList("1").should.deep.equal([]);

            tools.stringToNumberList("[1]").should.deep.equal([1]);
            tools.stringToNumberList("[2]").should.deep.equal([2]);
            tools.stringToNumberList("[3,4]").should.deep.equal([3, 4]);
            tools.stringToNumberList("[ 3,  4]").should.deep.equal([3, 4]);
            tools.stringToNumberList("[3.1, 4.2]").should.deep.equal([3.1, 4.2]);
        });
    });
    describe("test isError", function () {
        it("should work correctly", () => {
            tools.isError(1).should.equal(false);
            tools.isError(true).should.equal(false);
            tools.isError([]).should.equal(false);
            tools.isError({}).should.equal(false);
            tools.isError(tools.Errors).should.equal(false);
            tools.isError("").should.equal(false);

            tools.isError(tools.Errors.CORRUPT_DATA).should.equal(true);
            tools.isError("CORRUPT_DATA").should.equal(true);
        });
    });
    describe("test hasMediaType", function () {
        it("should work correctly", () => {
            tools.hasMediaType(0, tools.MediaType.VIDEO).should.equal(false);
            tools.hasMediaType(0, 1).should.equal(false);
            tools.hasMediaType(4, 1).should.equal(false);
            tools.hasMediaType(0, 0).should.equal(true);
            tools.hasMediaType(1, 1).should.equal(true);
            tools.hasMediaType(1, tools.MediaType.TEXT).should.equal(true);
            tools.hasMediaType(15, tools.MediaType.TEXT).should.equal(true);
            tools.hasMediaType(15, tools.MediaType.VIDEO | tools.MediaType.AUDIO).should.equal(true);
        });
    });
    describe("test allTypes", function () {
        it("should work correctly", () => {
            tools.allTypes().should.equal(15);
            tools.allTypes().should.equal(tools.MediaType.AUDIO | tools.MediaType.IMAGE | tools.MediaType.VIDEO | tools.MediaType.TEXT);
        });
    });
    describe("test combiIndex", function () {
        it("should work correctly", () => {
            tools.combiIndex({ totalIndex: 1 }).should.equal(1);
            tools.combiIndex({ totalIndex: -1 }).should.equal(-1);
            tools.combiIndex({ totalIndex: 1, partialIndex: undefined }).should.equal(1);
            tools.combiIndex({ totalIndex: 1, partialIndex: NaN }).should.equal(1);
            tools.combiIndex({ totalIndex: 1, partialIndex: 5 }).should.equal(1.5);
            tools.combiIndex({ totalIndex: 1, partialIndex: Number.MIN_VALUE }).should.equal(0);
        });
        it("should throw when giving invalid parameter", () => {
            should.throw(() => tools.combiIndex({ totalIndex: NaN }));
            should.throw(() => tools.combiIndex({ totalIndex: Number.POSITIVE_INFINITY }));
            should.throw(() => tools.combiIndex({ totalIndex: Number.NEGATIVE_INFINITY }));
            should.throw(() => tools.combiIndex({ totalIndex: Number.MAX_VALUE }));
            should.throw(() => tools.combiIndex({ totalIndex: Number.MIN_VALUE }));
            should.throw(() => tools.combiIndex({ totalIndex: 1, partialIndex: Number.NEGATIVE_INFINITY }));
            should.throw(() => tools.combiIndex({ totalIndex: 1, partialIndex: Number.POSITIVE_INFINITY }));
            should.throw(() => tools.combiIndex({ totalIndex: 1, partialIndex: Number.MAX_VALUE }));
        });
    });
    describe("test checkIndices", function () {
        it("should work correctly", () => {
            tools.checkIndices({ totalIndex: -1 });
            tools.checkIndices({ totalIndex: -1, partialIndex: undefined });
            tools.checkIndices({ totalIndex: 0 });
            tools.checkIndices({ totalIndex: 100 });
            tools.checkIndices({ totalIndex: -1, partialIndex: 0 });
            tools.checkIndices({ totalIndex: -1, partialIndex: 1 });
            tools.checkIndices({ totalIndex: 100, partialIndex: 0 });
            tools.checkIndices({ totalIndex: 11231, partialIndex: 15021 });
            should.throw(() => tools.checkIndices({ totalIndex: -2 }));
            should.throw(() => tools.checkIndices({ totalIndex: NaN }));
            should.throw(() => tools.checkIndices({ totalIndex: -1.5 }));
            should.throw(() => tools.checkIndices({ totalIndex: 111.5 }));
            should.throw(() => tools.checkIndices({ totalIndex: 10, partialIndex: -1 }));
            should.throw(() => tools.checkIndices({ totalIndex: 12, partialIndex: 123.3 }));
            should.throw(() => tools.checkIndices({ totalIndex: 10, partialIndex: NaN }));
        });
    });
    describe("test separateIndices", function () {
        it("should work correctly", () => {
            // @ts-expect-error
            should.throw(() => tools.separateIndex(""), "not a number");
            // @ts-expect-error
            should.throw(() => tools.separateIndex("7.0"), "not a number");

            tools.separateIndex(1).should.deep.equal({ totalIndex: 1, partialIndex: undefined });
            tools.separateIndex(-1).should.deep.equal({ totalIndex: -1, partialIndex: undefined });
            tools.separateIndex(1.5).should.deep.equal({ totalIndex: 1, partialIndex: 5 });
            tools.separateIndex(-1.5).should.deep.equal({ totalIndex: -1, partialIndex: 5 })

            tools.separateIndex(11230.512390).should.deep.equal({ totalIndex: 11230, partialIndex: 51239 });
            tools.separateIndex(-11230.512390).should.deep.equal({ totalIndex: -11230, partialIndex: 51239 });
            tools.separateIndex(11230.51239).should.deep.equal({ totalIndex: 11230, partialIndex: 51239 });
            tools.separateIndex(-11230.51239).should.deep.equal({ totalIndex: -11230, partialIndex: 51239 });
        });
    });
    describe("test ignore", function () {
        it("should work correctly", () => {
            should.not.exist(tools.ignore());
            // @ts-expect-error
            should.not.exist(tools.ignore(123, "sd", true, {}));
        });
    });
    describe("test findProjectDirPath", function () {
        it("should not throw when using valid parameters");
    });
    describe("test isQuery", function () {
        it("should not throw when using valid parameters");
    });
    describe("test invalidId", function () {
        it("should never throw", () => {
            tools.invalidId("").should.not.throw;
            tools.invalidId("1212368").should.not.throw;
            tools.invalidId(1).should.not.throw;
            tools.invalidId(() => null).should.not.throw;
            tools.invalidId(null).should.not.throw;
            tools.invalidId(true).should.not.throw;
            tools.invalidId(undefined).should.not.throw;
        });
        it("should validate correctly", () => {
            tools.invalidId("").should.equal(true);
            tools.invalidId("1212368").should.equal(true);
            tools.invalidId(Number.MIN_VALUE).should.equal(true);
            tools.invalidId(-1).should.equal(true);
            tools.invalidId(0).should.equal(true);
            tools.invalidId(0.6).should.equal(true);
            tools.invalidId(120.1).should.equal(true);
            tools.invalidId(Number.POSITIVE_INFINITY).should.equal(true);
            tools.invalidId(NaN).should.equal(true);
            tools.invalidId(() => null).should.equal(true);
            tools.invalidId(null).should.equal(true);
            tools.invalidId(true).should.equal(true);
            tools.invalidId(undefined).should.equal(true);

            tools.invalidId(1).should.equal(false);
            tools.invalidId(1239090909).should.equal(false);
            tools.invalidId(Number.MAX_VALUE).should.equal(false);
        });
    });

    describe("test invalidUuid", function () {
        it("should never throw", () => {
            tools.validUuid("").should.not.throw;
            tools.validUuid("1212368").should.not.throw;
            tools.validUuid(v1()).should.not.throw;
            tools.validUuid(v4()).should.not.throw;
            tools.validUuid(NIL_UUID).should.not.throw;
            tools.validUuid(1).should.not.throw;
            tools.validUuid(() => null).should.not.throw;
            tools.validUuid(null).should.not.throw;
            tools.validUuid(true).should.not.throw;
            tools.validUuid(undefined).should.not.throw;
        });
        it("should validate correctly", () => {
            tools.validUuid("").should.equal(false);
            tools.validUuid("1212368").should.equal(false);
            tools.validUuid(1).should.equal(false);
            tools.validUuid(() => null).should.equal(false);
            tools.validUuid(null).should.equal(false);
            tools.validUuid(false).should.equal(false);
            tools.validUuid(undefined).should.equal(false);

            tools.validUuid(NIL_UUID).should.equal(true);
            tools.validUuid(v1()).should.equal(true);
            tools.validUuid(v4()).should.equal(true);
        });
    });
    describe("never call output functions", () => {
        it("should never call console", function () {
            for (const key of Object.keys(console)) {
                // @ts-expect-error
                if (typeof console[key] === "function") {
                    // @ts-expect-error
                    chai.expect(console[key], "testing " + key).to.have.callCount(0);
                }
            }
        });
        it("should never call logger", function () {
            for (const key of Object.keys(logger)) {
                // @ts-expect-error
                if (typeof logger[key] === "function") {
                    // @ts-expect-error
                    chai.expect(logger[key], "testing " + key).to.have.callCount(0);
                }
            }
        });
    });
});
