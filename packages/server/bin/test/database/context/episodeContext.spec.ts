import * as tools from "enterprise-core/dist/tools";
import sinon_chai from "sinon-chai";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import * as storage from "enterprise-core/dist/database/storages/storage";
import { episodeStorage } from "enterprise-core/dist/database/storages/storage";
import {
  setupTestDatabase,
  checkEmptyQuery,
  cleanUserEpisode,
  cleanAll,
  resultFromQuery,
  getDatabaseData,
  fillUserEpisodeTable,
} from "./contextHelper";
import { before, after, describe, it } from "mocha";

chai.use(sinon_chai);
chai.use(chaiAsPromised);
const should = chai.should();

before(async function () {
  this.timeout(60000);
  await setupTestDatabase();
  await tools.delay(2000);
});

after(async () => {
  // await tearDownTestDatabase();
  tools.internetTester.stop();
  return storage.stopStorage();
});

describe("episodeContext", () => {
  describe("getDisplayReleases", function () {
    it("should not throw, when using valid parameters", async function () {
      await episodeStorage.getDisplayReleases(new Date(), new Date(), true, "12", [], [], [], []).should.eventually.not
        .be.rejected;
      await episodeStorage.getDisplayReleases(new Date(), null, null, "12", [], [], [], []).should.eventually.not.be
        .rejected;
    });
  });

  describe("getAll", function () {
    after(() => cleanAll());
    afterEach(() => cleanUserEpisode());
    it("should not return any rows", async () => {
      const query = await episodeStorage.getAll("");
      // on the first query it should not produce any rows
      const checkEmpty = checkEmptyQuery(query);
      query.start();
      await checkEmpty.should.be.eventually.not.rejected;
    });
    it("should return correct rows", async function () {
      // the data available in the table
      await fillUserEpisodeTable();

      // query without a user uuid which exists
      let query = await episodeStorage.getAll("");
      // should return all episodes with progress = 0
      let result = await resultFromQuery(query);

      const data = getDatabaseData();
      // check that any episode has the corresponding
      data[1].episodes.forEach((value) => {
        const index = result.findIndex((progress) => progress.id === value.id);
        // every episode in database should be returned from query
        index.should.not.equal(-1);
        // remove every progress hit
        const [episodeProgress] = result.splice(index, 1);
        // progress needs to be zero
        episodeProgress.progress.should.equal(0);
      });
      // there should not be any episodes progress left
      result.should.be.empty;

      const existingUser = Object.values(data[0])[0];

      // query without a user uuid which exists
      query = await episodeStorage.getAll(existingUser.uuid);
      // should return all episodes with progress = 0
      result = await resultFromQuery(query);
      result.should.not.be.empty;

      // check that any episode has the corresponding progress
      data[1].episodes.forEach((value) => {
        const index = result.findIndex((progress) => progress.id === value.id);
        // every episode in database should be returned from query
        index.should.not.equal(-1);
        // remove every progress hit
        const [episodeProgress] = result.splice(index, 1);

        const expectedProgress = existingUser.progress.find((progress) => progress.episodeId === episodeProgress.id);
        should.exist(expectedProgress);

        // progress needs to be zero
        episodeProgress.progress.should.equal(expectedProgress?.progress);
      });
      // there should not be any episodes progress left
      result.should.be.empty;
    });
  });

  describe("getAllReleases", function () {
    it("should not throw when using valid parameters");
  });

  describe("getDisplayReleases", function () {
    it("should not throw when using valid parameters");
  });

  describe("getMediumReleases", function () {
    it("should not throw when using valid parameters");
  });

  describe("getAssociatedEpisode", function () {
    it("should not throw when using valid parameters");
  });

  describe("getLatestReleases", function () {
    it("should not throw when using valid parameters");
  });

  describe("getReleases", function () {
    it("should not throw when using valid parameters");
  });

  describe("getReleasesByHost", function () {
    it("should not throw when using valid parameters");
  });

  describe("getPartsEpisodeIndices", function () {
    it("should not throw when using valid parameters");
  });

  /**
    * Add progress of an user in regard to an episode to the storage.;

    /**
     * Removes progress of an user in regard to an episode.
     */
  describe("removeProgress", function () {
    it("should not throw when using valid parameters");
  });

  /**
   * Sets the progress of an user in regard to an episode with one or multiple progressResult objects.
   */
  describe("setProgress", function () {
    it("should not throw when using valid parameters");
  });

  /**
   * Get the progress of an user in regard to an episode.
   */
  describe("getProgress", function () {
    it("should not throw when using valid parameters");
  });

  /**
   * Updates the progress of an user in regard to an episode.
   */
  describe("updateProgress", function () {
    it("should not throw when using valid parameters");
  });

  /**
   * Marks an Episode as read and adds it into Storage if the episode does not exist yet.
   */
  describe("markEpisodeRead", function () {
    it("should not throw when using valid parameters");
  });
  describe("addRelease", function () {
    it("should not throw when using valid parameters");
  });

  describe("getEpisodeLinksByMedium", function () {
    it("should not throw when using valid parameters");
  });

  describe("getSourcedReleases", function () {
    it("should not throw when using valid parameters");
  });

  describe("updateRelease", function () {
    it("should not throw when using valid parameters");
  });

  describe("deleteRelease", function () {
    it("should not throw when using valid parameters");
  });

  describe("getEpisodeContentData", function () {
    it("should not throw when using valid parameters");
  });

  describe("addEpisode", function () {
    it("should not throw when using valid parameters");
  });

  describe("getEpisode", function () {
    it("should not throw when using valid parameters");
  });

  describe("getPartMinimalEpisodes", function () {
    it("should not throw when using valid parameters");
  });

  describe("getPartEpisodePerIndex", function () {
    it("should not throw when using valid parameters");
  });

  describe("getMediumEpisodePerIndex", function () {
    it("should not throw when using valid parameters");
  });

  /**
   * Updates an episode from the storage.
   */
  describe("updateEpisode", function () {
    it("should not throw when using valid parameters");
  });

  /**
   * Updates an episode from the storage.
   */
  describe("moveEpisodeToPart", function () {
    it("should not throw when using valid parameters");
  });

  /**
   * Deletes an episode from the storage irreversibly.
   */
  describe("deleteEpisode", function () {
    it("should not throw when using valid parameters");
  });

  describe("getChapterIndices", function () {
    it("should not throw when using valid parameters");
  });

  describe("getAllChapterLinks", function () {
    it("should not throw when using valid parameters");
  });

  describe("getUnreadChapter", function () {
    it("should not throw when using valid parameters");
  });

  describe("getReadToday", function () {
    it("should not throw when using valid parameters");
  });

  describe("markLowerIndicesRead", function () {
    it("should not throw when using valid parameters");
  });
});
