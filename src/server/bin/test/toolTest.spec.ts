"use strict";
import sinon from "sinon";
import sinon_chai from "sinon-chai";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import dns from "dns";
import logger from "../logger";
import * as tools from "../tools";

chai.use(sinon_chai);
chai.use(chaiAsPromised);
chai.should();

process.on("unhandledRejection", () => console.log("an unhandled rejection!"));
process.on("uncaughtException", (args) => console.log("an unhandled exception!", args));
after(() => tools.internetTester.stop());

describe("testing tool.js", () => {
    const sandbox = sinon.createSandbox();
    before("setting up", () => {
        for (const key of Object.keys(console)) {
            // @ts-ignore
            if (typeof console[key] === "function") {
                
                // @ts-ignore
                sandbox.spy(console, key);
            }
        }
        // @ts-ignore
        for (const key of Object.keys(logger.default)) {
            // @ts-ignore
            if (typeof logger.default[key] === "function") {
                // @ts-ignore
                sandbox.stub(logger.default, key)
            }
        }
    });
    after(() => sandbox.restore());
    describe("hash functions", () => {
        // @ts-ignore
        const tags = [];
        const testStrings = ["", "a", "11237897319283781927397$!\"()=()89"];
        for (const hashTool of tools.Hashes) {
            it(`should have valid tag - '${hashTool.tag}'`, function () {
                hashTool.should.have.own.property("tag").that.is.a("string").and.not.empty;
            });
            it(`should have unique tag - '${hashTool.tag}'`, function () {
                // @ts-ignore
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
                    // @ts-ignore
                    await hashTool.equals(testString, hash.hash, hash.salt).should.eventually.be.true;
                }
            });
            it(`hash should throw ${hashTool.tag}'`, async function () {
                // @ts-ignore
                await hashTool.hash(undefined).should.eventually.be.rejected;
            });
            it(`equals should throw ${hashTool.tag}'`, async function () {
                // @ts-ignore
                await hashTool.equals(undefined, "123", "123").should.eventually.be.rejected;
            });
        }
    });
    describe("internet tester", function () {
        const internetSandbox = sinon.createSandbox();
        let up = false;

        before(() => {
            // @ts-ignore
            internetSandbox.stub(dns.promises, "lookup").callsFake(() => up ? Promise.resolve() : Promise.reject());
            internetSandbox.stub(tools.internetTester, "isOnline").callsFake(() => up);
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
        // @ts-ignore
        let callback;

        before(() => {
            callback = arrayLikeSandbox.stub().callsFake(function () {
                arguments.should.have.length(2);
                // eslint-disable-next-line prefer-rest-params
                arguments[1].should.be.finite;
            });
        });
        // @ts-ignore
        afterEach(() => callback.reset());
        after(() => arrayLikeSandbox.restore());

        it("should equal the times called and length of arrayLike", function () {
            const arrayLike = {0: 1, 1: 2, 2: 3, 3: 4, length: 4};
            // @ts-ignore
            tools.forEachArrayLike(arrayLike, callback);
            // @ts-ignore
            callback.should.have.callCount(arrayLike.length);
        });
        it("should be called for each element once and in order", function () {
            const arrayLike = {0: 1, 1: 2, 2: 3, 3: 4, length: 4};
            // @ts-ignore
            tools.forEachArrayLike(arrayLike, callback);

            // @ts-ignore
            const firstCall = callback.getCall(0);
            // @ts-ignore
            const secondCall = callback.getCall(1);
            // @ts-ignore
            const thirdCall = callback.getCall(2);
            // @ts-ignore
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
                // @ts-ignore
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                tools.promiseMultiSingle(null, null).catch(() => {
                }).should.be.a("promise"),
                // @ts-ignore
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                tools.promiseMultiSingle([], null).catch(() => {
                }).should.be.a("promise"),
                tools.promiseMultiSingle([], () => 1).should.be.a("promise"),
                tools.promiseMultiSingle(1, () => 1).should.be.a("promise"),
                tools.promiseMultiSingle({0: 1, length: 1}, () => 1).should.be.a("promise"),
            ]);
        });
        it("should throw if no callback provided", async function () {

            // @ts-ignore
            await tools.promiseMultiSingle(null, null).should.be.rejectedWith(TypeError);

            // @ts-ignore
            await tools.promiseMultiSingle([], null).should.be.rejectedWith(TypeError);

            // @ts-ignore
            await tools.promiseMultiSingle([1, 2], null).should.be.rejectedWith(TypeError);
            // @ts-ignore
            await tools.promiseMultiSingle([1, 2], 1).should.be.rejectedWith(TypeError);
            // @ts-ignore
            await tools.promiseMultiSingle(2, 1).should.be.rejectedWith(TypeError);
            // @ts-ignore
            await tools.promiseMultiSingle(1, "1").should.be.rejectedWith(TypeError);
            // @ts-ignore
            await tools.promiseMultiSingle([1, 2], "1").should.be.rejectedWith(TypeError);
            // @ts-ignore
            await tools.promiseMultiSingle([1, 2], {callback: () => undefined}).should.be.rejectedWith(TypeError);
            // @ts-ignore
            await tools.promiseMultiSingle(1, {callback: () => undefined}).should.be.rejectedWith(TypeError);
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
    describe("test multiSingle");
    describe("test addMultiSingle");
    describe("test removeMultiSingle");
    describe("test getElseSet");
    describe("test getElseSetObj");
    describe("test unique");
    describe("test isTocPart");
    describe("test isTocEpisode");
    describe("test some");
    describe("test equalsIgnore");
    describe("test contains");
    describe("test countOccurrence");
    describe("test max");
    describe("test maxValue");
    describe("test min");
    describe("test minValue");
    describe("test relativeToAbsoluteTime");
    describe("test delay");
    describe("test equalsRelease");
    describe("test stringify");
    describe("test sanitizeString");
    describe("test isString");
    describe("test stringToNumberList");
    describe("test isError");
    describe("test hasMediaType");
    describe("test allTypes");
    describe("test combiIndex");
    describe("test checkIndices");
    describe("test separateIndices");
    describe("test ignore");
    describe("test findProjectDirPath");
    describe("test isQuery");
    describe("never call output functions", () => {
        it("should never call console", function () {
            for (const key of Object.keys(console)) {
                // @ts-ignore
                if (typeof console[key] === "function") {
                    // @ts-ignore
                    chai.expect(console[key], "testing " + key).to.have.callCount(0);
                }
            }
        });
        it("should never call logger", function () {
            // @ts-ignore
            for (const key of Object.keys(logger.default)) {
                // @ts-ignore
                if (typeof logger.default[key] === "function") {
                    // @ts-ignore
                    chai.expect(logger.default[key], "testing " + key).to.have.callCount(0);
                }
            }
        });
    });
});
