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
  fillEpisodeReleaseTable,
  fillEpisodeTable,
  fillUserTable,
  getMediumOfEpisode,
} from "./contextHelper";
import { EpisodeRelease } from "enterprise-core/dist/types";

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
  afterEach(() => cleanAll());

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
      // TODO: write better test
      await expect(episodeStorage.getAllReleases()).resolves.toBeDefined();
    });
  });

  describe("getMediumReleases", () => {
    it("should not throw when using valid parameters", async () => {
      await fillEpisodeReleaseTable();
      const mediumId = getDatabaseData()[1].media[0].id;
      const uuid = Object.keys(getDatabaseData()[0])[0];
      const result = await episodeStorage.getMediumReleases(mediumId, uuid);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("getAssociatedEpisode", () => {
    it("should not throw when using valid parameters", async () => {
      const values = await fillEpisodeReleaseTable();
      expect(await episodeStorage.getAssociatedEpisode(values[0].url)).toBe(values[0].episodeId);
    });
  });

  describe("getLatestReleases", () => {
    it("should not throw when using valid parameters", async () => {
      await fillEpisodeReleaseTable();
      const staticData = getDatabaseData()[1];
      const mediumId = staticData.media[0].id;
      const result = await episodeStorage.getLatestReleases(mediumId);
      const expected = staticData.releases.filter((release) =>
        staticData.episodes.find(
          (episode) =>
            episode.id === release.episodeId &&
            staticData.parts.find((part) => part.id === episode.partId && part.mediumId === mediumId),
        ),
      );
      expect(result.length).toBeLessThanOrEqual(expected.length);
      expect(result.length === 0).toBe(expected.length === 0);
    });
  });

  describe("getReleases", () => {
    it("should not throw when using valid parameters", async () => {
      const values = await fillEpisodeReleaseTable();
      const result = await episodeStorage.getReleases(values.map((release) => release.episodeId));
      expect(values.length).toBe(result.length);
    });
  });

  describe("getReleasesByHost", () => {
    it("should not throw when using valid parameters", async () => {
      const values = await fillEpisodeReleaseTable();
      const result = await episodeStorage.getReleasesByHost(values[0].episodeId, values[0].url);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("getMediumReleasesByHost", () => {
    it("should not throw when using valid parameters", async () => {
      const [value] = await fillEpisodeReleaseTable();
      const medium = getMediumOfEpisode(value.episodeId);
      const result = await episodeStorage.getMediumReleasesByHost((medium as NonNullable<typeof medium>).id, value.url);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("getPartsEpisodeIndices", () => {
    it("should not throw when using valid parameters", async () => {
      const values = await fillEpisodeTable();
      const partIds = new Set(values.map((episode) => episode.partId));
      const result = await episodeStorage.getPartsEpisodeIndices([...partIds]);
      expect(partIds.size).toBe(result.length);
    });
  });

  /**
   * Removes progress of an user in regard to an episode.
   */
  describe("removeProgress", () => {
    it("should not throw when using valid parameters", async () => {
      const [value] = await fillUserEpisodeTable();
      expect(value.progress).toBeGreaterThan(0);
      await expect(episodeStorage.getProgress(value.uuid, value.episodeId)).resolves.toBe(value.progress);
      await expect(episodeStorage.removeProgress(value.uuid, value.episodeId)).resolves.toBe(true);
      await expect(episodeStorage.getProgress(value.uuid, value.episodeId)).resolves.toBe(0);
      await expect(episodeStorage.removeProgress(value.uuid, value.episodeId)).resolves.toBe(false);
    });
  });

  /**
   * Sets the progress of an user in regard to an episode with one or multiple progressResult objects.
   */
  describe("setProgress", () => {
    it("should not throw when using valid parameters", async () => {
      // FIXME remove this test and the whole method
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
      const [user] = await fillUserTable();
      const [episode] = await fillEpisodeTable();
      await expect(episodeStorage.updateProgress(user.uuid, episode.id, 0.5, null)).resolves.toBe(true);
      await expect(episodeStorage.getProgress(user.uuid, episode.id)).resolves.toBe(0.5);
      await expect(episodeStorage.updateProgress(user.uuid, episode.id, 0, null)).resolves.toBe(true);
      await expect(episodeStorage.getProgress(user.uuid, episode.id)).resolves.toBe(0);
    });
  });

  /**
   * Marks an Episode as read and adds it into Storage if the episode does not exist yet.
   */
  describe("markEpisodeRead", () => {
    it("should not throw when using valid parameters", async () => {
      // FIXME remote this test and the whole method
      await expect(episodeStorage.markEpisodeRead("", { result: [], url: "", accept: true })).resolves.toBeUndefined();
    });
  });
  describe("addRelease", () => {
    it("should not throw when using valid parameters", async () => {
      const [episode] = await fillEpisodeTable();
      const release = {
        episodeId: episode.id,
        releaseDate: new Date(),
        title: "hi",
        url: "https://book.url/test/",
      } as EpisodeRelease;
      await expect(episodeStorage.addRelease(release)).resolves.toEqual(release);
    });
  });

  describe("getEpisodeLinksByMedium", () => {
    it("should not throw when using valid parameters", async () => {
      const [release] = await fillEpisodeReleaseTable();
      const medium = getMediumOfEpisode(release.episodeId) as NonNullable<ReturnType<typeof getMediumOfEpisode>>;
      const result = await episodeStorage.getEpisodeLinksByMedium(medium.id);
      expect(result).toContainEqual({ episodeId: release.episodeId, url: release.url });
    });
  });

  describe("getSourcedReleases", () => {
    it("should not throw when using valid parameters", async () => {
      // TODO: write better test
      await expect(episodeStorage.getSourcedReleases("", 0)).resolves.toBeDefined();
    });
  });

  describe("updateRelease", () => {
    it("should not throw when using valid parameters", async () => {
      const [episode] = await fillEpisodeTable();
      const release = {
        episodeId: episode.id,
        releaseDate: new Date(),
        title: "hi",
        url: "https://book.url/test/",
      } as EpisodeRelease;
      release.releaseDate.setMilliseconds(0);

      // FIXME: currently getReleases returns null values for properties which do not contain the null type
      // either allow null, or remove keys with null values
      await episodeStorage.addRelease(release);
      await expect(episodeStorage.getReleases(release.episodeId)).resolves.toEqual([
        {
          ...release,
          sourceType: null,
          tocId: null,
          locked: false,
        },
      ]);
      release.locked = true;
      release.releaseDate.setHours(release.releaseDate.getHours() - 1);
      release.sourceType = "2";
      release.title = "2";
      await expect(episodeStorage.updateRelease(release)).resolves.toBeUndefined();
      await expect(episodeStorage.getReleases(release.episodeId)).resolves.toEqual([{ ...release, tocId: null }]);
    });
  });

  describe("deleteRelease", () => {
    it("should not throw when using valid parameters", async () => {
      // TODO: write better test
      await expect(
        episodeStorage.deleteRelease({ episodeId: 0, releaseDate: new Date(), title: "", url: "" }),
      ).resolves.toBeUndefined();
    });
  });

  describe("getEpisodeContentData", () => {
    it("should not throw when using valid parameters", async () => {
      // TODO: write better test
      await expect(episodeStorage.getEpisodeContentData("")).resolves.toBeDefined();
    });
  });

  describe("addEpisode", () => {
    afterAll(() => cleanAll());
    it("should not throw when using valid parameters", async () => {
      await fillPartTable();
      // TODO: write better test
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
      // TODO: write better test
      await expect(episodeStorage.getEpisode(0, "")).resolves.toBeDefined();
    });
  });

  describe("getPartMinimalEpisodes", () => {
    it("should not throw when using valid parameters", async () => {
      // TODO: write better test
      await expect(episodeStorage.getPartMinimalEpisodes(0)).resolves.toBeDefined();
    });
  });

  describe("getPartEpisodePerIndex", () => {
    it("should not throw when using valid parameters", async () => {
      // TODO: write better test
      await expect(episodeStorage.getPartEpisodePerIndex(0, 0)).resolves.toBeDefined();
    });
  });

  describe("getMediumEpisodePerIndex", () => {
    it("should not throw when using valid parameters", async () => {
      // TODO: write better test
      await expect(episodeStorage.getMediumEpisodePerIndex(0, 0)).resolves.toBeDefined();
    });
  });

  /**
   * Updates an episode from the storage.
   */
  describe("updateEpisode", () => {
    it("should not throw when using valid parameters", async () => {
      // TODO: write better test
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
      // TODO: write better test
      await expect(episodeStorage.moveEpisodeToPart(0, 0)).resolves.toBeDefined();
    });
  });

  /**
   * Deletes an episode from the storage irreversibly.
   */
  describe("deleteEpisode", () => {
    it("should not throw when using valid parameters", async () => {
      // TODO: write better test
      await expect(episodeStorage.deleteEpisode(0)).resolves.toBeDefined();
    });
  });

  describe("getChapterIndices", () => {
    it("should not throw when using valid parameters", async () => {
      // TODO: write better test
      await expect(episodeStorage.getChapterIndices(0)).resolves.toBeDefined();
    });
  });

  describe("getAllChapterLinks", () => {
    it("should not throw when using valid parameters", async () => {
      // TODO: write better test
      await expect(episodeStorage.getAllChapterLinks(0)).resolves.toBeDefined();
    });
  });

  describe("getUnreadChapter", () => {
    it("should not throw when using valid parameters", async () => {
      // TODO: write better test
      await expect(episodeStorage.getUnreadChapter("")).resolves.toBeDefined();
    });
  });

  describe("getReadToday", () => {
    it("should not throw when using valid parameters", async () => {
      // TODO: write better test
      await expect(episodeStorage.getReadToday("")).resolves.toBeDefined();
    });
  });

  describe("markLowerIndicesRead", () => {
    it("should not throw when using valid parameters", async () => {
      // TODO: write better test
      await expect(episodeStorage.markLowerIndicesRead("", 0)).resolves.toBeUndefined();
    });
  });
});
