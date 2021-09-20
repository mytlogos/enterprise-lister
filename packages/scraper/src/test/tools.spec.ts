import { isTocEpisode, isTocPart } from "../tools";

describe("testing tool.js", () => {
  describe("test isTocPart", () => {
    it("should work correctly when given a valid value", () => {
      expect(isTocPart({ combiIndex: 1, title: "ajsio", totalIndex: 1 })).toBe(false);
      // @ts-expect-error
      expect(isTocPart({ combiIndex: 1, title: "ajsio", totalIndex: 1, url: "sjid" })).toBe(false);
      // @ts-expect-error
      expect(isTocPart({ combiIndex: 1, title: "ajsio", totalIndex: 1, episodes: [] })).toBe(true);
    });
  });
  describe("test isTocEpisode", () => {
    it("should work correctly when given a valid value", () => {
      expect(isTocEpisode({ combiIndex: 1, title: "ajsio", totalIndex: 1 })).toBe(false);
      // @ts-expect-error
      expect(isTocEpisode({ combiIndex: 1, title: "ajsio", totalIndex: 1, episodes: [] })).toBe(false);
      // @ts-expect-error
      expect(isTocEpisode({ combiIndex: 1, title: "ajsio", totalIndex: 1, url: "sjid" })).toBe(true);
    });
  });
});
