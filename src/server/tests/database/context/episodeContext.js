"use strict";
const tools = require("../../../server/dist/tools");

const sinon = require("sinon");
const sinon_chai = require("sinon-chai");
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const storage = require("../../../server/dist/database/storages/storage");
const storageTools = require("../../../server/dist/database/storages/storageTools");
const { EpisodeContext } = require("../../../server/dist/database/contexts/episodeContext");
// TODO how to test a single context?
chai.use(sinon_chai);
chai.use(chaiAsPromised);
chai.should();

after(() => {
    tools.internetTester.stop();
    return storage.storage.stop();
});

/**
 * 
 * @param {ContextCallback} callback 
 * @param {boolean} transaction 
 */
function inContext(callback, transaction = true) {
    return storage.inContext(callback, transaction, (con) => storageTools.queryContextProvider(con).episodeContext);
}

describe("getDisplayReleases", () => {
    it("should not throw", async function() {
        inContext(context => context.getDisplayReleases(new Date(), new Date(), true, "12")).should.eventually.not.reject;
    });
});