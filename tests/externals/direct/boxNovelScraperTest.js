"use strict";
const tools = require("../../../server/dist/tools");
const MediaType = tools.MediaType;

const sinon = require("sinon");
const sinon_chai = require("sinon-chai");
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const boxNovelHook = require("../../../server/dist/externals/direct/boxNovelScraper").getHook();
const externalErrors = require("../../../server/dist/externals/errors");
const stopStorage = require("../../../server/dist/database/storages/storage").storage.stop;

const UrlError = externalErrors.UrlError;
chai.use(sinon_chai);
chai.use(chaiAsPromised);
chai.should();
after(() => {
    tools.internetTester.stop();
    return stopStorage();
});

describe("testing boxNovel Hook", () => {
    it("should be valid hook object", function () {
        boxNovelHook.name.should.be.a("string");
        boxNovelHook.should.have.property("medium", MediaType.TEXT);
        boxNovelHook.domainReg.should.be.instanceOf(RegExp);
    });
    it("should throw UrlError", async function () {
        await boxNovelHook.tocAdapter("https://google.de").should.eventually.be.rejectedWith(UrlError);
        await boxNovelHook.tocAdapter("ftp://google.de").should.eventually.be.rejectedWith(UrlError);
        await boxNovelHook.tocAdapter("google.de").should.eventually.be.rejectedWith(UrlError);
        await boxNovelHook.tocAdapter("www.boxnovel.de").should.eventually.be.rejectedWith(UrlError);
        await boxNovelHook.tocAdapter("http://www.boxnovel.de").should.eventually.be.rejectedWith(UrlError);
        await boxNovelHook.tocAdapter("https://www.boxnovel.de").should.eventually.be.rejectedWith(UrlError);
        await boxNovelHook.tocAdapter("https://boxnovel.de").should.eventually.be.rejectedWith(UrlError);
        await boxNovelHook.tocAdapter("www.boxnovel.com").should.eventually.be.rejectedWith(UrlError);
        await boxNovelHook.tocAdapter("sftp://www.boxnovel.com").should.eventually.be.rejectedWith(UrlError);
    });
});
