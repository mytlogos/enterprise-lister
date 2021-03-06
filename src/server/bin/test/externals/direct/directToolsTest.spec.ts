"use strict";
import sinon from "sinon";
import sinon_chai from "sinon-chai";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import * as directTools from "../../../externals/direct/directTools";
import * as tools from "../../../tools";
import fs from "fs";
import cheerio from "cheerio";
import { EmptyPromise } from "../../../types";

after(() => {
  tools.internetTester.stop();
});

chai.use(sinon_chai);
chai.use(chaiAsPromised);
chai.should();

interface TocSnippet {
  mediumType: tools.MediaType;
  end: boolean;
  title: string;
}

interface ReleaseSnippet {
  releaseDate: Date;
  title: string;
  url: string;
}
type TocGenerator = AsyncGenerator<TocSnippet | ReleaseSnippet, void, any>;

/**
 *
 * @param {string[]} pages
 * @return {TocGenerator}
 */
async function* novelfullGenerator(pages: string[], mediumType = tools.MediaType.TEXT): TocGenerator {
  const now = new Date();
  let tocYielded = false;
  for (const page of pages) {
    const content = await fs.promises.readFile(page, "utf8");
    const $ = cheerio.load(content);
    const mediumTitleElement = $(".desc .title").first();
    const mediumTitle = tools.sanitizeString(mediumTitleElement.text());

    const items = $(".list-chapter li a");

    const releaseStatusString = $(".info-holder .info div:nth-child(4) a").text().trim().toLowerCase();

    let end = false;
    if (releaseStatusString === "ongoing") {
      end = false;
    } else if (releaseStatusString === "completed") {
      end = true;
    }
    if (!tocYielded) {
      const tocMeta = {
        title: mediumTitle,
        mediumType,
        end,
      };
      yield tocMeta;
      tocYielded = true;
    }

    for (let i = 0; i < items.length; i++) {
      const newsRow = items.eq(i);
      const link = newsRow.attr("href");
      const episodeTitle = tools.sanitizeString(newsRow.text());
      yield {
        title: episodeTitle,
        url: link as string,
        releaseDate: now,
      };
    }
  }
}

/**
 *
 * @param {string} resource path to the resource in the tests/resources directory
 * @return {TocGenerator}
 */
async function* boxNovelGenerator(resource: string, mediumType = tools.MediaType.TEXT): TocGenerator {
  const content = await fs.promises.readFile(`tests/resources/${resource}`, "utf8");
  const $ = cheerio.load(content);
  const mediumTitleElement = $(".post-title h3");
  mediumTitleElement.find("span").remove();
  const mediumTitle = tools.sanitizeString(mediumTitleElement.text());

  const items = $(".wp-manga-chapter");

  const releaseStatusString = $(".post-status .post-content_item:nth-child(2) .summary-content")
    .text()
    .trim()
    .toLowerCase();

  let end = false;
  if (releaseStatusString === "ongoing") {
    end = false;
  } else if (releaseStatusString === "completed") {
    end = true;
  }
  const tocMeta = {
    title: mediumTitle,
    mediumType,
    end,
  };
  yield tocMeta;
  for (let i = 0; i < items.length; i++) {
    const newsRow = items.eq(i);

    const titleElement = newsRow.find("a");
    const link = titleElement.attr("href");

    const timeStampElement = newsRow.find(".chapter-release-date");
    const dateString = timeStampElement.text().trim();
    const lowerDate = dateString.toLowerCase();

    let date;
    if (lowerDate.includes("now") || lowerDate.includes("ago")) {
      date = tools.relativeToAbsoluteTime(dateString);
    } else {
      date = new Date(dateString);
    }

    yield {
      title: titleElement.text(),
      url: link as string,
      releaseDate: date as Date,
    };
  }
}

/**
 * @typedef PartialRelease
 * @property {string | undefined} title
 * @property {number} combiIndex
 * @property {number | undefined} totalIndex
 * @property {number | undefined} partialIndex
 * @property {boolean | undefined} locked
 * @property {string | undefined} url
 * @property {Date | undefined} releaseDate
 */

/**
 * @typedef Release
 * @property {string} title
 * @property {number} combiIndex
 * @property {number} totalIndex
 * @property {number | undefined} partialIndex
 * @property {boolean} locked
 * @property {string} url
 * @property {Date} releaseDate
 */

/**
 * Create full Releasse with sensible defaults from partial Releases.
 * Convenience function to reduce code duplication.
 * It does not modify the parameter and creates new objects instead.
 *
 * @param {Date} now
 * @param {PartialRelease[]} params partial releases to map
 * @returns {Release[]}
 */
function createReleases(now: Date, ...params: PartialRelease[]): Release[] {
  return params.map((value) => {
    return {
      title: "",
      totalIndex: value.combiIndex,
      partialIndex: undefined,
      locked: false,
      url: "",
      releaseDate: now,
      ...value,
    };
  });
}

interface PartialPart {
  title?: string;
  combiIndex: number;
  totalIndex?: number;
  partialIndex?: number;
  episodes: PartialRelease[];
}

interface Part {
  title: string;
  combiIndex: number;
  totalIndex: number;
  partialIndex?: number;
  episodes: PartialRelease[];
}

interface PartialRelease {
  title?: string;
  combiIndex: number;
  totalIndex?: number;
  partialIndex?: number;
}

interface PartialRelease {
  title?: string;
  combiIndex: number;
  totalIndex?: number;
  partialIndex?: number;
  locked?: boolean;
  url?: string;
  releaseDate?: Date;
}

interface Release {
  title: string;
  combiIndex: number;
  totalIndex: number;
  partialIndex?: number;
  locked: boolean;
  url: string;
  releaseDate?: Date;
}

/**
 * @typedef PartialPart
 * @property {string | undefined} title
 * @property {number} combiIndex
 * @property {number | undefined} totalIndex
 * @property {number | undefined} partialIndex
 * @property {PartialRelease[]} episodes
 */

/**
 * @typedef Part
 * @property {string} title
 * @property {number} combiIndex
 * @property {number} totalIndex
 * @property {number | undefined} partialIndex
 * @property {Release} episodes
 */

/**
 * Create full PartReleases with sensible defaults from partial PartReleases.
 * Convenience function to reduce code duplication.
 * It does not modify the parameter and creates new objects instead.
 *
 * @param {Date} now
 * @param {PartialPart[]} params partial parts to map
 * @returns {Part[]}
 */
function createParts(now: Date, ...params: PartialPart[]): Part[] {
  return params.map((value) => {
    return {
      title: "",
      totalIndex: value.combiIndex,
      partialIndex: undefined,
      ...value,
      episodes: createReleases(now, ...value.episodes),
    };
  });
}

/**
 * Tests that the input generates the expected output.
 * The expeced Output Paramater is the expected Result with
 * the default values ommitted. The expecated values will be mapped
 * to the full result with their default values defined.
 *
 * Convenience function to reduce Code duplication.
 *
 * @param {Array<string | { title: string, mediumType: number }>} titles the title to extract from
 * @param {PartialPart[] | PartRelease[]} expected the expected result
 */
async function testStaticCase(
  titles: Array<string | { title: string; mediumType: number; end?: boolean }>,
  expected: PartialPart[] | PartialRelease[],
) {
  const now = new Date();
  const generator = (async function* testGenerator() {
    for (const title of titles) {
      // mediumType is defined it is a TocMeta and not a release or part
      // @ts-expect-error
      if (title.mediumType != null) {
        yield title;
      } else {
        yield { url: "", title, releaseDate: now };
      }
    }
  })();

  // @ts-expect-error
  const contents = await directTools.scrapeToc(generator);
  // @ts-expect-error
  const createResult = expected[0] && expected[0].episodes ? createParts : createReleases;

  // @ts-expect-error
  contents.should.deep.equal(createResult(now, ...expected));
}

interface Case {
  pages: string[];
  domain: "novelfull";
  hasParts: boolean;
  hasLocked: boolean;
  numberEpisodes: number;
  lastIndex: number;
}

/**
 * @typedef Case
 * @property {string[]} pages
 * @property {"novelfull"} domain
 * @property {boolean} hasParts
 * @property {boolean} hasLocked
 * @property {number} numberEpisodes
 * @property {number} lastIndex
 */

/**
 *
 * @param {string} path
 * @return {Promise<Case>}
 */
async function readCase(path: string): Promise<Case> {
  const fileContent = await fs.promises.readFile("tests/externals/direct/cases/" + path, "utf8");
  return JSON.parse(fileContent);
}

/**
 *
 * @param {string} casePath
 * @return {EmptyPromise}
 */
async function testCase(casePath: string): EmptyPromise {
  const caseData = await readCase(casePath);

  /**
   * @type {TocGenerator}
   */
  let generator: TocGenerator;
  if (caseData.domain === "novelfull") {
    generator = novelfullGenerator(caseData.pages);
  } else {
    throw Error(`no known generator for domain ${caseData.domain}`);
  }

  const contents = await directTools.scrapeToc(generator);
  contents.should.be.an("array");

  let currentEpisodeIndex = 0;
  let episodesCount = 0;

  for (const content of contents) {
    content.should.have.property("title");

    // @ts-expect-error
    if (content.episodes) {
      // @ts-expect-error
      content.episodes.should.be.an("array");

      // @ts-expect-error
      for (const episode of content.episodes) {
        caseData.hasParts.should.not.equal(false);
        episode.should.have.property("title");
        episode.should.not.match(/^[\s:–,.-]+|[\s:–,.-]+$/);
        episode.combiIndex.should.be.at.least(currentEpisodeIndex);
        episode.should.have.property("url");

        if (!caseData.hasLocked) {
          episode.should.have.property("locked", false);
        } else {
          // TODO check that it is either true/false?
        }
        episode.should.have.property("releaseDate");
        currentEpisodeIndex = episode.combiIndex;
        episodesCount++;
      }
    } else {
      episodesCount++;
      content.combiIndex.should.be.at.least(currentEpisodeIndex);
      content.should.not.match(/^[\s:–,.-]+|[\s:–,.-]+$/);
      content.should.have.property("url");

      if (!caseData.hasLocked) {
        content.should.have.property("locked", false);
      } else {
        // TODO check that it is either true/false?
      }

      content.should.have.property("releaseDate");
      currentEpisodeIndex = content.combiIndex;
    }
  }
  currentEpisodeIndex.should.equal(caseData.lastIndex);
  episodesCount.should.equal(caseData.numberEpisodes);
}

describe("testing scrapeToc", () => {
  it("should extract correct toc: chapter indices only", async function () {
    testStaticCase(
      ["Chapter 1", "Chapter 2", "Chapter 3", "Chapter 4"],
      [{ combiIndex: 1 }, { combiIndex: 2 }, { combiIndex: 3 }, { combiIndex: 4 }],
    );
  });
  it("should extract correct toc: chapter indices with title only", async function () {
    testStaticCase(
      [
        "Chapter 1 -  I am HitchCock",
        "Chapter 2:  I am HitchCock1",
        "Chapter 3 -  I am HitchCock2",
        "Chapter 4 -  I am HitchCock3",
      ],
      [
        {
          title: "I am HitchCock",
          combiIndex: 1,
        },
        {
          title: "I am HitchCock1",
          combiIndex: 2,
        },
        {
          title: "I am HitchCock2",
          combiIndex: 3,
        },
        {
          title: "I am HitchCock3",
          combiIndex: 4,
        },
      ],
    );
  });
  it("should extract correct toc: chapter indices with partial index with title only", async function () {
    testStaticCase(
      [
        "Chapter 1 -  I am HitchCock",
        "Chapter 2:  I am HitchCock1",
        "Chapter 2.5:  I am HitchCock1",
        "Chapter 3 -  I am HitchCock2",
        "Chapter 4 -  I am HitchCock3 Part 1",
        "Chapter 4 -  I am HitchCock3 Part 2",
      ],
      [
        {
          title: "I am HitchCock",
          combiIndex: 1,
        },
        {
          title: "I am HitchCock1",
          combiIndex: 2,
        },
        {
          title: "I am HitchCock1",
          combiIndex: 2.5,
          totalIndex: 2,
          partialIndex: 5,
        },
        {
          title: "I am HitchCock2",
          combiIndex: 3,
        },
        {
          title: "I am HitchCock3",
          combiIndex: 4.1,
          totalIndex: 4,
          partialIndex: 1,
        },
        {
          title: "I am HitchCock3",
          combiIndex: 4.2,
          totalIndex: 4,
          partialIndex: 2,
        },
      ],
    );
  });
  it("should extract correct toc: short form chapter indices with partial index with title only", async function () {
    testStaticCase(
      [
        "Ch. 1 -  I am HitchCock",
        "C2:  I am HitchCock1",
        "2.5:  I am HitchCock1",
        "Chapter. 3 -  I am HitchCock2",
        "c4 -  I am HitchCock3 [1/2]",
        "4 -  I am HitchCock3 Part 2",
      ],
      [
        {
          title: "I am HitchCock",
          combiIndex: 1,
        },
        {
          title: "I am HitchCock1",
          combiIndex: 2,
        },
        {
          title: "I am HitchCock1",
          combiIndex: 2.5,
          totalIndex: 2,
          partialIndex: 5,
        },
        {
          title: "I am HitchCock2",
          combiIndex: 3,
        },
        {
          title: "I am HitchCock3",
          combiIndex: 4.1,
          totalIndex: 4,
          partialIndex: 1,
        },
        {
          title: "I am HitchCock3",
          combiIndex: 4.2,
          totalIndex: 4,
          partialIndex: 2,
        },
      ],
    );
  });
  it("should extract correct toc: short form indices with partial index with title only and all forms of chapter notations", async function () {
    testStaticCase(
      [
        "Ch. 1 -  I am HitchCock",
        "C2:  I am HitchCock1",
        "Word 2.5:  I am HitchCock1",
        "EP3:  I am HitchCock1",
        "EP 4 -  I am HitchCock2",
        "c5 -  I am HitchCock3 Part 1",
        "5 -  I am HitchCock3 Part 2",
        "EP100:  I am HitchCock1",
      ],
      [
        {
          title: "I am HitchCock",
          combiIndex: 1,
        },
        {
          title: "I am HitchCock1",
          combiIndex: 2,
        },
        {
          title: "I am HitchCock1",
          combiIndex: 2.5,
          totalIndex: 2,
          partialIndex: 5,
        },
        {
          title: "I am HitchCock1",
          combiIndex: 3,
        },
        {
          title: "I am HitchCock2",
          combiIndex: 4,
        },
        {
          title: "I am HitchCock3",
          combiIndex: 5.1,
          totalIndex: 5,
          partialIndex: 1,
        },
        {
          title: "I am HitchCock3",
          combiIndex: 5.2,
          totalIndex: 5,
          partialIndex: 2,
        },
        {
          title: "I am HitchCock1",
          combiIndex: 100,
        },
      ],
    );
  });
  it("should extract correct toc: chapter indices with title, with volume only", async function () {
    testStaticCase(
      [
        "Volume 1 - Chapter 1 -  I am HitchCock",
        "Volume 1: Chapter 2:  I am HitchCock1",
        "Volume 2: Chapter 3 -  I am HitchCock2",
        "Volume 2 - Chapter 4 -  I am HitchCock3",
      ],
      [
        {
          combiIndex: 1,
          episodes: [
            {
              title: "I am HitchCock",
              combiIndex: 1,
            },
            {
              title: "I am HitchCock1",
              combiIndex: 2,
            },
          ],
        },
        {
          combiIndex: 2,
          episodes: [
            {
              title: "I am HitchCock2",
              combiIndex: 3,
            },
            {
              title: "I am HitchCock3",
              combiIndex: 4,
            },
          ],
        },
      ],
    );
  });
  it("should extract correct toc: chapter indices with title, with short form volume", async function () {
    testStaticCase(
      [
        "Vol. 1 - Chapter 1 -  I am HitchCock",
        "V1: Chapter 2:  I am HitchCock1",
        "Vol. 2: Chapter 3 -  I am HitchCock2",
        "V 2 - Chapter 4 -  I am HitchCock3",
      ],
      [
        {
          combiIndex: 1,
          episodes: [
            {
              title: "I am HitchCock",
              combiIndex: 1,
            },
            {
              title: "I am HitchCock1",
              combiIndex: 2,
            },
          ],
        },
        {
          combiIndex: 2,
          episodes: [
            {
              title: "I am HitchCock2",
              combiIndex: 3,
            },
            {
              title: "I am HitchCock3",
              combiIndex: 4,
            },
          ],
        },
      ],
    );
  });
  it("should extract correct toc: chapter indices with title, with volume with title", async function () {
    testStaticCase(
      [
        "Vol. 1: I am a title1 - Chapter 1 -  I am HitchCock",
        "V1: I am a title1 Chapter 2:  I am HitchCock1",
        "Vol. 2: : I am a title2 Chapter 3 -  I am HitchCock2",
        "Volume 2: I am a title2 - Chapter 4 -  I am HitchCock3",
      ],
      [
        {
          title: "I am a title1",
          combiIndex: 1,
          episodes: [
            {
              title: "I am HitchCock",
              combiIndex: 1,
            },
            {
              title: "I am HitchCock1",
              combiIndex: 2,
            },
          ],
        },
        {
          title: "I am a title2",
          combiIndex: 2,
          episodes: [
            {
              title: "I am HitchCock2",
              combiIndex: 3,
            },
            {
              title: "I am HitchCock3",
              combiIndex: 4,
            },
          ],
        },
      ],
    );
  });
  it("should extract correct toc: ignore invalid chapters", async function () {
    testStaticCase(
      [
        "Vol. 1: I am a title1 - Chapter 1 -  I am HitchCock",
        "V1: I am a title1 Chapter 2:  I am HitchCock1",
        "V1: I am a title1 Chapter DELETED:  I am HitchCock1",
        "V. SPAM: I am a title1 Chapter 2:  I am HitchCock1",
        "Vol. 2: : I am a title2 Chapter 3 -  I am HitchCock2",
        "Vol. SPAM: : I am a title2 Chapter 3 -  I am HitchCock2",
        "Vol. 2: : I am a title2 Chapter SPAM -  I am HitchCock2",
        "Volume 2: I am a title2 - Chapter 4 -  I am HitchCock3",
        "Vol. DELETED: : I am a title2 Chapter 4 -  I am HitchCock2",
      ],
      [
        {
          title: "I am a title1",
          combiIndex: 1,
          episodes: [
            {
              title: "I am HitchCock",
              combiIndex: 1,
            },
            {
              title: "I am HitchCock1",
              combiIndex: 2,
            },
          ],
        },
        {
          title: "I am a title2",
          combiIndex: 2,
          episodes: [
            {
              title: "I am HitchCock2",
              combiIndex: 3,
            },
            {
              title: "I am HitchCock3",
              combiIndex: 4,
            },
          ],
        },
      ],
    );
  });
  it("should extract correct toc: full short form with title", async function () {
    testStaticCase(
      [
        "V54C3P3 – All That Labor Work",
        "V54C4P1- Plan of Annihilation",
        "V54C4P2- Plan of Annihilation",
        "V54C4P3- Plan of Annihilation",
      ],
      [
        {
          combiIndex: 54,
          episodes: [
            {
              title: "All That Labor Work",
              combiIndex: 3.3,
              totalIndex: 3,
              partialIndex: 3,
            },
            {
              title: "Plan of Annihilation",
              combiIndex: 4.1,
              totalIndex: 4,
              partialIndex: 1,
            },
            {
              title: "Plan of Annihilation",
              combiIndex: 4.2,
              totalIndex: 4,
              partialIndex: 2,
            },
            {
              title: "Plan of Annihilation",
              combiIndex: 4.3,
              totalIndex: 4,
              partialIndex: 3,
            },
          ],
        },
      ],
    );
  });
  it("should extract correct toc: full form mixed with full short form with title", async function () {
    testStaticCase(
      [
        "Chapter 586 - V54C3P3 – All That Labor Work",
        "Chapter 587 - V54C4P1- Plan of Annihilation",
        "Chapter 588 - V54C4P2- Plan of Annihilation",
        "Chapter 589 - V54C4P3- Plan of Annihilation",
      ],
      [
        {
          combiIndex: 54,
          episodes: [
            {
              title: "All That Labor Work",
              combiIndex: 586,
            },
            {
              title: "Plan of Annihilation",
              combiIndex: 587,
            },
            {
              title: "Plan of Annihilation",
              combiIndex: 588,
            },
            {
              title: "Plan of Annihilation",
              combiIndex: 589,
            },
          ],
        },
      ],
    );
  });
  it("should extract correct toc: title prefix with full form mixed with full short form with title", async function () {
    testStaticCase(
      [
        { title: "I am a cool Book", mediumType: 1 },
        "I am a cool Book: Chapter 586 - V54C3P3 – All That Labor Work",
        "I am a cool Book: Chapter 587 - V54C4P1- Plan of Annihilation",
        "I am a cool Book: Chapter 588 - V54C4P2- Plan of Annihilation",
        "I am a cool Book: Chapter 589 - V54C4P3- Plan of Annihilation",
      ],
      [
        {
          combiIndex: 54,
          episodes: [
            {
              title: "All That Labor Work",
              combiIndex: 586,
            },
            {
              title: "Plan of Annihilation",
              combiIndex: 587,
            },
            {
              title: "Plan of Annihilation",
              combiIndex: 588,
            },
            {
              title: "Plan of Annihilation",
              combiIndex: 589,
            },
          ],
        },
      ],
    );
  });
  it("should extract correct toc: title prefix with different volume namings and chapter", async function () {
    testStaticCase(
      [
        { title: "I am a cool Book", mediumType: 1 },
        "I am a cool Book: Volume1 Chapter 586 -  All That Labor Work",
        "I am a cool Book: Book1 Chapter 587 -  Plan of Annihilation",
        "I am a cool Book: Book 2 Chapter 588 - Plan of Annihilation",
        "I am a cool Book: Season 2 Chapter 589 - Plan of Annihilation",
      ],
      [
        {
          combiIndex: 1,
          episodes: [
            {
              title: "All That Labor Work",
              combiIndex: 586,
            },
            {
              title: "Plan of Annihilation",
              combiIndex: 587,
            },
          ],
        },
        {
          combiIndex: 2,
          episodes: [
            {
              title: "Plan of Annihilation",
              combiIndex: 588,
            },
            {
              title: "Plan of Annihilation",
              combiIndex: 589,
            },
          ],
        },
      ],
    );
  });
  it("should extract correct toc: chapter indices with not always used partial index with title only", async function () {
    testStaticCase(
      [
        "Ch. 1 -  I am HitchCock",
        "C2:  I am HitchCock1",
        "2:  I am HitchCock1 2/2",
        "Chapter. 3 -  I am HitchCock2",
        "c4 -  I am HitchCock3",
        "4 -  I am HitchCock3 [2/2]",
      ],
      [
        {
          title: "I am HitchCock",
          combiIndex: 1,
        },
        {
          title: "I am HitchCock1",
          combiIndex: 2.1,
          totalIndex: 2,
          partialIndex: 1,
        },
        {
          title: "I am HitchCock1",
          combiIndex: 2.2,
          totalIndex: 2,
          partialIndex: 2,
        },
        {
          title: "I am HitchCock2",
          combiIndex: 3,
        },
        {
          title: "I am HitchCock3",
          combiIndex: 4.1,
          totalIndex: 4,
          partialIndex: 1,
        },
        {
          title: "I am HitchCock3",
          combiIndex: 4.2,
          totalIndex: 4,
          partialIndex: 2,
        },
      ],
    );
  });
  it("should extract correct toc: chapter indices with non main story chapters at the ends with ongoing ascending story", async function () {
    testStaticCase(
      [
        { title: "I am a cool Book", mediumType: 1, end: false },
        "I am a Intermission1",
        "I am a Intermission2",
        "C1:  I am HitchCock1",
        "2:  I am HitchCock1 2/2",
        "Chapter. 3 -  I am HitchCock2",
        "4 -  I am HitchCock3 [2/2]",
        "I am a Intermission3",
        "I am a Intermission4",
      ],
      [
        {
          title: "I am a Intermission1",
          combiIndex: 0.1,
          totalIndex: 0,
          partialIndex: 1,
        },
        {
          title: "I am a Intermission2",
          combiIndex: 0.2,
          totalIndex: 0,
          partialIndex: 2,
        },
        {
          title: "I am a Intermission3",
          combiIndex: 0.3,
          totalIndex: 0,
          partialIndex: 3,
        },
        {
          title: "I am a Intermission4",
          combiIndex: 0.4,
          totalIndex: 0,
          partialIndex: 4,
        },
        {
          title: "I am HitchCock1",
          combiIndex: 1,
        },
        {
          title: "I am HitchCock1",
          combiIndex: 2.2,
          totalIndex: 2,
          partialIndex: 2,
        },
        {
          title: "I am HitchCock2",
          combiIndex: 3,
        },
        {
          title: "I am HitchCock3",
          combiIndex: 4.2,
          totalIndex: 4,
          partialIndex: 2,
        },
      ],
    );
  });
  it("should extract correct toc: chapter indices with non main story chapters at the ends with finished ascending story", async function () {
    testStaticCase(
      [
        { title: "I am a cool Book", mediumType: 1, end: true },
        "I am a Intermission1",
        "I am a Intermission2",
        "C1:  I am HitchCock1",
        "2:  I am HitchCock1 2/2",
        "Chapter. 3 -  I am HitchCock2",
        "4 -  I am HitchCock3 [2/2]",
        "I am a Intermission3",
        "I am a Intermission4",
      ],
      [
        {
          title: "I am a Intermission1",
          combiIndex: 0.1,
          totalIndex: 0,
          partialIndex: 1,
        },
        {
          title: "I am a Intermission2",
          combiIndex: 0.2,
          totalIndex: 0,
          partialIndex: 2,
        },
        {
          title: "I am HitchCock1",
          combiIndex: 1,
        },
        {
          title: "I am HitchCock1",
          combiIndex: 2.2,
          totalIndex: 2,
          partialIndex: 2,
        },
        {
          title: "I am HitchCock2",
          combiIndex: 3,
        },
        {
          title: "I am HitchCock3",
          combiIndex: 4.2,
          totalIndex: 4,
          partialIndex: 2,
        },
        {
          title: "I am a Intermission3",
          combiIndex: 4.301,
          totalIndex: 4,
          partialIndex: 301,
        },
        {
          title: "I am a Intermission4",
          combiIndex: 4.302,
          totalIndex: 4,
          partialIndex: 302,
        },
      ],
    );
  });
  it("should extract correct toc: chapter indices with non main story chapters at the ends with ongoing descending story", async function () {
    testStaticCase(
      [
        { title: "I am a cool Book", mediumType: 1, end: undefined },
        "I am a Intermission4",
        "I am a Intermission3",
        "4 -  I am HitchCock3 [2/2]",
        "Chapter. 3 -  I am HitchCock2",
        "2:  I am HitchCock1 2/2",
        "C1:  I am HitchCock1",
        "I am a Intermission2",
        "I am a Intermission1",
      ],
      [
        {
          title: "I am HitchCock3",
          combiIndex: 4.2,
          totalIndex: 4,
          partialIndex: 2,
        },
        {
          title: "I am HitchCock2",
          combiIndex: 3,
        },
        {
          title: "I am HitchCock1",
          combiIndex: 2.2,
          totalIndex: 2,
          partialIndex: 2,
        },
        {
          title: "I am HitchCock1",
          combiIndex: 1,
        },
        {
          title: "I am a Intermission4",
          combiIndex: 0.4,
          totalIndex: 0,
          partialIndex: 4,
        },
        {
          title: "I am a Intermission3",
          combiIndex: 0.3,
          totalIndex: 0,
          partialIndex: 3,
        },
        {
          title: "I am a Intermission2",
          combiIndex: 0.2,
          totalIndex: 0,
          partialIndex: 2,
        },
        {
          title: "I am a Intermission1",
          combiIndex: 0.1,
          totalIndex: 0,
          partialIndex: 1,
        },
      ],
    );
  });
  it("should extract correct toc: chapter indices with non main story chapters at the ends with finished descending story", async function () {
    testStaticCase(
      [
        { title: "I am a cool Book", mediumType: 1, end: true },
        "I am a Intermission4",
        "I am a Intermission3",
        "4 -  I am HitchCock3 [2/2]",
        "Chapter. 3 -  I am HitchCock2",
        "2:  I am HitchCock1 2/2",
        "C1:  I am HitchCock1",
        "I am a Intermission2",
        "I am a Intermission1",
      ],
      [
        {
          title: "I am a Intermission4",
          combiIndex: 4.302,
          totalIndex: 4,
          partialIndex: 302,
        },
        {
          title: "I am a Intermission3",
          combiIndex: 4.301,
          totalIndex: 4,
          partialIndex: 301,
        },
        {
          title: "I am HitchCock3",
          combiIndex: 4.2,
          totalIndex: 4,
          partialIndex: 2,
        },
        {
          title: "I am HitchCock2",
          combiIndex: 3,
        },
        {
          title: "I am HitchCock1",
          combiIndex: 2.2,
          totalIndex: 2,
          partialIndex: 2,
        },
        {
          title: "I am HitchCock1",
          combiIndex: 1,
        },
        {
          title: "I am a Intermission2",
          combiIndex: 0.2,
          totalIndex: 0,
          partialIndex: 2,
        },
        {
          title: "I am a Intermission1",
          combiIndex: 0.1,
          totalIndex: 0,
          partialIndex: 1,
        },
      ],
    );
  });
  it("should extract correct toc: chapter indices with non main story chapters in the middle with ascending story", async function () {
    testStaticCase(
      [
        "C1:  I am HitchCock1",
        "2:  I am HitchCock1 2/2",
        "I am a Intermission1",
        "I am a Intermission2",
        "Chapter. 3 -  I am HitchCock2",
        "I am a Intermission3",
        "I am a Intermission4",
        "4 -  I am HitchCock3 [2/2]",
      ],
      [
        {
          title: "I am HitchCock1",
          combiIndex: 1,
        },
        {
          title: "I am HitchCock1",
          combiIndex: 2.2,
          totalIndex: 2,
          partialIndex: 2,
        },
        {
          title: "I am a Intermission1",
          combiIndex: 2.301,
          totalIndex: 2,
          partialIndex: 301,
        },
        {
          title: "I am a Intermission2",
          combiIndex: 2.302,
          totalIndex: 2,
          partialIndex: 302,
        },
        {
          title: "I am HitchCock2",
          combiIndex: 3,
        },
        {
          title: "I am a Intermission3",
          combiIndex: 3.101,
          totalIndex: 3,
          partialIndex: 101,
        },
        {
          title: "I am a Intermission4",
          combiIndex: 3.102,
          totalIndex: 3,
          partialIndex: 102,
        },
        {
          title: "I am HitchCock3",
          combiIndex: 4.2,
          totalIndex: 4,
          partialIndex: 2,
        },
      ],
    );
  });
  it("should extract correct toc: chapter indices with non main story chapters in the middle with descending story", async function () {
    testStaticCase(
      [
        "4 -  I am HitchCock3 [2/2]",
        "I am a Intermission4",
        "I am a Intermission3",
        "Chapter. 3 -  I am HitchCock2",
        "I am a Intermission2",
        "I am a Intermission1",
        "2:  I am HitchCock1 2/2",
        "C1:  I am HitchCock1",
      ],
      [
        {
          title: "I am HitchCock3",
          combiIndex: 4.2,
          totalIndex: 4,
          partialIndex: 2,
        },
        {
          title: "I am a Intermission4",
          combiIndex: 3.102,
          totalIndex: 3,
          partialIndex: 102,
        },
        {
          title: "I am a Intermission3",
          combiIndex: 3.101,
          totalIndex: 3,
          partialIndex: 101,
        },
        {
          title: "I am HitchCock2",
          combiIndex: 3,
        },
        {
          title: "I am a Intermission2",
          combiIndex: 2.302,
          totalIndex: 2,
          partialIndex: 302,
        },
        {
          title: "I am a Intermission1",
          combiIndex: 2.301,
          totalIndex: 2,
          partialIndex: 301,
        },
        {
          title: "I am HitchCock1",
          combiIndex: 2.2,
          totalIndex: 2,
          partialIndex: 2,
        },
        {
          title: "I am HitchCock1",
          combiIndex: 1,
        },
      ],
    );
  });
  it("should extract correct toc: chapter indices with volume items between with descending story", async function () {
    testStaticCase(
      [
        "4 -  I am HitchCock3 [2/2]",
        "I am a Intermission4",
        "I am a Intermission3",
        "Chapter. 3 -  I am HitchCock2",
        "Volume 2",
        "I am a Intermission2",
        "I am a Intermission1",
        "2:  I am HitchCock1 2/2",
        "C1:  I am HitchCock1",
        "Volume 1",
      ],
      [
        {
          combiIndex: 2,
          episodes: [
            {
              title: "I am HitchCock3",
              combiIndex: 4.2,
              totalIndex: 4,
              partialIndex: 2,
            },
            {
              title: "I am a Intermission4",
              combiIndex: 3.102,
              totalIndex: 3,
              partialIndex: 102,
            },
            {
              title: "I am a Intermission3",
              combiIndex: 3.101,
              totalIndex: 3,
              partialIndex: 101,
            },
            {
              title: "I am HitchCock2",
              combiIndex: 3,
            },
          ],
        },
        {
          combiIndex: 1,
          episodes: [
            {
              title: "I am a Intermission2",
              combiIndex: 2.302,
              totalIndex: 2,
              partialIndex: 302,
            },
            {
              title: "I am a Intermission1",
              combiIndex: 2.301,
              totalIndex: 2,
              partialIndex: 301,
            },
            {
              title: "I am HitchCock1",
              combiIndex: 2.2,
              totalIndex: 2,
              partialIndex: 2,
            },
            {
              title: "I am HitchCock1",
              combiIndex: 1,
            },
          ],
        },
      ],
    );
  });
  it("should extract correct toc: chapter indices with volume items between with ascending story", async function () {
    testStaticCase(
      [
        "Volume 1",
        "C1:  I am HitchCock1",
        "2:  I am HitchCock1 2/2",
        "I am a Intermission1",
        "I am a Intermission2",
        "Volume 2",
        "Chapter. 3 -  I am HitchCock2",
        "I am a Intermission3",
        "I am a Intermission4",
        "4 -  I am HitchCock3 [2/2]",
      ],
      [
        {
          combiIndex: 1,
          episodes: [
            {
              title: "I am HitchCock1",
              combiIndex: 1,
            },
            {
              title: "I am HitchCock1",
              combiIndex: 2.2,
              totalIndex: 2,
              partialIndex: 2,
            },
            {
              title: "I am a Intermission1",
              combiIndex: 2.301,
              totalIndex: 2,
              partialIndex: 301,
            },
            {
              title: "I am a Intermission2",
              combiIndex: 2.302,
              totalIndex: 2,
              partialIndex: 302,
            },
          ],
        },
        {
          combiIndex: 2,
          episodes: [
            {
              title: "I am HitchCock2",
              combiIndex: 3,
            },
            {
              title: "I am a Intermission3",
              combiIndex: 3.101,
              totalIndex: 3,
              partialIndex: 101,
            },
            {
              title: "I am a Intermission4",
              combiIndex: 3.102,
              totalIndex: 3,
              partialIndex: 102,
            },
            {
              title: "I am HitchCock3",
              combiIndex: 4.2,
              totalIndex: 4,
              partialIndex: 2,
            },
          ],
        },
      ],
    );
  });
  it("should extract correct toc: non main episode with volume definition between with descending story", async function () {
    testStaticCase(
      [
        "Volume 2 I have a Title2 C4 -  I am HitchCock3 [2/2]",
        "Volume 2 I have a Title2: Chapter. 3 -  I am HitchCock2",
        "Volume 2 I have a Title2 - I am a Intermission4",
        "Volume 2 I have a Title2 I am a Intermission3",
        "Volume 1: I have a Title1 - C2:  I am HitchCock1 2/2",
        "Volume 1:  I have a Title1 C1:  I am HitchCock1",
        "Volume 1 I have a Title1 - I am a Intermission2",
        "Volume 1 I have a Title1 I am a Intermission1",
      ],
      [
        {
          title: "I have a Title2",
          combiIndex: 2,
          episodes: [
            {
              title: "I am HitchCock3",
              combiIndex: 4.2,
              totalIndex: 4,
              partialIndex: 2,
            },
            {
              title: "I am HitchCock2",
              combiIndex: 3,
            },
            {
              title: "I am a Intermission4",
              combiIndex: 2.302,
              totalIndex: 2,
              partialIndex: 302,
            },
            {
              title: "I am a Intermission3",
              combiIndex: 2.301,
              totalIndex: 2,
              partialIndex: 301,
            },
          ],
        },
        {
          title: "I have a Title1",
          combiIndex: 1,
          episodes: [
            {
              title: "I am HitchCock1",
              combiIndex: 2.2,
              totalIndex: 2,
              partialIndex: 2,
            },
            {
              title: "I am HitchCock1",
              combiIndex: 1,
            },
            {
              title: "I am a Intermission2",
              combiIndex: 0.2,
              totalIndex: 0,
              partialIndex: 2,
            },
            {
              title: "I am a Intermission1",
              combiIndex: 0.1,
              totalIndex: 0,
              partialIndex: 1,
            },
          ],
        },
      ],
    );
  });
  it("should extract correct toc: non main episode with volume definition between with ascending story", async function () {
    testStaticCase(
      [
        "Volume 1 I have a Title1 I am a Intermission1",
        "Volume 1 I have a Title1 - I am a Intermission2",
        "Volume 1:  I have a Title1 C1:  I am HitchCock1",
        "Volume 1: I have a Title1 - C2:  I am HitchCock1 2/2",
        "Volume 2 I have a Title2 I am a Intermission3",
        "Volume 2 I have a Title2 - I am a Intermission4",
        "Volume 2 I have a Title2: Chapter. 3 -  I am HitchCock2",
        "Volume 2 I have a Title2 C4 -  I am HitchCock3 [2/2]",
      ],
      [
        {
          title: "I have a Title1",
          combiIndex: 1,
          episodes: [
            {
              title: "I am a Intermission1",
              combiIndex: 0.1,
              totalIndex: 0,
              partialIndex: 1,
            },
            {
              title: "I am a Intermission2",
              combiIndex: 0.2,
              totalIndex: 0,
              partialIndex: 2,
            },
            {
              title: "I am HitchCock1",
              combiIndex: 1,
            },
            {
              title: "I am HitchCock1",
              combiIndex: 2.2,
              totalIndex: 2,
              partialIndex: 2,
            },
          ],
        },
        {
          title: "I have a Title2",
          combiIndex: 2,
          episodes: [
            {
              title: "I am a Intermission3",
              combiIndex: 2.301,
              totalIndex: 2,
              partialIndex: 301,
            },
            {
              title: "I am a Intermission4",
              combiIndex: 2.302,
              totalIndex: 2,
              partialIndex: 302,
            },
            {
              title: "I am HitchCock2",
              combiIndex: 3,
            },
            {
              title: "I am HitchCock3",
              combiIndex: 4.2,
              totalIndex: 4,
              partialIndex: 2,
            },
          ],
        },
      ],
    );
  });
  it("should extract correct toc: episodes without volume sandwiched between ones with volume between with descending story", async function () {
    testStaticCase(
      [
        "Volume 2 I have a Title2 C4 -  I am HitchCock3 [2/2]",
        "Chapter. 3 -  I am HitchCock2",
        "I am a Intermission4",
        "Volume 2 I have a Title2 I am a Intermission3",
        "Volume 1: I have a Title1 - C2:  I am HitchCock1 2/2",
        "C1:  I am HitchCock1",
        "I am a Intermission2",
        "Volume 1 I have a Title1 I am a Intermission1",
      ],
      [
        {
          title: "I have a Title2",
          combiIndex: 2,
          episodes: [
            {
              title: "I am HitchCock3",
              combiIndex: 4.2,
              totalIndex: 4,
              partialIndex: 2,
            },
            {
              title: "I am HitchCock2",
              combiIndex: 3,
            },
            {
              title: "I am a Intermission4",
              combiIndex: 2.302,
              totalIndex: 2,
              partialIndex: 302,
            },
            {
              title: "I am a Intermission3",
              combiIndex: 2.301,
              totalIndex: 2,
              partialIndex: 301,
            },
          ],
        },
        {
          title: "I have a Title1",
          combiIndex: 1,
          episodes: [
            {
              title: "I am HitchCock1",
              combiIndex: 2.2,
              totalIndex: 2,
              partialIndex: 2,
            },
            {
              title: "I am HitchCock1",
              combiIndex: 1,
            },
            {
              title: "I am a Intermission2",
              combiIndex: 0.2,
              totalIndex: 0,
              partialIndex: 2,
            },
            {
              title: "I am a Intermission1",
              combiIndex: 0.1,
              totalIndex: 0,
              partialIndex: 1,
            },
          ],
        },
      ],
    );
  });
  it("should extract correct toc: episodes without volume sandwiched between ones with volume with ascending story", async function () {
    testStaticCase(
      [
        "Volume 1 I have a Title1 I am a Intermission1",
        "I am a Intermission2",
        "C1:  I am HitchCock1",
        "Volume 1: I have a Title1 - C2:  I am HitchCock1 2/2",
        "Volume 2 I have a Title2 I am a Intermission3",
        "I am a Intermission4",
        "Chapter. 3 -  I am HitchCock2",
        "Volume 2 I have a Title2 C4 -  I am HitchCock3 [2/2]",
      ],
      [
        {
          title: "I have a Title1",
          combiIndex: 1,
          episodes: [
            {
              title: "I am a Intermission1",
              combiIndex: 0.1,
              totalIndex: 0,
              partialIndex: 1,
            },
            {
              title: "I am a Intermission2",
              combiIndex: 0.2,
              totalIndex: 0,
              partialIndex: 2,
            },
            {
              title: "I am HitchCock1",
              combiIndex: 1,
            },
            {
              title: "I am HitchCock1",
              combiIndex: 2.2,
              totalIndex: 2,
              partialIndex: 2,
            },
          ],
        },
        {
          title: "I have a Title2",
          combiIndex: 2,
          episodes: [
            {
              title: "I am a Intermission3",
              combiIndex: 2.301,
              totalIndex: 2,
              partialIndex: 301,
            },
            {
              title: "I am a Intermission4",
              combiIndex: 2.302,
              totalIndex: 2,
              partialIndex: 302,
            },
            {
              title: "I am HitchCock2",
              combiIndex: 3,
            },
            {
              title: "I am HitchCock3",
              combiIndex: 4.2,
              totalIndex: 4,
              partialIndex: 2,
            },
          ],
        },
      ],
    );
  });
  it("should extract correct toc: for an example toc with half hearted chapter-volume-chapter format", async function () {
    const generator = boxNovelGenerator("boxnovel-281.html");

    const contents = await directTools.scrapeToc(generator);
    contents.should.be.an("array");
    contents.should.have.length(8);

    let currentEpisodeIndex = 175;
    let currentVolumeIndex = 8;

    for (const content of contents) {
      content.should.have.property("title", "");
      content.should.have.property("combiIndex", currentVolumeIndex);
      content.should.have.property("totalIndex", currentVolumeIndex);
      content.should.have.property("partialIndex", undefined);
      content.should.have.property("episodes");
      // @ts-expect-error
      content.episodes.should.be.an("array");

      // @ts-expect-error
      for (const episode of content.episodes) {
        episode.should.have.property("title", "");
        episode.should.have.property("combiIndex", currentEpisodeIndex);
        episode.should.have.property("totalIndex", currentEpisodeIndex);
        episode.should.have.property("partialIndex", undefined);
        episode.should.have.property("url");
        episode.should.have.property("locked", false);
        episode.should.have.property("releaseDate");
        currentEpisodeIndex--;
      }
      currentVolumeIndex--;
    }
  });
  it("should extract correct toc: detect episodes ranges", async function () {
    testStaticCase(
      [
        "Volume 1 I have a Title1 I am a Intermission1",
        "I am a Intermission2",
        "C1:  I am HitchCock1",
        "Volume 1: I have a Title1 - C2:  I am HitchCock1 2/2",
        "Volume 2 I have a Title2 I am a Intermission3",
        "I am a Intermission4",
        "Chapter. 3 -  I am HitchCock2",
        "Volume 2 I have a Title2 C4-7 -  I am HitchCock3",
      ],
      [
        {
          title: "I have a Title1",
          combiIndex: 1,
          episodes: [
            {
              title: "I am a Intermission1",
              combiIndex: 0.1,
              totalIndex: 0,
              partialIndex: 1,
            },
            {
              title: "I am a Intermission2",
              combiIndex: 0.2,
              totalIndex: 0,
              partialIndex: 2,
            },
            {
              title: "I am HitchCock1",
              combiIndex: 1,
            },
            {
              title: "I am HitchCock1",
              combiIndex: 2.2,
              totalIndex: 2,
              partialIndex: 2,
            },
          ],
        },
        {
          title: "I have a Title2",
          combiIndex: 2,
          episodes: [
            {
              title: "I am a Intermission3",
              combiIndex: 2.301,
              totalIndex: 2,
              partialIndex: 301,
            },
            {
              title: "I am a Intermission4",
              combiIndex: 2.302,
              totalIndex: 2,
              partialIndex: 302,
            },
            {
              title: "I am HitchCock2",
              combiIndex: 3,
            },
            {
              title: "I am HitchCock3",
              combiIndex: 4,
            },
            {
              title: "I am HitchCock3",
              combiIndex: 5,
            },
            {
              title: "I am HitchCock3",
              combiIndex: 6,
            },
            {
              title: "I am HitchCock3",
              combiIndex: 7,
            },
          ],
        },
      ],
    );
  });
  it("should extract correct toc: for an example toc with descending index and sometimes partialindex", async function () {
    const generator = boxNovelGenerator("boxnovel-173-html");

    const contents = await directTools.scrapeToc(generator);
    contents.should.be.an("array");

    let currentEpisodeIndex = 210;
    let episodesCount = 0;

    for (const content of contents) {
      content.should.have.property("title");

      // @ts-expect-error
      if (content.episodes) {
        // @ts-expect-error
        content.episodes.should.be.an("array");

        // @ts-expect-error
        for (const episode of content.episodes) {
          episode.should.have.property("title");
          episode.combiIndex.should.be.at.most(currentEpisodeIndex);
          episode.should.have.property("url");
          episode.should.have.property("locked", false);
          episode.should.have.property("releaseDate");
          currentEpisodeIndex = episode.combiIndex;
          episodesCount++;
        }
      } else {
        episodesCount++;
        content.combiIndex.should.be.at.most(currentEpisodeIndex);
        content.should.have.property("url");
        content.should.have.property("locked", false);
        content.should.have.property("releaseDate");
        currentEpisodeIndex = content.combiIndex;
      }
    }
    episodesCount.should.equal(342);
  });
  it("should extract correct toc: for an example toc with chaotic, but ordered format, sometimes volume, sometimes not with sometimes partialIndex and sometimes no index", async function () {
    const pages = Array.from(new Array(7), (_val, index) => `tests/resources/novelfull-122-${index + 1}.html`);
    const generator = novelfullGenerator(pages);

    const contents = await directTools.scrapeToc(generator);
    contents.should.be.an("array");

    let currentEpisodeIndex = 1;
    let episodesCount = 0;

    for (const content of contents) {
      content.should.have.property("title");

      // @ts-expect-error
      if (content.episodes) {
        // @ts-expect-error
        content.episodes.should.be.an("array");

        // @ts-expect-error
        for (const episode of content.episodes) {
          episode.should.have.property("title");
          if (episode.combiIndex !== 200 && episode.totalIndex !== 219) {
            episode.combiIndex.should.be.at.least(currentEpisodeIndex);
          }
          episode.should.have.property("url");
          episode.should.have.property("locked", false);
          episode.should.have.property("releaseDate");
          currentEpisodeIndex = episode.combiIndex;
          episodesCount++;
        }
      } else {
        episodesCount++;
        content.combiIndex.should.be.at.least(currentEpisodeIndex);
        content.should.have.property("url");
        content.should.have.property("locked", false);
        content.should.have.property("releaseDate");
        currentEpisodeIndex = content.combiIndex;
      }
    }
    episodesCount.should.equal(325);
  });
  it("should extract correct toc: for an example toc with 'Volume Volume-Chapter' Format", async function () {
    const pages = Array.from(new Array(13), (_val, index) => `tests/resources/novel-test-toc-1-${index + 1}.html`);
    const generator = novelfullGenerator(pages);

    const contents = await directTools.scrapeToc(generator);
    contents.should.be.an("array");

    let currentEpisodeIndex = 1;
    let episodesCount = 0;

    for (const content of contents) {
      content.should.have.property("title");

      // @ts-expect-error
      if (content.episodes) {
        // @ts-expect-error
        content.episodes.should.be.an("array");

        // @ts-expect-error
        for (const episode of content.episodes) {
          episode.should.have.property("title");
          episode.should.not.match(/^[\s:–,.-]+|[\s:–,.-]+$/);
          episode.combiIndex.should.be.at.least(currentEpisodeIndex);
          episode.should.have.property("url");
          episode.should.have.property("locked", false);
          episode.should.have.property("releaseDate");
          currentEpisodeIndex = episode.combiIndex;
          episodesCount++;
        }
      } else {
        episodesCount++;
        content.combiIndex.should.be.at.least(currentEpisodeIndex);
        content.should.not.match(/^[\s:–,.-]+|[\s:–,.-]+$/);
        content.should.have.property("url");
        content.should.have.property("locked", false);
        content.should.have.property("releaseDate");
        currentEpisodeIndex = content.combiIndex;
      }
    }
    episodesCount.should.equal(637);
  });
  it("should extract correct toc: for an example toc with mostly 'chapter Volume-Chapter-Part' Format", async function () {
    const pages = Array.from(new Array(13), (_val, index) => `tests/resources/novelfull-155-${index + 1}.html`);
    const generator = novelfullGenerator(pages);

    const contents = await directTools.scrapeToc(generator);
    contents.should.be.an("array");

    let currentEpisodeIndex = 1;
    let episodesCount = 0;

    for (const content of contents) {
      content.should.have.property("title");

      // @ts-expect-error
      if (content.episodes) {
        // @ts-expect-error
        content.episodes.should.be.an("array");

        // @ts-expect-error
        for (const episode of content.episodes) {
          episode.should.have.property("title");
          episode.should.not.match(/^[\s:–,.-]+|[\s:–,.-]+$/);
          episode.combiIndex.should.be.at.least(currentEpisodeIndex);
          episode.should.have.property("url");
          episode.should.have.property("locked", false);
          episode.should.have.property("releaseDate");
          currentEpisodeIndex = episode.combiIndex;
          episodesCount++;
        }
      } else {
        episodesCount++;
        content.combiIndex.should.be.at.least(currentEpisodeIndex);
        content.should.not.match(/^[\s:–,.-]+|[\s:–,.-]+$/);
        content.should.have.property("url");
        content.should.have.property("locked", false);
        content.should.have.property("releaseDate");
        currentEpisodeIndex = content.combiIndex;
      }
    }
    episodesCount.should.equal(626);
  });
  it("should extract correct toc: for an example toc", async function () {
    const pages = Array.from(new Array(25), (_val, index) => `tests/resources/novelfull-178-${index + 1}.html`);
    const generator = novelfullGenerator(pages);

    const contents = await directTools.scrapeToc(generator);
    contents.should.be.an("array");

    let currentEpisodeIndex = 1;
    let episodesCount = 0;

    for (const content of contents) {
      content.should.have.property("title");

      // @ts-expect-error
      if (content.episodes) {
        // @ts-expect-error
        content.episodes.should.be.an("array");

        // @ts-expect-error
        for (const episode of content.episodes) {
          episode.should.have.property("title");
          episode.should.not.match(/^[\s:–,.-]+|[\s:–,.-]+$/);
          episode.combiIndex.should.be.at.least(currentEpisodeIndex);
          episode.should.have.property("url");
          episode.should.have.property("locked", false);
          episode.should.have.property("releaseDate");
          currentEpisodeIndex = episode.combiIndex;
          episodesCount++;
        }
      } else {
        episodesCount++;
        content.combiIndex.should.be.at.least(currentEpisodeIndex);
        content.should.not.match(/^[\s:–,.-]+|[\s:–,.-]+$/);
        content.should.have.property("url");
        content.should.have.property("locked", false);
        content.should.have.property("releaseDate");
        currentEpisodeIndex = content.combiIndex;
      }
    }
    currentEpisodeIndex.should.equal(1222);
    episodesCount.should.equal(1222);
  });
  it("should extract correct toc: for an example toc where it runs at risk to create many nonsense chapters because one chapter title starts with a big number", async function () {
    const pages = Array.from(new Array(12), (_val, index) => `tests/resources/novelfull-182-${index + 1}.html`);
    const generator = novelfullGenerator(pages);

    const contents = await directTools.scrapeToc(generator);
    contents.should.be.an("array");

    let currentEpisodeIndex = 0;
    let episodesCount = 0;

    for (const content of contents) {
      content.should.have.property("title");

      // @ts-expect-error
      if (content.episodes) {
        // @ts-expect-error
        content.episodes.should.be.an("array");

        // @ts-expect-error
        for (const episode of content.episodes) {
          episode.should.have.property("title");
          episode.should.not.match(/^[\s:–,.-]+|[\s:–,.-]+$/);
          episode.combiIndex.should.be.at.least(currentEpisodeIndex);
          episode.should.have.property("url");
          episode.should.have.property("locked", false);
          episode.should.have.property("releaseDate");
          currentEpisodeIndex = episode.combiIndex;
          episodesCount++;
        }
      } else {
        episodesCount++;
        content.combiIndex.should.be.at.least(currentEpisodeIndex);
        content.should.not.match(/^[\s:–,.-]+|[\s:–,.-]+$/);
        content.should.have.property("url");
        content.should.have.property("locked", false);
        content.should.have.property("releaseDate");
        currentEpisodeIndex = content.combiIndex;
      }
    }
    currentEpisodeIndex.should.equal(551);
    episodesCount.should.equal(551);
  });
  it("should extract correct toc: for the monk toc on novelfull", async function () {
    await testCase("novelfull-monk.json");
  });
  it("should extract correct toc: for the renegade toc on novelfull", async function () {
    await testCase("novelfull-renegade.json");
  });
});
