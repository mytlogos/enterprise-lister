import * as tools from "../../../tools";
import sinon from "sinon";
import sinon_chai from "sinon-chai";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import * as storage from "../../../database/storages/storage";
import * as storageTools from "../../../database/storages/storageTools";
import { EpisodeContext } from "../../../database/contexts/episodeContext";
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
function inContext<T>(callback: storageTools.ContextCallback<T, EpisodeContext>, transaction = true) {
    return storage.storageInContext(callback, (con) => storageTools.queryContextProvider(con).episodeContext, transaction);
}

describe("getDisplayReleases", function() {
    // set a timeout for when database is setting up
    this.timeout(3000);

    it("should not throw, when using valid parameters", async function() {
        await inContext(context => context.getDisplayReleases(new Date(), new Date(), true, "12")).should.eventually.not.be.rejected;
        await inContext(context => context.getDisplayReleases(new Date(), null, null, "12")).should.eventually.not.be.rejected;
    });

    it ("should throw Error, when using invalid Parameter");
});