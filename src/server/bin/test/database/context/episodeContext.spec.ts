import * as tools from "../../../tools";
import sinon from "sinon";
import sinon_chai from "sinon-chai";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import * as storage from "../../../database/storages/storage";
import * as storageTools from "../../../database/storages/storageTools";
import { EpisodeContext } from "../../../database/contexts/episodeContext";
import { setupTestDatabase } from "./contextHelper";
import { before, after, describe, it } from "mocha"

chai.use(sinon_chai);
chai.use(chaiAsPromised);
chai.should();

before(async function() {
    this.timeout(60000);
    await setupTestDatabase();
    await tools.delay(2000)
});

after(async () => {
    // await tearDownTestDatabase();
    tools.internetTester.stop();
    return storage.stopStorage();
});
/**
     * Convenience Function for accessing a valid EpisodeContext
     */
function inContext<T>(callback: storageTools.ContextCallback<T, EpisodeContext>, transaction = true) {
    return storage.storageInContext(callback, (con) => storageTools.queryContextProvider(con).episodeContext, transaction);
}

describe("episodeContext", () => {
    describe("getDisplayReleases", function() {
        it("should not throw, when using valid parameters", async function() {
            await inContext(context => context.getDisplayReleases(new Date(), new Date(), true, "12")).should.eventually.not.be.rejected;
            await inContext(context => context.getDisplayReleases(new Date(), null, null, "12")).should.eventually.not.be.rejected;
        });
    });

    describe("getAll", function() {
        it("should not throw when using valid parameters");
    });

    describe("getAllReleases", function() {
        it("should not throw when using valid parameters");
    });

    describe("getDisplayReleases", function() {
        it("should not throw when using valid parameters");
    });

    describe("getMediumReleases", function() {
        it("should not throw when using valid parameters");
    });

    describe("getAssociatedEpisode", function() {
        it("should not throw when using valid parameters");
    });

    describe("getLatestReleases", function() {
        it("should not throw when using valid parameters");
    });

    describe("getReleases", function() {
        it("should not throw when using valid parameters");
    });

    describe("getReleasesByHost", function() {
        it("should not throw when using valid parameters");
    });

    describe("getPartsEpisodeIndices", function() {
        it("should not throw when using valid parameters");
    });

    /**
    * Add progress of an user in regard to an episode to the storage.;

    /**
     * Removes progress of an user in regard to an episode.
     */
    describe("removeProgress", function() {
        it("should not throw when using valid parameters");
    });

    /**
     * Sets the progress of an user in regard to an episode with one or multiple progressResult objects.
     */
    describe("setProgress", function() {
        it("should not throw when using valid parameters");
    });

    /**
     * Get the progress of an user in regard to an episode.
     */
    describe("getProgress", function() {
        it("should not throw when using valid parameters");
    });

    /**
     * Updates the progress of an user in regard to an episode.
     */
    describe("updateProgress", function() {
        it("should not throw when using valid parameters");
    });

    /**
     * Marks an Episode as read and adds it into Storage if the episode does not exist yet.
     */
    describe("markEpisodeRead", function() {
        it("should not throw when using valid parameters");
    });
    describe("addRelease", function() {
        it("should not throw when using valid parameters");
    });

    describe("getEpisodeLinksByMedium", function() {
        it("should not throw when using valid parameters");
    });

    describe("getSourcedReleases", function() {
        it("should not throw when using valid parameters");
    });

    describe("updateRelease", function() {
        it("should not throw when using valid parameters");
    });

    describe("deleteRelease", function() {
        it("should not throw when using valid parameters");
    });

    describe("getEpisodeContentData", function() {
        it("should not throw when using valid parameters");
    });

    describe("addEpisode", function() {
        it("should not throw when using valid parameters");
    });

    describe("getEpisode", function() {
        it("should not throw when using valid parameters");
    });

    describe("getPartMinimalEpisodes", function() {
        it("should not throw when using valid parameters");
    });

    describe("getPartEpisodePerIndex", function() {
        it("should not throw when using valid parameters");
    });

    describe("getMediumEpisodePerIndex", function() {
        it("should not throw when using valid parameters");
    });

    /**
     * Updates an episode from the storage.
     */
    describe("updateEpisode", function() {
        it("should not throw when using valid parameters");
    });

    /**
     * Updates an episode from the storage.
     */
    describe("moveEpisodeToPart", function() {
        it("should not throw when using valid parameters");
    });

    /**
     * Deletes an episode from the storage irreversibly.
     */
    describe("deleteEpisode", function() {
        it("should not throw when using valid parameters");
    });

    describe("getChapterIndices", function() {
        it("should not throw when using valid parameters");
    });

    describe("getAllChapterLinks", function() {
        it("should not throw when using valid parameters");
    });

    describe("getUnreadChapter", function() {
        it("should not throw when using valid parameters");
    });

    describe("getReadToday", function() {
        it("should not throw when using valid parameters");
    });

    describe("markLowerIndicesRead", function() {
        it("should not throw when using valid parameters");
    });
});