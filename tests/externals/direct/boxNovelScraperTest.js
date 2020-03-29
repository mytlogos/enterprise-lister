"use strict";
const tools = require("../../../server/dist/tools");
const MediaType = tools.MediaType;

const sinon = require("sinon");
const sinon_chai = require("sinon-chai");
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const fs = require("fs");
const cheerio = require("cheerio");
const boxNovelHook = require("../../../server/dist/externals/direct/boxNovelScraper").getHook();
const externalErrors = require("../../../server/dist/externals/errors");
const stopStorage = require("../../../server/dist/database/storages/storage").storage.stop;
const queueManager = require("../../../server/dist/externals/queueManager");
const scraperTestTools = require("./scraperTestTools");

const UrlError = externalErrors.UrlError;
const MissingResourceError = externalErrors.MissingResourceError;
chai.use(sinon_chai);
chai.use(chaiAsPromised);
chai.should();
after(() => {
    tools.internetTester.stop();
    return stopStorage();
});


it("should be valid hook object", function () {
    boxNovelHook.name.should.be.a("string");
    boxNovelHook.should.have.property("medium", MediaType.TEXT);
    boxNovelHook.domainReg.should.be.instanceOf(RegExp);
});

describe("testing boxNovel Hook toc", () => {
    const hookSandbox = sinon.createSandbox();

    before(() => {
        hookSandbox.stub(queueManager, "queueCheerioRequest").callsFake(args => {
            let path;
            if (args === "https://boxnovel.com/novel/i-am-a-missing-resource") {
                path = "./tests/resources/missingResources/boxnovel.html";
            } else if (args === "https://boxnovel.com/novel/demon-noble-girl-story-of-a-careless-demon/") {
                path = "./tests/resources/boxnovel-281.html";
            } else if (args === "https://boxnovel.com/novel/my-master-disconnected-yet-again/") {
                path = "./tests/resources/boxnovel-237.html";
            } else if (args === "https://boxnovel.com/novel/the-man-picked-up-by-the-gods-reboot/") {
                path = "./tests/resources/boxnovel-173.html";
            } else {
                return Promise.reject(new Error("unknown url"));
            }
            return fs.promises
                .readFile(path, "utf8")
                .then(value => cheerio.load(value));
        });
    });

    after(() => {
        hookSandbox.restore();
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
        await boxNovelHook.tocAdapter("https://www.boxnovel.com/").should.eventually.be.rejectedWith(UrlError);
        await boxNovelHook.tocAdapter("https://www.boxnovel.com/novel").should.eventually.be.rejectedWith(UrlError);
    });

    it("should throw MissingResourceError", async function () {
        await boxNovelHook.tocAdapter("https://boxnovel.com/novel/i-am-a-missing-resource").should.eventually.be.rejectedWith(MissingResourceError);
    });
    it("should parse correct ToCs", async function () {
        // boxnovel-281.html
        const demonTocs = await boxNovelHook.tocAdapter("https://boxnovel.com/novel/demon-noble-girl-story-of-a-careless-demon/");
        demonTocs.should.be.an("array").and.have.length(1);
        scraperTestTools.testGeneralToc(demonTocs[0]);

        // boxnovel-237.html
        const masterTocs = await boxNovelHook.tocAdapter("https://boxnovel.com/novel/my-master-disconnected-yet-again/");
        masterTocs.should.be.an("array").and.have.length(1);
        scraperTestTools.testGeneralToc(masterTocs[0]);

        // boxnovel-173.html
        const rebootTocs = await boxNovelHook.tocAdapter("https://boxnovel.com/novel/the-man-picked-up-by-the-gods-reboot/");
        rebootTocs.should.be.an("array").and.have.length(1);
        scraperTestTools.testGeneralToc(rebootTocs[0]);
    });
});
