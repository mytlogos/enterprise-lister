import { isTocEpisode, isTocPart } from "../tools";

describe("testing tool.js", () => {
  describe("test isTocPart", () => {
    it("should work correctly when given a valid value", () => {
      // @ts-expect-error
      expect(isTocPart({ combiIndex: 1, title: "ajsio", totalIndex: 1 })).toBe(false);
      expect(isTocPart({ combiIndex: 1, title: "ajsio", totalIndex: 1, url: "sjid" })).toBe(false);
      expect(isTocPart({ combiIndex: 1, title: "ajsio", totalIndex: 1, episodes: [] })).toBe(true);
    });
  });
  describe("test isTocEpisode", () => {
    it("should work correctly when given a valid value", () => {
      // @ts-expect-error
      expect(isTocEpisode({ combiIndex: 1, title: "ajsio", totalIndex: 1 })).toBe(false);
      expect(isTocEpisode({ combiIndex: 1, title: "ajsio", totalIndex: 1, episodes: [] })).toBe(false);
      expect(isTocEpisode({ combiIndex: 1, title: "ajsio", totalIndex: 1, url: "sjid" })).toBe(true);
    });
  });
});
