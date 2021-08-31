import * as tools from "enterprise-core/dist/tools";
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
  fillPartTable,
} from "./contextHelper";

jest.setTimeout(60000);

beforeAll(async () => {
  jest.setTimeout(60000);
  await setupTestDatabase();
  await tools.delay(2000);
});

afterAll(async () => {
  // await tearDownTestDatabase();
  tools.internetTester.stop();
  return storage.stopStorage();
});

describe("episodeContext", () => {
  describe("getDisplayReleases", () => {
    it("should not throw, when using valid parameters", async () => {
      await expect(
        episodeStorage.getDisplayReleases(new Date(), new Date(), true, "12", [], [], [], []),
      ).resolves.toBeDefined();
      await expect(
        episodeStorage.getDisplayReleases(new Date(), null, null, "12", [], [], [], []),
      ).resolves.toBeDefined();
    });
  });

  describe("getAll", () => {
    afterAll(() => cleanAll());
    afterEach(() => cleanUserEpisode());
    it("should not return any rows", async () => {
      const query = await episodeStorage.getAll("");
      // on the first query it should not produce any rows
      const checkEmpty = checkEmptyQuery(query);
      await expect(checkEmpty).resolves.toBeUndefined();
    });
    it("should return correct rows", async () => {
      // the data available in the table
      const expected = await fillUserEpisodeTable();
      const uuid = expected[0].uuid;

      // query without a user uuid which exists
      let query = await episodeStorage.getAll(uuid);
      // should return all episodes with progress = 0
      let result = await resultFromQuery(query);

      const data = getDatabaseData();
      // check that any episode has the corresponding
      data[1].episodes.forEach((value) => {
        const index = result.findIndex((progress) => progress.id === value.id);
        // every episode in database should be returned from query
        expect(index).not.toEqual(-1);
        // remove every progress hit
        const [episodeProgress] = result.splice(index, 1);

        const expectedIndex = expected.findIndex((progress) => progress.episodeId === value.id);
        expect(expectedIndex).not.toEqual(-1);

        // progress needs to be zero
        expect(episodeProgress.progress).toEqual(expected[expectedIndex].progress);
      });
      // there should not be any episodes progress left
      expect(result).toHaveLength(0);

      const existingUser = Object.values(data[0])[0];

      // query without a user uuid which exists
      query = await episodeStorage.getAll(existingUser.uuid);
      // should return all episodes with progress = 0
      result = await resultFromQuery(query);
      expect(result.length).toBeGreaterThan(0);

      // check that any episode has the corresponding progress
      data[1].episodes.forEach((value) => {
        const index = result.findIndex((progress) => progress.id === value.id);
        // every episode in database should be returned from query
        expect(index).not.toBe(-1);
        // remove every progress hit
        const [episodeProgress] = result.splice(index, 1);

        const expectedProgress = existingUser.progress.find((progress) => progress.episodeId === episodeProgress.id);
        expect(expectedProgress).toBeDefined();

        // progress needs to be zero
        expect(episodeProgress.progress).toBe(expectedProgress?.progress);
      });
      // there should not be any episodes progress left
      expect(result).toHaveLength(0);
    });
  });

  describe("getAllReleases", () => {
    it("should not throw", async () => {
      await expect(episodeStorage.getAllReleases()).resolves.toBeDefined();
    });
  });

  describe("getMediumReleases", () => {
    it("should not throw when using valid parameters", async () => {
      await expect(episodeStorage.getMediumReleases(0, "")).resolves.toBeDefined();
    });
  });

  describe("getAssociatedEpisode", () => {
    it("should not throw when using valid parameters", async () => {
      await expect(episodeStorage.getAssociatedEpisode("")).resolves.toBeDefined();
    });
  });

  describe("getLatestReleases", () => {
    it("should not throw when using valid parameters", async () => {
      await expect(episodeStorage.getLatestReleases(0)).resolves.toBeDefined();
    });
  });

  describe("getReleases", () => {
    it("should not throw when using valid parameters", async () => {
      await expect(episodeStorage.getReleases(0)).resolves.toBeDefined();
    });
  });

  describe("getReleasesByHost", () => {
    it("should not throw when using valid parameters", async () => {
      await expect(episodeStorage.getReleasesByHost(0, "")).resolves.toBeDefined();
    });
  });

  describe("getPartsEpisodeIndices", () => {
    it("should not throw when using valid parameters", async () => {
      await expect(episodeStorage.getPartsEpisodeIndices(0)).resolves.toBeDefined();
    });
  });

  /**
   * Removes progress of an user in regard to an episode.
   */
  describe("removeProgress", () => {
    it("should not throw when using valid parameters", async () => {
      await expect(episodeStorage.removeProgress("", 0)).resolves.toBeDefined();
    });
  });

  /**
   * Sets the progress of an user in regard to an episode with one or multiple progressResult objects.
   */
  describe("setProgress", () => {
    it("should not throw when using valid parameters", async () => {
      await expect(episodeStorage.setProgress("", [])).resolves.toBeUndefined();
    });
  });

  /**
   * Get the progress of an user in regard to an episode.
   */
  describe("getProgress", () => {
    afterAll(() => cleanAll());
    it("should not throw when using valid parameters", async () => {
      const expected = await fillUserEpisodeTable();
      await expect(episodeStorage.getProgress(expected[0].uuid, expected[0].episodeId)).resolves.toBe(
        expected[0].progress,
      );
    });
  });

  /**
   * Updates the progress of an user in regard to an episode.
   */
  describe("updateProgress", () => {
    it("should not throw when using valid parameters", async () => {
      await expect(episodeStorage.updateProgress("", 0, 0, null)).resolves.toBeDefined();
    });
  });

  /**
   * Marks an Episode as read and adds it into Storage if the episode does not exist yet.
   */
  describe("markEpisodeRead", () => {
    it("should not throw when using valid parameters", async () => {
      await expect(episodeStorage.markEpisodeRead("", { result: [], url: "", accept: true })).resolves.toBeUndefined();
    });
  });
  describe("addRelease", () => {
    it("should not throw when using valid parameters", async () => {
      await expect(episodeStorage.addRelease([])).resolves.toBeDefined();
    });
  });

  describe("getEpisodeLinksByMedium", () => {
    it("should not throw when using valid parameters", async () => {
      await expect(episodeStorage.getEpisodeLinksByMedium(0)).resolves.toBeDefined();
    });
  });

  describe("getSourcedReleases", () => {
    it("should not throw when using valid parameters", async () => {
      await expect(episodeStorage.getSourcedReleases("", 0)).resolves.toBeDefined();
    });
  });

  describe("updateRelease", () => {
    it("should not throw when using valid parameters", async () => {
      await expect(episodeStorage.updateRelease([])).resolves.toBeUndefined();
    });
  });

  describe("deleteRelease", () => {
    it("should not throw when using valid parameters", async () => {
      await expect(
        episodeStorage.deleteRelease({ episodeId: 0, releaseDate: new Date(), title: "", url: "" }),
      ).resolves.toBeUndefined();
    });
  });

  describe("getEpisodeContentData", () => {
    it("should not throw when using valid parameters", async () => {
      await expect(episodeStorage.getEpisodeContentData("")).resolves.toBeDefined();
    });
  });

  describe("addEpisode", () => {
    afterAll(() => cleanAll());
    it("should not throw when using valid parameters", async () => {
      await fillPartTable();

      await expect(
        episodeStorage.addEpisode({
          id: 0,
          partId: 1,
          releases: [],
          totalIndex: 0,
        }),
      ).resolves.toBeDefined();
    });
  });

  describe("getEpisode", () => {
    it("should not throw when using valid parameters", async () => {
      await expect(episodeStorage.getEpisode(0, "")).resolves.toBeDefined();
    });
  });

  describe("getPartMinimalEpisodes", () => {
    it("should not throw when using valid parameters", async () => {
      await expect(episodeStorage.getPartMinimalEpisodes(0)).resolves.toBeDefined();
    });
  });

  describe("getPartEpisodePerIndex", () => {
    it("should not throw when using valid parameters", async () => {
      await expect(episodeStorage.getPartEpisodePerIndex(0, 0)).resolves.toBeDefined();
    });
  });

  describe("getMediumEpisodePerIndex", () => {
    it("should not throw when using valid parameters", async () => {
      await expect(episodeStorage.getMediumEpisodePerIndex(0, 0)).resolves.toBeDefined();
    });
  });

  /**
   * Updates an episode from the storage.
   */
  describe("updateEpisode", () => {
    it("should not throw when using valid parameters", async () => {
      await expect(
        episodeStorage.updateEpisode({
          id: 0,
          partId: 0,
          releases: [],
          totalIndex: 0,
        }),
      ).resolves.toBeDefined();
    });
  });

  /**
   * Updates an episode from the storage.
   */
  describe("moveEpisodeToPart", () => {
    it("should not throw when using valid parameters", async () => {
      await expect(episodeStorage.moveEpisodeToPart(0, 0)).resolves.toBeDefined();
    });
  });

  /**
   * Deletes an episode from the storage irreversibly.
   */
  describe("deleteEpisode", () => {
    it("should not throw when using valid parameters", async () => {
      await expect(episodeStorage.deleteEpisode(0)).resolves.toBeDefined();
    });
  });

  describe("getChapterIndices", () => {
    it("should not throw when using valid parameters", async () => {
      await expect(episodeStorage.getChapterIndices(0)).resolves.toBeDefined();
    });
  });

  describe("getAllChapterLinks", () => {
    it("should not throw when using valid parameters", async () => {
      await expect(episodeStorage.getAllChapterLinks(0)).resolves.toBeDefined();
    });
  });

  describe("getUnreadChapter", () => {
    it("should not throw when using valid parameters", async () => {
      await expect(episodeStorage.getUnreadChapter("")).resolves.toBeDefined();
    });
  });

  describe("getReadToday", () => {
    it("should not throw when using valid parameters", async () => {
      await expect(episodeStorage.getReadToday("")).resolves.toBeDefined();
    });
  });

  describe("markLowerIndicesRead", () => {
    it("should not throw when using valid parameters", async () => {
      await expect(episodeStorage.markLowerIndicesRead("", 0)).resolves.toBeUndefined();
    });
  });
});
