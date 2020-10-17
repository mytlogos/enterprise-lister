"use strict";
const sinon = require("sinon");
const sinon_chai = require("sinon-chai");
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const dns = require("dns");
const logger = require("../server/dist/logger");
const tools = require("../server/dist/tools");
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
            if (typeof console[key] === "function") {
                // noinspection JSCheckFunctionSignatures
                sandbox.spy(console, key);
            }
        }
        for (const key of Object.keys(logger.default)) {
            if (typeof logger.default[key] === "function") {
                // noinspection JSCheckFunctionSignatures
                sandbox.stub(logger.default, key)
            }
        }
    });
    after(() => sandbox.restore());
    describe("hash functions", () => {
        // noinspection JSMismatchedCollectionQueryUpdate
        const tags = [];
        const testStrings = ["", "a", "11237897319283781927397$!\"()=()89"];
        for (const hashTool of tools.Hashes) {
            it(`should have valid tag - '${hashTool.tag}'`, function () {
                hashTool.should.have.own.property("tag").that.is.a("string").and.not.empty;
            });
            it(`should have unique tag - '${hashTool.tag}'`, function () {
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
                    await hashTool.equals(testString, hash.hash, hash.salt).should.eventually.be.true;
                }
            });
            it(`hash should throw ${hashTool.tag}'`, async function () {
                await hashTool.hash(undefined).should.eventually.be.rejected;
            });
            it(`equals should throw ${hashTool.tag}'`, async function () {
                await hashTool.equals(undefined, "123", "123").should.eventually.be.rejected;
            });
        }
    });
    describe("internet tester", function () {
        const internetSandbox = sinon.createSandbox();
        let up = false;

        before(() => {
            internetSandbox.stub(dns.promises, "lookup").callsFake(() => up ? Promise.resolve() : Promise.reject());
            internetSandbox.stub(tools.internetTester, "isOnline").callsFake(() => up);
        });
        after(() => internetSandbox.restore());

        it('should fire online event within time limit', function () {
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
        it('should fire offline event within time limit', function () {
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
        it('should be called at least once', async function () {
            this.timeout(5000);
            await tools.delay(500);
            dns.promises.lookup.should.have.been.called
        });
    });
    describe("test remove", function () {
        it("should remove item with '===' equality", function () {
            const items = [1, 2, 3, undefined, 4, null];
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

            const emptyItems = [];
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
            tools.removeLike(items, item => item === "1");
            items.should.be.eql([1, 2, 3, 4]);
            tools.removeLike(items, item => item == "1");
            items.should.be.eql([2, 3, 4]);

            tools.removeLike(items, item => item === 1);
            items.should.be.eql([2, 3, 4]);

            const emptyItems = [];
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

            const equals = function (item) {
                arguments.length.should.be.equal(1);
                arguments.length.should.not.be.equal("1");
                return item === 1;
            };
            tools.removeLike(items, equals);
            items.should.be.eql([2, 3, 1, 4]);
            tools.removeLike(items, equals);
            items.should.be.eql([2, 3, 4]);

            const emptyItems = [];
            tools.removeLike(emptyItems, equals);
            emptyItems.should.be.eql([]);
        });
    });
    describe("test forEachArrayLike", function () {
        const arrayLikeSandbox = sinon.createSandbox();
        let callback;

        before(() => {
            callback = arrayLikeSandbox.stub().callsFake(function () {
                arguments.should.have.length(2);
                arguments[1].should.be.finite;
            });
        });
        afterEach(() => callback.reset());
        after(() => arrayLikeSandbox.restore());

        it("should equal the times called and length of arrayLike", function () {
            const arrayLike = {0: 1, 1: 2, 2: 3, 3: 4, length: 4};
            tools.forEachArrayLike(arrayLike, callback);
            callback.should.have.callCount(arrayLike.length);
        });
        it("should be called for each element once and in order", function () {
            const arrayLike = {0: 1, 1: 2, 2: 3, 3: 4, length: 4};
            tools.forEachArrayLike(arrayLike, callback);

            const firstCall = callback.getCall(0);
            const secondCall = callback.getCall(1);
            const thirdCall = callback.getCall(2);
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
                tools.promiseMultiSingle(null, null).catch(() => {
                }).should.be.a("promise"),
                tools.promiseMultiSingle([], null).catch(() => {
                }).should.be.a("promise"),
                tools.promiseMultiSingle([], () => 1).should.be.a("promise"),
                tools.promiseMultiSingle(1, () => 1).should.be.a("promise"),
                tools.promiseMultiSingle({0: 1, length: 1}, () => 1).should.be.a("promise"),
            ]);
        });
        it("should throw if no callback provided", async function () {
            await tools.promiseMultiSingle(null, null).should.be.rejectedWith(TypeError);
            await tools.promiseMultiSingle([], null).should.be.rejectedWith(TypeError);
            await tools.promiseMultiSingle([1, 2], null).should.be.rejectedWith(TypeError);
            await tools.promiseMultiSingle([1, 2], 1).should.be.rejectedWith(TypeError);
            await tools.promiseMultiSingle(2, 1).should.be.rejectedWith(TypeError);
            await tools.promiseMultiSingle(1, "1").should.be.rejectedWith(TypeError);
            await tools.promiseMultiSingle([1, 2], "1").should.be.rejectedWith(TypeError);
            await tools.promiseMultiSingle([1, 2], {callback: () => undefined}).should.be.rejectedWith(TypeError);
            await tools.promiseMultiSingle(1, {callback: () => undefined}).should.be.rejectedWith(TypeError);
        });
        it("should always have 3 arguments, being an item, a number and a boolean", async function () {
            const callback = sandbox.stub().callsFake(function () {
                arguments.should.have.length(3);
                arguments[1].should.be.finite.and.above(-1);
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
    });
    describe("test addMultiSingle", function () {
    });
    describe("test removeMultiSingle", function () {
    });
    describe("test getElseSet", function () {
    });
    describe("test getElseSetObj", function () {
    });
    describe("test unique", function () {
    });
    describe("test isTocPart", function () {
    });
    describe("test isTocEpisode", function () {
    });
    describe("test some", function () {
    });
    describe("test equalsIgnore", function () {
    });
    describe("test contains", function () {
    });
    describe("test countOccurrence", function () {
    });
    describe("test max", function () {
    });
    describe("test maxValue", function () {
    });
    describe("test min", function () {
    });
    describe("test minValue", function () {
    });
    describe("test relativeToAbsoluteTime", function () {
    });
    describe("test delay", function () {
    });
    describe("test equalsRelease", function () {
    });
    describe("test stringify", function () {
    });
    describe("test sanitizeString", function () {
    });
    describe("test isString", function () {
    });
    describe("test stringToNumberList", function () {
    });
    describe("test isError", function () {
    });
    describe("test hasMediaType", function () {
    });
    describe("test allTypes", function () {
    });
    describe("test combiIndex", function () {
    });
    describe("test checkIndices", function () {
    });
    describe("test separateIndices", function () {
    });
    describe("test ignore", function () {
    });
    describe("test findProjectDirPath", function () {
    });
    describe("test isQuery", function () {
    });
    describe("never call output functions", () => {
        it('should never call console', function () {
            for (const key of Object.keys(console)) {
                if (typeof console[key] === "function") {
                    // noinspection JSCheckFunctionSignatures
                    chai.expect(console[key], "testing " + key).to.have.callCount(0);
                }
            }
        });
        it('should never call logger', function () {
            for (const key of Object.keys(logger.default)) {
                if (typeof logger.default[key] === "function") {
                    chai.expect(logger.default[key], "testing " + key).to.have.callCount(0);
                }
            }
        });
    });
});
