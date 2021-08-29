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
    it("should not throw", async function () {
      await episodeStorage.getAllReleases().should.eventually.not.be.rejected;
    });
  });

  describe("getMediumReleases", function () {
    it("should not throw when using valid parameters", async function () {
      await episodeStorage.getMediumReleases(0, "").should.eventually.not.be.rejected;
    });
  });

  describe("getAssociatedEpisode", function () {
    it("should not throw when using valid parameters", async function () {
      await episodeStorage.getAssociatedEpisode("").should.eventually.not.be.rejected;
    });
  });

  describe("getLatestReleases", function () {
    it("should not throw when using valid parameters", async function () {
      await episodeStorage.getLatestReleases(0).should.eventually.not.be.rejected;
    });
  });

  describe("getReleases", function () {
    it("should not throw when using valid parameters", async function () {
      await episodeStorage.getReleases(0).should.eventually.not.be.rejected;
    });
  });

  describe("getReleasesByHost", function () {
    it("should not throw when using valid parameters", async function () {
      await episodeStorage.getReleasesByHost(0, "").should.eventually.not.be.rejected;
    });
  });

  describe("getPartsEpisodeIndices", function () {
    it("should not throw when using valid parameters", async function () {
      await episodeStorage.getPartsEpisodeIndices(0).should.eventually.not.be.rejected;
    });
  });

  /**
    * Add progress of an user in regard to an episode to the storage.;

    /**
     * Removes progress of an user in regard to an episode.
     */
  describe("removeProgress", function () {
    it("should not throw when using valid parameters", async function () {
      await episodeStorage.removeProgress("", 0).should.eventually.not.be.rejected;
    });
  });

  /**
   * Sets the progress of an user in regard to an episode with one or multiple progressResult objects.
   */
  describe("setProgress", function () {
    it("should not throw when using valid parameters", async function () {
      await episodeStorage.setProgress("", []).should.eventually.not.be.rejected;
    });
  });

  /**
   * Get the progress of an user in regard to an episode.
   */
  describe("getProgress", function () {
    it("should not throw when using valid parameters", async function () {
      await episodeStorage.getProgress("", 0).should.eventually.not.be.rejected;
    });
  });

  /**
   * Updates the progress of an user in regard to an episode.
   */
  describe("updateProgress", function () {
    it("should not throw when using valid parameters", async function () {
      await episodeStorage.updateProgress("", 0, 0, null).should.eventually.not.be.rejected;
    });
  });

  /**
   * Marks an Episode as read and adds it into Storage if the episode does not exist yet.
   */
  describe("markEpisodeRead", function () {
    it("should not throw when using valid parameters", async function () {
      await episodeStorage.markEpisodeRead("", { result: [], url: "", accept: true }).should.eventually.not.be.rejected;
    });
  });
  describe("addRelease", function () {
    it("should not throw when using valid parameters", async function () {
      await episodeStorage.addRelease([]).should.eventually.not.be.rejected;
    });
  });

  describe("getEpisodeLinksByMedium", function () {
    it("should not throw when using valid parameters", async function () {
      await episodeStorage.getEpisodeLinksByMedium(0).should.eventually.not.be.rejected;
    });
  });

  describe("getSourcedReleases", function () {
    it("should not throw when using valid parameters", async function () {
      await episodeStorage.getSourcedReleases("", 0).should.eventually.not.be.rejected;
    });
  });

  describe("updateRelease", function () {
    it("should not throw when using valid parameters", async function () {
      await episodeStorage.updateRelease([]).should.eventually.not.be.rejected;
    });
  });

  describe("deleteRelease", function () {
    it("should not throw when using valid parameters", async function () {
      await episodeStorage.deleteRelease({ episodeId: 0, releaseDate: new Date(), title: "", url: "" }).should
        .eventually.not.be.rejected;
    });
  });

  describe("getEpisodeContentData", function () {
    it("should not throw when using valid parameters", async function () {
      await episodeStorage.getEpisodeContentData("").should.eventually.not.be.rejected;
    });
  });

  describe("addEpisode", function () {
    it("should not throw when using valid parameters", async function () {
      await episodeStorage.addEpisode({
        id: 1,
        partId: 1,
        releases: [],
        totalIndex: 0,
      }).should.eventually.not.be.rejected;
    });
  });

  describe("getEpisode", function () {
    it("should not throw when using valid parameters", async function () {
      await episodeStorage.getEpisode(0, "").should.eventually.not.be.rejected;
    });
  });

  describe("getPartMinimalEpisodes", function () {
    it("should not throw when using valid parameters", async function () {
      await episodeStorage.getPartMinimalEpisodes(0).should.eventually.not.be.rejected;
    });
  });

  describe("getPartEpisodePerIndex", function () {
    it("should not throw when using valid parameters", async function () {
      await episodeStorage.getPartEpisodePerIndex(0, 0).should.eventually.not.be.rejected;
    });
  });

  describe("getMediumEpisodePerIndex", function () {
    it("should not throw when using valid parameters", async function () {
      await episodeStorage.getMediumEpisodePerIndex(0, 0).should.eventually.not.be.rejected;
    });
  });

  /**
   * Updates an episode from the storage.
   */
  describe("updateEpisode", function () {
    it("should not throw when using valid parameters", async function () {
      await episodeStorage.updateEpisode({
        id: 0,
        partId: 0,
        releases: [],
        totalIndex: 0,
      }).should.eventually.not.be.rejected;
    });
  });

  /**
   * Updates an episode from the storage.
   */
  describe("moveEpisodeToPart", function () {
    it("should not throw when using valid parameters", async function () {
      await episodeStorage.moveEpisodeToPart(0, 0).should.eventually.not.be.rejected;
    });
  });

  /**
   * Deletes an episode from the storage irreversibly.
   */
  describe("deleteEpisode", function () {
    it("should not throw when using valid parameters", async function () {
      await episodeStorage.deleteEpisode(0).should.eventually.not.be.rejected;
    });
  });

  describe("getChapterIndices", function () {
    it("should not throw when using valid parameters", async function () {
      await episodeStorage.getChapterIndices(0).should.eventually.not.be.rejected;
    });
  });

  describe("getAllChapterLinks", function () {
    it("should not throw when using valid parameters", async function () {
      await episodeStorage.getAllChapterLinks(0).should.eventually.not.be.rejected;
    });
  });

  describe("getUnreadChapter", function () {
    it("should not throw when using valid parameters", async function () {
      await episodeStorage.getUnreadChapter("").should.eventually.not.be.rejected;
    });
  });

  describe("getReadToday", function () {
    it("should not throw when using valid parameters", async function () {
      await episodeStorage.getReadToday("").should.eventually.not.be.rejected;
    });
  });

  describe("markLowerIndicesRead", function () {
    it("should not throw when using valid parameters", async function () {
      await episodeStorage.markLowerIndicesRead("", 0).should.eventually.not.be.rejected;
    });
  });
});
