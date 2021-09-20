import * as scraperTools from "../../../externals/scraperTools";
import * as tools from "enterprise-core/dist/tools";
import { isTocPart } from "../../../tools";
import { Toc } from "../../../externals/types";
const MediaType = tools.MediaType;

export function testGeneralToc(toc: Toc): void {
  expect(toc).toBeInstanceOf("object");
  expect(toc.title).toBeInstanceOf("string");
  expect(toc.link).toBeInstanceOf("string");
  expect(toc.mediumType).toBe(MediaType.TEXT);
  expect(toc.content).toBeInstanceOf("array");

  const seenFirstLevelIndices = [];
  const seenSecondLevelIndices = [];

  for (let i = 0; i < toc.content.length; i++) {
    const tocContent = toc.content[i];
    expect(() => scraperTools.checkTocContent(tocContent)).not.toThrowError();
    expect(tocContent.title).not.toHaveLength(0);

    if (i > 0) {
      // total Index of TocContent should be unique to ToC at this level
      expect(seenFirstLevelIndices).toEqual(expect.not.arrayContaining([tocContent.combiIndex]));
      seenFirstLevelIndices.push(tocContent.combiIndex);
    }
    if (isTocPart(tocContent)) {
      expect(tocContent.episodes).toBeInstanceOf("array");
      for (let j = 0; j < tocContent.episodes.length; j++) {
        const episode = tocContent.episodes[j];
        expect(() => scraperTools.checkTocContent(episode)).not.toThrowError();

        if (j > 0) {
          // total Index of TocContent should be unique to ToC at this level
          expect(seenSecondLevelIndices).not.toContain(episode.combiIndex);
          seenSecondLevelIndices.push(episode.combiIndex);
        }
      }
    }
  }
}
