const sinon = require("sinon");
const sinon_chai = require("sinon-chai");
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
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
                sandbox.spy(console, key);
            }
        }
        for (const key of Object.keys(logger.default)) {
            if (typeof logger.default[key] === "function") {
                // noinspection JSCheckFunctionSignatures
                sandbox.spy(logger.default, key)
            }
        }
    });
    after(() => {
        sandbox.restore();
    });
    describe("hash functions", () => {
        const tags = [];
        for (const hashTool of tools.Hashes) {
            it(`should have valid tag - '${hashTool.tag}'`, function () {
                hashTool.should.have.own.property("tag").that.is.a("string").and.not.empty;
                tags.should.not.contain(hashTool.tag);
                tags.push(hashTool.tag);
            });
            it(`should not be empty - '${hashTool.tag}'`, async function () {
                await hashTool.hash("").should.eventually.not.be.undefined;
                await hashTool.hash("").should.eventually.have.ownProperty("hash").that.is.a("string").and.not.empty;
                await hashTool.hash("1").should.eventually.have.ownProperty("hash").that.is.a("string").and.not.empty;
                await hashTool.hash("1123789731928378192739789").should.eventually.have.ownProperty("hash").that.is.a("string").and.not.empty;
            });
        }
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
