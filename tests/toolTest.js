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

describe("testing tool.js", () => {
    const sandbox = sinon.createSandbox();
    before("setting up", () => {
        for (const key of Object.keys(console)) {
            if (typeof console[key] === "function") {
                // noinspection JSCheckFunctionSignatures
                sandbox.stub(console, key);
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
            it(`should throw ${hashTool.tag}'`, async function () {
                await new Promise(() => hashTool.hash(undefined)).should.eventually.be.rejected;
                await new Promise(() => hashTool.equals(undefined, "123", "123")).should.eventually.be.rejected;
            });
        }
    });
    describe("internet tester", function () {
        const internetSandbox = sinon.createSandbox();
        let up = false;

        before(() => {
            internetSandbox.stub(dns.promises, "lookup").callsFake(args => up);
        });
        after(() => internetSandbox.restore());

        it('should fire online event within time limit', function (done) {
            this.timeout(3000);

            tools.internetTester.on("online", () => {
                done();
            });
            up = true;
        });
        it('should fire offline event within time limit', function (done) {
            this.timeout(3000);

            tools.internetTester.on("offline", () => {
                done();
            });
            up = false;
        });
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
