"use strict";
const sinon = require("sinon");
const sinon_chai = require("sinon-chai");
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const directTools = require("../../../server/dist/externals/direct/directTools");
const tools = require("../../../server/dist/tools");
const fs = require("fs");
const cheerio = require("cheerio");

after(() => {
    tools.internetTester.stop();
});

chai.use(sinon_chai);
chai.use(chaiAsPromised);
chai.should();

/**
 * @typedef {AsyncGenerator<{mediumType: MediaType.TEXT, end: boolean, title: string}|{releaseDate, title: string, url: string}, void, *>} TocGenerator
 */

/**
 *
 * @param {string[]} pages
 * @return TocGenerator
 */
async function* novelfullGenerator(pages) {
    const now = new Date();
    let tocYielded = false;
    for (const page of pages) {
        const content = await fs.promises.readFile(page, "utf8");
        const $ = cheerio.load(content);
        const mediumTitleElement = $(".desc .title").first();
        const mediumTitle = tools.sanitizeString(mediumTitleElement.text());

        const items = $(".list-chapter li a");

        const releaseStatusString = $(".info-holder .info div:nth-child(4) a").text().trim().toLowerCase();

        let end;
        if (releaseStatusString === "ongoing") {
            end = false;
        } else if (releaseStatusString === "completed") {
            end = true;
        }
        if (!tocYielded) {
            const tocMeta = {
                title: mediumTitle,
                mediumType: tools.MediaType.TEXT,
                end,
            };
            yield tocMeta;
            tocYielded = true;
        }

        for (let i = 0; i < items.length; i++) {
            const newsRow = items.eq(i);
            const link = newsRow.attr("href");
            const episodeTitle = tools.sanitizeString(newsRow.text());
            yield {title: episodeTitle, url: link, releaseDate: now};
        }
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
function createReleases(now, ...params) {
    return params.map(value => {
        return {
            title: "",
            totalIndex: value.combiIndex,
            partialIndex: undefined,
            locked: false,
            url: "",
            releaseDate: now,
            ...value
        };
    });
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
function createParts(now, ...params) {
    return params.map(value => {
        return {
            title: "",
            totalIndex: value.combiIndex,
            partialIndex: undefined,
            ...value,
            episodes: createReleases(now, ...value.episodes)
        };
    });
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
async function readCase(path) {
    const fileContent = await fs.promises.readFile("tests/externals/direct/cases/" + path, "utf8");
    return JSON.parse(fileContent);
}

/**
 *
 * @param {string} casePath
 * @return {Promise<void>}
 */
async function testCase(casePath) {
    const caseData = await readCase(casePath);

    /**
     * @type {TocGenerator}
     */
    let generator;
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

        if (content.episodes) {
            content.episodes.should.be.an("array");

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
        const now = new Date();
        const generator = (async function* testGenerator() {
            yield {url: "", title: "Chapter 1", releaseDate: now};
            yield {url: "", title: "Chapter 2", releaseDate: now};
            yield {url: "", title: "Chapter 3", releaseDate: now};
            yield {url: "", title: "Chapter 4", releaseDate: now};
        })();

        const contents = await directTools.scrapeToc(generator);
        contents.should.deep.equal(createReleases(
            now, 
            {combiIndex: 1},
            {combiIndex: 2},
            {combiIndex: 3},
            {totalIndex: 4}
        ));
    });
    it("should extract correct toc: chapter indices with title only", async function () {
        const now = new Date();
        const generator = (async function* testGenerator() {
            yield {url: "", title: "Chapter 1 -  I am HitchCock", releaseDate: now};
            yield {url: "", title: "Chapter 2:  I am HitchCock1", releaseDate: now};
            yield {url: "", title: "Chapter 3 -  I am HitchCock2", releaseDate: now};
            yield {url: "", title: "Chapter 4 -  I am HitchCock3", releaseDate: now};
        })();

        const contents = await directTools.scrapeToc(generator);
        contents.should.deep.equal(createReleases(
            now,
            {
                title: "I am HitchCock",
                combiIndex: 1
            },
            {
                title: "I am HitchCock1",
                combiIndex: 2
            },
            {
                title: "I am HitchCock2",
                combiIndex: 3
            },
            {
                title: "I am HitchCock3",
                combiIndex: 4
            }
        ));
    });
    it("should extract correct toc: chapter indices with partial index with title only", async function () {
        const now = new Date();
        const generator = (async function* testGenerator() {
            yield {url: "", title: "Chapter 1 -  I am HitchCock", releaseDate: now};
            yield {url: "", title: "Chapter 2:  I am HitchCock1", releaseDate: now};
            yield {url: "", title: "Chapter 2.5:  I am HitchCock1", releaseDate: now};
            yield {url: "", title: "Chapter 3 -  I am HitchCock2", releaseDate: now};
            yield {url: "", title: "Chapter 4 -  I am HitchCock3 Part 1", releaseDate: now};
            yield {url: "", title: "Chapter 4 -  I am HitchCock3 Part 2", releaseDate: now};
        })();

        const contents = await directTools.scrapeToc(generator);
        contents.should.deep.equal(createReleases(
            now,
            {
                title: "I am HitchCock",
                combiIndex: 1
            },
            {
                title: "I am HitchCock1",
                combiIndex: 2
            },
            {
                title: "I am HitchCock1",
                combiIndex: 2.5,
                totalIndex: 2,
                partialIndex: 5
            },
            {
                title: "I am HitchCock2",
                combiIndex: 3
            },
            {
                title: "I am HitchCock3",
                combiIndex: 4.1,
                totalIndex: 4,
                partialIndex: 1
            },
            {
                title: "I am HitchCock3",
                combiIndex: 4.2,
                totalIndex: 4,
                partialIndex: 2
            }
        ));
    });
    it("should extract correct toc: short form chapter indices with partial index with title only", async function () {
        const now = new Date();
        const generator = (async function* testGenerator() {
            yield {url: "", title: "Ch. 1 -  I am HitchCock", releaseDate: now};
            yield {url: "", title: "C2:  I am HitchCock1", releaseDate: now};
            yield {url: "", title: "2.5:  I am HitchCock1", releaseDate: now};
            yield {url: "", title: "Chapter. 3 -  I am HitchCock2", releaseDate: now};
            yield {url: "", title: "c4 -  I am HitchCock3 [1/2]", releaseDate: now};
            yield {url: "", title: "4 -  I am HitchCock3 Part 2", releaseDate: now};
        })();

        const contents = await directTools.scrapeToc(generator);
        contents.should.deep.equal(createReleases(
            now,
            {
                title: "I am HitchCock",
                combiIndex: 1
            },
            {
                title: "I am HitchCock1",
                combiIndex: 2
            },
            {
                title: "I am HitchCock1",
                combiIndex: 2.5,
                totalIndex: 2,
                partialIndex: 5
            },
            {
                title: "I am HitchCock2",
                combiIndex: 3
            },
            {
                title: "I am HitchCock3",
                combiIndex: 4.1,
                totalIndex: 4,
                partialIndex: 1
            },
            {
                title: "I am HitchCock3",
                combiIndex: 4.2,
                totalIndex: 4,
                partialIndex: 2
            }
        ));
    });
    it("should extract correct toc: short form indices with partial index with title only and all forms of chapter notations", async function () {
        const now = new Date();
        const generator = (async function* testGenerator() {
            yield {url: "", title: "Ch. 1 -  I am HitchCock", releaseDate: now};
            yield {url: "", title: "C2:  I am HitchCock1", releaseDate: now};
            yield {url: "", title: "Word 2.5:  I am HitchCock1", releaseDate: now};
            yield {url: "", title: "EP3:  I am HitchCock1", releaseDate: now};
            yield {url: "", title: "EP 4 -  I am HitchCock2", releaseDate: now};
            yield {url: "", title: "c5 -  I am HitchCock3 Part 1", releaseDate: now};
            yield {url: "", title: "5 -  I am HitchCock3 Part 2", releaseDate: now};
            yield {url: "", title: "EP100:  I am HitchCock1", releaseDate: now};
        })();

        const contents = await directTools.scrapeToc(generator);
        contents.should.deep.equal(createReleases(
            now,
            {
                title: "I am HitchCock",
                combiIndex: 1
            },
            {
                title: "I am HitchCock1",
                combiIndex: 2
            },
            {
                title: "I am HitchCock1",
                combiIndex: 2.5,
                totalIndex: 2,
                partialIndex: 5
            },
            {
                title: "I am HitchCock1",
                combiIndex: 3
            },
            {
                title: "I am HitchCock2",
                combiIndex: 4
            },
            {
                title: "I am HitchCock3",
                combiIndex: 5.1,
                totalIndex: 5,
                partialIndex: 1
            },
            {
                title: "I am HitchCock3",
                combiIndex: 5.2,
                totalIndex: 5,
                partialIndex: 2
            },
            {
                title: "I am HitchCock1",
                combiIndex: 100
            }
        ));
    });
    it("should extract correct toc: chapter indices with title, with volume only", async function () {
        const now = new Date();
        const generator = (async function* testGenerator() {
            yield {url: "", title: "Volume 1 - Chapter 1 -  I am HitchCock", releaseDate: now};
            yield {url: "", title: "Volume 1: Chapter 2:  I am HitchCock1", releaseDate: now};
            yield {url: "", title: "Volume 2: Chapter 3 -  I am HitchCock2", releaseDate: now};
            yield {url: "", title: "Volume 2 - Chapter 4 -  I am HitchCock3", releaseDate: now};
        })();

        const contents = await directTools.scrapeToc(generator);
        contents.should.deep.equal(createParts(
            now,
            {
                combiIndex: 1,
                episodes: [
                    {
                        title: "I am HitchCock",
                        combiIndex: 1
                    },
                    {
                        title: "I am HitchCock1",
                        combiIndex: 2
                    }
                ]
            },
            {
                combiIndex: 2,
                episodes: [
                    {
                        title: "I am HitchCock2",
                        combiIndex: 3
                    },
                    {
                        title: "I am HitchCock3",
                        combiIndex: 4
                    }
                ]
            },
        ));
    });
    it("should extract correct toc: chapter indices with title, with short form volume", async function () {
        const now = new Date();
        const generator = (async function* testGenerator() {
            yield {url: "", title: "Vol. 1 - Chapter 1 -  I am HitchCock", releaseDate: now};
            yield {url: "", title: "V1: Chapter 2:  I am HitchCock1", releaseDate: now};
            yield {url: "", title: "Vol. 2: Chapter 3 -  I am HitchCock2", releaseDate: now};
            yield {url: "", title: "V 2 - Chapter 4 -  I am HitchCock3", releaseDate: now};
        })();

        const contents = await directTools.scrapeToc(generator);
        contents.should.deep.equal(createParts(
            now,
            {
                combiIndex: 1,
                episodes: [
                    {
                        title: "I am HitchCock",
                        combiIndex: 1
                    },
                    {
                        title: "I am HitchCock1",
                        combiIndex: 2
                    }
                ]
            },
            {
                combiIndex: 2,
                episodes: [
                    {
                        title: "I am HitchCock2",
                        combiIndex: 3
                    },
                    {
                        title: "I am HitchCock3",
                        combiIndex: 4
                    }
                ]
            },
        ));
    });
    it("should extract correct toc: chapter indices with title, with volume with title", async function () {
        const now = new Date();
        const generator = (async function* testGenerator() {
            yield {url: "", title: "Vol. 1: I am a title1 - Chapter 1 -  I am HitchCock", releaseDate: now};
            yield {url: "", title: "V1: I am a title1 Chapter 2:  I am HitchCock1", releaseDate: now};
            yield {url: "", title: "Vol. 2: : I am a title2 Chapter 3 -  I am HitchCock2", releaseDate: now};
            yield {url: "", title: "Volume 2: I am a title2 - Chapter 4 -  I am HitchCock3", releaseDate: now};
        })();

        const contents = await directTools.scrapeToc(generator);
        contents.should.deep.equal(createParts(
            now,
            {
                title: "I am a title1",
                combiIndex: 1,
                episodes: [
                    {
                        title: "I am HitchCock",
                        combiIndex: 1
                    },
                    {
                        title: "I am HitchCock1",
                        combiIndex: 2
                    }
                ]
            },
            {
                title: "I am a title2",
                combiIndex: 2,
                episodes: [
                    {
                        title: "I am HitchCock2",
                        combiIndex: 3
                    },
                    {
                        title: "I am HitchCock3",
                        combiIndex: 4
                    }
                ]
            },
        ));
    });
    it("should extract correct toc: ignore invalid chapters", async function () {
        const now = new Date();
        const generator = (async function* testGenerator() {
            yield {url: "", title: "Vol. 1: I am a title1 - Chapter 1 -  I am HitchCock", releaseDate: now};
            yield {url: "", title: "V1: I am a title1 Chapter 2:  I am HitchCock1", releaseDate: now};
            yield {url: "", title: "V1: I am a title1 Chapter DELETED:  I am HitchCock1", releaseDate: now};
            yield {url: "", title: "V. SPAM: I am a title1 Chapter 2:  I am HitchCock1", releaseDate: now};
            yield {url: "", title: "Vol. 2: : I am a title2 Chapter 3 -  I am HitchCock2", releaseDate: now};
            yield {url: "", title: "Vol. SPAM: : I am a title2 Chapter 3 -  I am HitchCock2", releaseDate: now};
            yield {url: "", title: "Vol. 2: : I am a title2 Chapter SPAM -  I am HitchCock2", releaseDate: now};
            yield {url: "", title: "Volume 2: I am a title2 - Chapter 4 -  I am HitchCock3", releaseDate: now};
            yield {url: "", title: "Vol. DELETED: : I am a title2 Chapter 4 -  I am HitchCock2", releaseDate: now};
        })();

        const contents = await directTools.scrapeToc(generator);
        contents.should.deep.equal(createParts(
            now,
            {
                title: "I am a title1",
                combiIndex: 1,
                episodes: [
                    {
                        title: "I am HitchCock",
                        combiIndex: 1
                    },
                    {
                        title: "I am HitchCock1",
                        combiIndex: 2
                    }
                ]
            },
            {
                title: "I am a title2",
                combiIndex: 2,
                episodes: [
                    {
                        title: "I am HitchCock2",
                        combiIndex: 3
                    },
                    {
                        title: "I am HitchCock3",
                        combiIndex: 4
                    }
                ]
            },
        ));
    });
    it("should extract correct toc: full short form with title", async function () {
        const now = new Date();
        const generator = (async function* testGenerator() {
            yield {url: "", title: "V54C3P3 – All That Labor Work", releaseDate: now};
            yield {url: "", title: "V54C4P1- Plan of Annihilation", releaseDate: now};
            yield {url: "", title: "V54C4P2- Plan of Annihilation", releaseDate: now};
            yield {url: "", title: "V54C4P3- Plan of Annihilation", releaseDate: now};
        })();

        const contents = await directTools.scrapeToc(generator);
        contents.should.deep.equal(createParts(
            now,
            {
                combiIndex: 54,
                episodes: [
                    {
                        title: "All That Labor Work",
                        combiIndex: 3.3,
                        totalIndex: 3,
                        partialIndex: 3
                    },
                    {
                        title: "Plan of Annihilation",
                        combiIndex: 4.1,
                        totalIndex: 4,
                        partialIndex: 1
                    },
                    {
                        title: "Plan of Annihilation",
                        combiIndex: 4.2,
                        totalIndex: 4,
                        partialIndex: 2
                    },
                    {
                        title: "Plan of Annihilation",
                        combiIndex: 4.3,
                        totalIndex: 4,
                        partialIndex: 3
                    },
                ]
            }
        ));
    });
    it("should extract correct toc: full form mixed with full short form with title", async function () {
        const now = new Date();
        const generator = (async function* testGenerator() {
            yield {url: "", title: "Chapter 586 - V54C3P3 – All That Labor Work", releaseDate: now};
            yield {url: "", title: "Chapter 587 - V54C4P1- Plan of Annihilation", releaseDate: now};
            yield {url: "", title: "Chapter 588 - V54C4P2- Plan of Annihilation", releaseDate: now};
            yield {url: "", title: "Chapter 589 - V54C4P3- Plan of Annihilation", releaseDate: now};
        })();

        const contents = await directTools.scrapeToc(generator);
        contents.should.deep.equal(createParts(
            now,
            {
                combiIndex: 54,
                episodes: [
                    {
                        title: "All That Labor Work",
                        combiIndex: 586
                    },
                    {
                        title: "Plan of Annihilation",
                        combiIndex: 587
                    },
                    {
                        title: "Plan of Annihilation",
                        combiIndex: 588
                    },
                    {
                        title: "Plan of Annihilation",
                        combiIndex: 589
                    },
                ]
            }
        ));
    });
    it("should extract correct toc: title prefix with full form mixed with full short form with title", async function () {
        const now = new Date();
        const generator = (async function* testGenerator() {
            yield {title: "I am a cool Book", mediumType: 1};
            yield {url: "", title: "I am a cool Book: Chapter 586 - V54C3P3 – All That Labor Work", releaseDate: now};
            yield {url: "", title: "I am a cool Book: Chapter 587 - V54C4P1- Plan of Annihilation", releaseDate: now};
            yield {url: "", title: "I am a cool Book: Chapter 588 - V54C4P2- Plan of Annihilation", releaseDate: now};
            yield {url: "", title: "I am a cool Book: Chapter 589 - V54C4P3- Plan of Annihilation", releaseDate: now};
        })();

        const contents = await directTools.scrapeToc(generator);
        contents.should.deep.equal(createParts(
            now,
            {
                combiIndex: 54,
                episodes: [
                    {
                        title: "All That Labor Work",
                        combiIndex: 586
                    },
                    {
                        title: "Plan of Annihilation",
                        combiIndex: 587
                    },
                    {
                        title: "Plan of Annihilation",
                        combiIndex: 588
                    },
                    {
                        title: "Plan of Annihilation",
                        combiIndex: 589
                    },
                ]
            }
        ));
    });
    it("should extract correct toc: title prefix with different volume namings and chapter", async function () {
        const now = new Date();
        const generator = (async function* testGenerator() {
            yield {title: "I am a cool Book", mediumType: 1};
            yield {url: "", title: "I am a cool Book: Volume1 Chapter 586 -  All That Labor Work", releaseDate: now};
            yield {url: "", title: "I am a cool Book: Book1 Chapter 587 -  Plan of Annihilation", releaseDate: now};
            yield {url: "", title: "I am a cool Book: Book 2 Chapter 588 - Plan of Annihilation", releaseDate: now};
            yield {url: "", title: "I am a cool Book: Season 2 Chapter 589 - Plan of Annihilation", releaseDate: now};
        })();

        const contents = await directTools.scrapeToc(generator);
        contents.should.deep.equal(createParts(
            now,
            {
                combiIndex: 1,
                episodes: [
                    {
                        title: "All That Labor Work",
                        combiIndex: 586
                    },
                    {
                        title: "Plan of Annihilation",
                        combiIndex: 587
                    },
                ]
            },
            {
                combiIndex: 2,
                episodes: [
                    {
                        title: "Plan of Annihilation",
                        combiIndex: 588
                    },
                    {
                        title: "Plan of Annihilation",
                        combiIndex: 589
                    },
                ]
            }
        ));
    });
    it("should extract correct toc: chapter indices with not always used partial index with title only", async function () {
        const now = new Date();
        const generator = (async function* testGenerator() {
            yield {url: "", title: "Ch. 1 -  I am HitchCock", releaseDate: now};
            yield {url: "", title: "C2:  I am HitchCock1", releaseDate: now};
            yield {url: "", title: "2:  I am HitchCock1 2/2", releaseDate: now};
            yield {url: "", title: "Chapter. 3 -  I am HitchCock2", releaseDate: now};
            yield {url: "", title: "c4 -  I am HitchCock3", releaseDate: now};
            yield {url: "", title: "4 -  I am HitchCock3 [2/2]", releaseDate: now};
        })();

        const contents = await directTools.scrapeToc(generator);
        contents.should.deep.equal(createReleases(
            now,
            {
                title: "I am HitchCock",
                combiIndex: 1
            },
            {
                title: "I am HitchCock1",
                combiIndex: 2.1,
                totalIndex: 2,
                partialIndex: 1
            },
            {
                title: "I am HitchCock1",
                combiIndex: 2.2,
                totalIndex: 2,
                partialIndex: 2
            },
            {
                title: "I am HitchCock2",
                combiIndex: 3
            },
            {
                title: "I am HitchCock3",
                combiIndex: 4.1,
                totalIndex: 4,
                partialIndex: 1
            },
            {
                title: "I am HitchCock3",
                combiIndex: 4.2,
                totalIndex: 4,
                partialIndex: 2
            }
        ));
    });
    it("should extract correct toc: chapter indices with non main story chapters at the ends with ongoing ascending story", async function () {
        const now = new Date();
        const generator = (async function* testGenerator() {
            yield {title: "I am a cool Book", mediumType: 1, end: undefined};
            yield {url: "", title: "I am a Intermission1", releaseDate: now};
            yield {url: "", title: "I am a Intermission2", releaseDate: now};
            yield {url: "", title: "C1:  I am HitchCock1", releaseDate: now};
            yield {url: "", title: "2:  I am HitchCock1 2/2", releaseDate: now};
            yield {url: "", title: "Chapter. 3 -  I am HitchCock2", releaseDate: now};
            yield {url: "", title: "4 -  I am HitchCock3 [2/2]", releaseDate: now};
            yield {url: "", title: "I am a Intermission3", releaseDate: now};
            yield {url: "", title: "I am a Intermission4", releaseDate: now};
        })();

        const contents = await directTools.scrapeToc(generator);
        contents.should.deep.equal(createReleases(
            now,
            {
                title: "I am a Intermission1",
                combiIndex: 0.1,
                totalIndex: 0,
                partialIndex: 1
            },
            {
                title: "I am a Intermission2",
                combiIndex: 0.2,
                totalIndex: 0,
                partialIndex: 2
            },
            {
                title: "I am a Intermission3",
                combiIndex: 0.3,
                totalIndex: 0,
                partialIndex: 3
            },
            {
                title: "I am a Intermission4",
                combiIndex: 0.4,
                totalIndex: 0,
                partialIndex: 4
            },
            {
                title: "I am HitchCock1",
                combiIndex: 1
            },
            {
                title: "I am HitchCock1",
                combiIndex: 2.2,
                totalIndex: 2,
                partialIndex: 2
            },
            {
                title: "I am HitchCock2",
                combiIndex: 3
            },
            {
                title: "I am HitchCock3",
                combiIndex: 4.2,
                totalIndex: 4,
                partialIndex: 2
            }
        ));
    });
    it("should extract correct toc: chapter indices with non main story chapters at the ends with finished ascending story", async function () {
        const now = new Date();
        const generator = (async function* testGenerator() {
            yield {title: "I am a cool Book", mediumType: 1, end: true};
            yield {url: "", title: "I am a Intermission1", releaseDate: now};
            yield {url: "", title: "I am a Intermission2", releaseDate: now};
            yield {url: "", title: "C1:  I am HitchCock1", releaseDate: now};
            yield {url: "", title: "2:  I am HitchCock1 2/2", releaseDate: now};
            yield {url: "", title: "Chapter. 3 -  I am HitchCock2", releaseDate: now};
            yield {url: "", title: "4 -  I am HitchCock3 [2/2]", releaseDate: now};
            yield {url: "", title: "I am a Intermission3", releaseDate: now};
            yield {url: "", title: "I am a Intermission4", releaseDate: now};
        })();

        const contents = await directTools.scrapeToc(generator);
        contents.should.deep.equal(createReleases(
            now,
            {
                title: "I am a Intermission1",
                combiIndex: 0.1,
                totalIndex: 0,
                partialIndex: 1
            },
            {
                title: "I am a Intermission2",
                combiIndex: 0.2,
                totalIndex: 0,
                partialIndex: 2
            },
            {
                title: "I am HitchCock1",
                combiIndex: 1
            },
            {
                title: "I am HitchCock1",
                combiIndex: 2.2,
                totalIndex: 2,
                partialIndex: 2
            },
            {
                title: "I am HitchCock2",
                combiIndex: 3
            },
            {
                title: "I am HitchCock3",
                combiIndex: 4.2,
                totalIndex: 4,
                partialIndex: 2
            },
            {
                title: "I am a Intermission3",
                combiIndex: 4.301,
                totalIndex: 4,
                partialIndex: 301
            },
            {
                title: "I am a Intermission4",
                combiIndex: 4.302,
                totalIndex: 4,
                partialIndex: 302
            },
        ));
    });
    it("should extract correct toc: chapter indices with non main story chapters at the ends with ongoing descending story", async function () {
        const now = new Date();
        const generator = (async function* testGenerator() {
            yield {title: "I am a cool Book", mediumType: 1, end: undefined};
            yield {url: "", title: "I am a Intermission4", releaseDate: now};
            yield {url: "", title: "I am a Intermission3", releaseDate: now};
            yield {url: "", title: "4 -  I am HitchCock3 [2/2]", releaseDate: now};
            yield {url: "", title: "Chapter. 3 -  I am HitchCock2", releaseDate: now};
            yield {url: "", title: "2:  I am HitchCock1 2/2", releaseDate: now};
            yield {url: "", title: "C1:  I am HitchCock1", releaseDate: now};
            yield {url: "", title: "I am a Intermission2", releaseDate: now};
            yield {url: "", title: "I am a Intermission1", releaseDate: now};
        })();

        const contents = await directTools.scrapeToc(generator);
        contents.should.deep.equal(createReleases(
            now,
            {
                title: "I am HitchCock3",
                combiIndex: 4.2,
                totalIndex: 4,
                partialIndex: 2
            },
            {
                title: "I am HitchCock2",
                combiIndex: 3
            },
            {
                title: "I am HitchCock1",
                combiIndex: 2.2,
                totalIndex: 2,
                partialIndex: 2
            },
            {
                title: "I am HitchCock1",
                combiIndex: 1
            },
            {
                title: "I am a Intermission4",
                combiIndex: 0.4,
                totalIndex: 0,
                partialIndex: 4
            },
            {
                title: "I am a Intermission3",
                combiIndex: 0.3,
                totalIndex: 0,
                partialIndex: 3
            },
            {
                title: "I am a Intermission2",
                combiIndex: 0.2,
                totalIndex: 0,
                partialIndex: 2
            },
            {
                title: "I am a Intermission1",
                combiIndex: 0.1,
                totalIndex: 0,
                partialIndex: 1
            },
        ));
    });
    it("should extract correct toc: chapter indices with non main story chapters at the ends with finished descending story", async function () {
        const now = new Date();
        const generator = (async function* testGenerator() {
            yield {title: "I am a cool Book", mediumType: 1, end: true};
            yield {url: "", title: "I am a Intermission4", releaseDate: now};
            yield {url: "", title: "I am a Intermission3", releaseDate: now};
            yield {url: "", title: "4 -  I am HitchCock3 [2/2]", releaseDate: now};
            yield {url: "", title: "Chapter. 3 -  I am HitchCock2", releaseDate: now};
            yield {url: "", title: "2:  I am HitchCock1 2/2", releaseDate: now};
            yield {url: "", title: "C1:  I am HitchCock1", releaseDate: now};
            yield {url: "", title: "I am a Intermission2", releaseDate: now};
            yield {url: "", title: "I am a Intermission1", releaseDate: now};
        })();

        const contents = await directTools.scrapeToc(generator);
        contents.should.deep.equal(createReleases(
            now,
            {
                title: "I am a Intermission4",
                combiIndex: 4.302,
                totalIndex: 4,
                partialIndex: 302
            },
            {
                title: "I am a Intermission3",
                combiIndex: 4.301,
                totalIndex: 4,
                partialIndex: 301
            },
            {
                title: "I am HitchCock3",
                combiIndex: 4.2,
                totalIndex: 4,
                partialIndex: 2
            },
            {
                title: "I am HitchCock2",
                combiIndex: 3
            },
            {
                title: "I am HitchCock1",
                combiIndex: 2.2,
                totalIndex: 2,
                partialIndex: 2
            },
            {
                title: "I am HitchCock1",
                combiIndex: 1
            },
            {
                title: "I am a Intermission2",
                combiIndex: 0.2,
                totalIndex: 0,
                partialIndex: 2
            },
            {
                title: "I am a Intermission1",
                combiIndex: 0.1,
                totalIndex: 0,
                partialIndex: 1
            },
        ));
    });
    it("should extract correct toc: chapter indices with non main story chapters in the middle with ascending story", async function () {
        const now = new Date();
        const generator = (async function* testGenerator() {
            yield {url: "", title: "C1:  I am HitchCock1", releaseDate: now};
            yield {url: "", title: "2:  I am HitchCock1 2/2", releaseDate: now};
            yield {url: "", title: "I am a Intermission1", releaseDate: now};
            yield {url: "", title: "I am a Intermission2", releaseDate: now};
            yield {url: "", title: "Chapter. 3 -  I am HitchCock2", releaseDate: now};
            yield {url: "", title: "I am a Intermission3", releaseDate: now};
            yield {url: "", title: "I am a Intermission4", releaseDate: now};
            yield {url: "", title: "4 -  I am HitchCock3 [2/2]", releaseDate: now};
        })();

        const contents = await directTools.scrapeToc(generator);
        contents.should.deep.equal(createReleases(
            now,
            {
                title: "I am HitchCock1",
                combiIndex: 1
            },
            {
                title: "I am HitchCock1",
                combiIndex: 2.2,
                totalIndex: 2,
                partialIndex: 2
            },
            {
                title: "I am a Intermission1",
                combiIndex: 2.301,
                totalIndex: 2,
                partialIndex: 301
            },
            {
                title: "I am a Intermission2",
                combiIndex: 2.302,
                totalIndex: 2,
                partialIndex: 302
            },
            {
                title: "I am HitchCock2",
                combiIndex: 3
            },
            {
                title: "I am a Intermission3",
                combiIndex: 3.101,
                totalIndex: 3,
                partialIndex: 101
            },
            {
                title: "I am a Intermission4",
                combiIndex: 3.102,
                totalIndex: 3,
                partialIndex: 102
            },
            {
                title: "I am HitchCock3",
                combiIndex: 4.2,
                totalIndex: 4,
                partialIndex: 2
            },
        ));
    });
    it("should extract correct toc: chapter indices with non main story chapters in the middle with descending story", async function () {
        const now = new Date();
        const generator = (async function* testGenerator() {
            yield {url: "", title: "4 -  I am HitchCock3 [2/2]", releaseDate: now};
            yield {url: "", title: "I am a Intermission4", releaseDate: now};
            yield {url: "", title: "I am a Intermission3", releaseDate: now};
            yield {url: "", title: "Chapter. 3 -  I am HitchCock2", releaseDate: now};
            yield {url: "", title: "I am a Intermission2", releaseDate: now};
            yield {url: "", title: "I am a Intermission1", releaseDate: now};
            yield {url: "", title: "2:  I am HitchCock1 2/2", releaseDate: now};
            yield {url: "", title: "C1:  I am HitchCock1", releaseDate: now};
        })();

        const contents = await directTools.scrapeToc(generator);
        contents.should.deep.equal(createReleases(
            now,
            {
                title: "I am HitchCock3",
                combiIndex: 4.2,
                totalIndex: 4,
                partialIndex: 2
            },
            {
                title: "I am a Intermission4",
                combiIndex: 3.102,
                totalIndex: 3,
                partialIndex: 102
            },
            {
                title: "I am a Intermission3",
                combiIndex: 3.101,
                totalIndex: 3,
                partialIndex: 101
            },
            {
                title: "I am HitchCock2",
                combiIndex: 3
            },
            {
                title: "I am a Intermission2",
                combiIndex: 2.302,
                totalIndex: 2,
                partialIndex: 302
            },
            {
                title: "I am a Intermission1",
                combiIndex: 2.301,
                totalIndex: 2,
                partialIndex: 301
            },
            {
                title: "I am HitchCock1",
                combiIndex: 2.2,
                totalIndex: 2,
                partialIndex: 2
            },
            {
                title: "I am HitchCock1",
                combiIndex: 1
            },
        ));
    });
    it("should extract correct toc: chapter indices with volume items between with descending story", async function () {
        const now = new Date();
        const generator = (async function* testGenerator() {
            yield {url: "", title: "4 -  I am HitchCock3 [2/2]", releaseDate: now};
            yield {url: "", title: "I am a Intermission4", releaseDate: now};
            yield {url: "", title: "I am a Intermission3", releaseDate: now};
            yield {url: "", title: "Chapter. 3 -  I am HitchCock2", releaseDate: now};
            yield {url: "", title: "Volume 2"};
            yield {url: "", title: "I am a Intermission2", releaseDate: now};
            yield {url: "", title: "I am a Intermission1", releaseDate: now};
            yield {url: "", title: "2:  I am HitchCock1 2/2", releaseDate: now};
            yield {url: "", title: "C1:  I am HitchCock1", releaseDate: now};
            yield {url: "", title: "Volume 1"};
        })();

        const contents = await directTools.scrapeToc(generator);
        contents.should.deep.equal(createParts(
            now,
            {
                combiIndex: 2,
                episodes: [
                    {
                        title: "I am HitchCock3",
                        combiIndex: 4.2,
                        totalIndex: 4,
                        partialIndex: 2
                    },
                    {
                        title: "I am a Intermission4",
                        combiIndex: 3.102,
                        totalIndex: 3,
                        partialIndex: 102
                    },
                    {
                        title: "I am a Intermission3",
                        combiIndex: 3.101,
                        totalIndex: 3,
                        partialIndex: 101
                    },
                    {
                        title: "I am HitchCock2",
                        combiIndex: 3
                    },
                ]
            },
            {
                combiIndex: 1,
                episodes: [
                    {
                        title: "I am a Intermission2",
                        combiIndex: 2.302,
                        totalIndex: 2,
                        partialIndex: 302
                    },
                    {
                        title: "I am a Intermission1",
                        combiIndex: 2.301,
                        totalIndex: 2,
                        partialIndex: 301
                    },
                    {
                        title: "I am HitchCock1",
                        combiIndex: 2.2,
                        totalIndex: 2,
                        partialIndex: 2
                    },
                    {
                        title: "I am HitchCock1",
                        combiIndex: 1
                    },
                ]
            },
        ));
    });
    it("should extract correct toc: chapter indices with volume items between with ascending story", async function () {
        const now = new Date();
        const generator = (async function* testGenerator() {
            yield {url: "", title: "Volume 1"};
            yield {url: "", title: "C1:  I am HitchCock1", releaseDate: now};
            yield {url: "", title: "2:  I am HitchCock1 2/2", releaseDate: now};
            yield {url: "", title: "I am a Intermission1", releaseDate: now};
            yield {url: "", title: "I am a Intermission2", releaseDate: now};
            yield {url: "", title: "Volume 2"};
            yield {url: "", title: "Chapter. 3 -  I am HitchCock2", releaseDate: now};
            yield {url: "", title: "I am a Intermission3", releaseDate: now};
            yield {url: "", title: "I am a Intermission4", releaseDate: now};
            yield {url: "", title: "4 -  I am HitchCock3 [2/2]", releaseDate: now};
        })();

        const contents = await directTools.scrapeToc(generator);
        contents.should.deep.equal(createParts(
            {
                combiIndex: 1,
                episodes: [
                    {
                        title: "I am HitchCock1",
                        combiIndex: 1
                    },
                    {
                        title: "I am HitchCock1",
                        combiIndex: 2.2,
                        totalIndex: 2,
                        partialIndex: 2
                    },
                    {
                        title: "I am a Intermission1",
                        combiIndex: 2.301,
                        totalIndex: 2,
                        partialIndex: 301
                    },
                    {
                        title: "I am a Intermission2",
                        combiIndex: 2.302,
                        totalIndex: 2,
                        partialIndex: 302
                    },
                ]
            },
            {
                combiIndex: 2,
                episodes: [
                    {
                        title: "I am HitchCock2",
                        combiIndex: 3
                    },
                    {
                        title: "I am a Intermission3",
                        combiIndex: 3.101,
                        totalIndex: 3,
                        partialIndex: 101
                    },
                    {
                        title: "I am a Intermission4",
                        combiIndex: 3.102,
                        totalIndex: 3,
                        partialIndex: 102
                    },
                    {
                        title: "I am HitchCock3",
                        combiIndex: 4.2,
                        totalIndex: 4,
                        partialIndex: 2
                    }
                ]
            },
        ));
    });
    it("should extract correct toc: non main episode with volume definition between with descending story", async function () {
        const now = new Date();
        const generator = (async function* testGenerator() {
            yield {url: "", title: "Volume 2 I have a Title2 C4 -  I am HitchCock3 [2/2]", releaseDate: now};
            yield {url: "", title: "Volume 2 I have a Title2: Chapter. 3 -  I am HitchCock2", releaseDate: now};
            yield {url: "", title: "Volume 2 I have a Title2 - I am a Intermission4", releaseDate: now};
            yield {url: "", title: "Volume 2 I have a Title2 I am a Intermission3", releaseDate: now};
            yield {url: "", title: "Volume 1: I have a Title1 - C2:  I am HitchCock1 2/2", releaseDate: now};
            yield {url: "", title: "Volume 1:  I have a Title1 C1:  I am HitchCock1", releaseDate: now};
            yield {url: "", title: "Volume 1 I have a Title1 - I am a Intermission2", releaseDate: now};
            yield {url: "", title: "Volume 1 I have a Title1 I am a Intermission1", releaseDate: now};
        })();

        const contents = await directTools.scrapeToc(generator);
        contents.should.deep.equal(createParts(
            {
                title: "I have a Title2",
                combiIndex: 2,
                episodes: [
                    {
                        title: "I am HitchCock3",
                        combiIndex: 4.2,
                        totalIndex: 4,
                        partialIndex: 2
                    },
                    {
                        title: "I am HitchCock2",
                        combiIndex: 3
                    },
                    {
                        title: "I am a Intermission4",
                        combiIndex: 2.302,
                        totalIndex: 2,
                        partialIndex: 302
                    },
                    {
                        title: "I am a Intermission3",
                        combiIndex: 2.301,
                        totalIndex: 2,
                        partialIndex: 301
                    },
                ]
            },
            {
                title: "I have a Title1",
                combiIndex: 1,
                episodes: [
                    {
                        title: "I am HitchCock1",
                        combiIndex: 2.2,
                        totalIndex: 2,
                        partialIndex: 2
                    },
                    {
                        title: "I am HitchCock1",
                        combiIndex: 1
                    },
                    {
                        title: "I am a Intermission2",
                        combiIndex: 0.2,
                        totalIndex: 0,
                        partialIndex: 2
                    },
                    {
                        title: "I am a Intermission1",
                        combiIndex: 0.1,
                        totalIndex: 0,
                        partialIndex: 1
                    },
                ]
            },
        ));
    });
    it("should extract correct toc: non main episode with volume definition between with ascending story", async function () {
        const now = new Date();
        const generator = (async function* testGenerator() {
            yield {url: "", title: "Volume 1 I have a Title1 I am a Intermission1", releaseDate: now};
            yield {url: "", title: "Volume 1 I have a Title1 - I am a Intermission2", releaseDate: now};
            yield {url: "", title: "Volume 1:  I have a Title1 C1:  I am HitchCock1", releaseDate: now};
            yield {url: "", title: "Volume 1: I have a Title1 - C2:  I am HitchCock1 2/2", releaseDate: now};
            yield {url: "", title: "Volume 2 I have a Title2 I am a Intermission3", releaseDate: now};
            yield {url: "", title: "Volume 2 I have a Title2 - I am a Intermission4", releaseDate: now};
            yield {url: "", title: "Volume 2 I have a Title2: Chapter. 3 -  I am HitchCock2", releaseDate: now};
            yield {url: "", title: "Volume 2 I have a Title2 C4 -  I am HitchCock3 [2/2]", releaseDate: now};
        })();

        const contents = await directTools.scrapeToc(generator);
        contents.should.deep.equal(createParts(
            {
                title: "I have a Title1",
                combiIndex: 1,
                episodes: [
                    {
                        title: "I am a Intermission1",
                        combiIndex: 0.1,
                        totalIndex: 0,
                        partialIndex: 1
                    },
                    {
                        title: "I am a Intermission2",
                        combiIndex: 0.2,
                        totalIndex: 0,
                        partialIndex: 2
                    },
                    {
                        title: "I am HitchCock1",
                        combiIndex: 1

                    },
                    {
                        title: "I am HitchCock1",
                        combiIndex: 2.2,
                        totalIndex: 2,
                        partialIndex: 2
                    },
                ]
            },
            {
                title: "I have a Title2",
                combiIndex: 2,
                episodes: [
                    {
                        title: "I am a Intermission3",
                        combiIndex: 2.301,
                        totalIndex: 2,
                        partialIndex: 301
                    },
                    {
                        title: "I am a Intermission4",
                        combiIndex: 2.302,
                        totalIndex: 2,
                        partialIndex: 302
                    },
                    {
                        title: "I am HitchCock2",
                        combiIndex: 3

                    },
                    {
                        title: "I am HitchCock3",
                        combiIndex: 4.2,
                        totalIndex: 4,
                        partialIndex: 2
                    },
                ]
            },
        ));
    });
    it("should extract correct toc: episodes without volume sandwiched between ones with volume between with descending story", async function () {
        const now = new Date();
        const generator = (async function* testGenerator() {
            yield {url: "", title: "Volume 2 I have a Title2 C4 -  I am HitchCock3 [2/2]", releaseDate: now};
            yield {url: "", title: "Chapter. 3 -  I am HitchCock2", releaseDate: now};
            yield {url: "", title: "I am a Intermission4", releaseDate: now};
            yield {url: "", title: "Volume 2 I have a Title2 I am a Intermission3", releaseDate: now};
            yield {url: "", title: "Volume 1: I have a Title1 - C2:  I am HitchCock1 2/2", releaseDate: now};
            yield {url: "", title: "C1:  I am HitchCock1", releaseDate: now};
            yield {url: "", title: "I am a Intermission2", releaseDate: now};
            yield {url: "", title: "Volume 1 I have a Title1 I am a Intermission1", releaseDate: now};
        })();

        const contents = await directTools.scrapeToc(generator);
        contents.should.deep.equal(createParts(
            {
                title: "I have a Title2",
                combiIndex: 2,
                episodes: [
                    {
                        title: "I am HitchCock3",
                        combiIndex: 4.2,
                        totalIndex: 4,
                        partialIndex: 2
                    },
                    {
                        title: "I am HitchCock2",
                        combiIndex: 3
                    },
                    {
                        title: "I am a Intermission4",
                        combiIndex: 2.302,
                        totalIndex: 2,
                        partialIndex: 302
                    },
                    {
                        title: "I am a Intermission3",
                        combiIndex: 2.301,
                        totalIndex: 2,
                        partialIndex: 301
                    },
                ]
            },
            {
                title: "I have a Title1",
                combiIndex: 1,
                episodes: [
                    {
                        title: "I am HitchCock1",
                        combiIndex: 2.2,
                        totalIndex: 2,
                        partialIndex: 2
                    },
                    {
                        title: "I am HitchCock1",
                        combiIndex: 1
                    },
                    {
                        title: "I am a Intermission2",
                        combiIndex: 0.2,
                        totalIndex: 0,
                        partialIndex: 2
                    },
                    {
                        title: "I am a Intermission1",
                        combiIndex: 0.1,
                        totalIndex: 0,
                        partialIndex: 1
                    },
                ]
            },
        ));
    });
    it("should extract correct toc: episodes without volume sandwiched between ones with volume with ascending story", async function () {
        const now = new Date();
        const generator = (async function* testGenerator() {
            yield {url: "", title: "Volume 1 I have a Title1 I am a Intermission1", releaseDate: now};
            yield {url: "", title: "I am a Intermission2", releaseDate: now};
            yield {url: "", title: "C1:  I am HitchCock1", releaseDate: now};
            yield {url: "", title: "Volume 1: I have a Title1 - C2:  I am HitchCock1 2/2", releaseDate: now};
            yield {url: "", title: "Volume 2 I have a Title2 I am a Intermission3", releaseDate: now};
            yield {url: "", title: "I am a Intermission4", releaseDate: now};
            yield {url: "", title: "Chapter. 3 -  I am HitchCock2", releaseDate: now};
            yield {url: "", title: "Volume 2 I have a Title2 C4 -  I am HitchCock3 [2/2]", releaseDate: now};
        })();

        const contents = await directTools.scrapeToc(generator);
        contents.should.deep.equal(createParts(
            {
                title: "I have a Title1",
                combiIndex: 1,
                episodes: [
                    {
                        title: "I am a Intermission1",
                        combiIndex: 0.1,
                        totalIndex: 0,
                        partialIndex: 1
                    },
                    {
                        title: "I am a Intermission2",
                        combiIndex: 0.2,
                        totalIndex: 0,
                        partialIndex: 2
                    },
                    {
                        title: "I am HitchCock1",
                        combiIndex: 1
                    },
                    {
                        title: "I am HitchCock1",
                        combiIndex: 2.2,
                        totalIndex: 2,
                        partialIndex: 2
                    },
                ]
            },
            {
                title: "I have a Title2",
                combiIndex: 2,
                episodes: [
                    {
                        title: "I am a Intermission3",
                        combiIndex: 2.301,
                        totalIndex: 2,
                        partialIndex: 301
                    },
                    {
                        title: "I am a Intermission4",
                        combiIndex: 2.302,
                        totalIndex: 2,
                        partialIndex: 302
                    },
                    {
                        title: "I am HitchCock2",
                        combiIndex: 3
                    },
                    {
                        title: "I am HitchCock3",
                        combiIndex: 4.2,
                        totalIndex: 4,
                        partialIndex: 2
                    },
                ]
            },
        ));
    });
    it("should extract correct toc: for an example toc with half hearted chapter-volume-chapter format", async function () {
        const generator = (async function* testGenerator() {
            const content = await fs.promises.readFile("tests/resources/boxnovel-281.html", "utf8");
            const $ = cheerio.load(content);
            const mediumTitleElement = $(".post-title h3");
            mediumTitleElement.find("span").remove();
            const mediumTitle = tools.sanitizeString(mediumTitleElement.text());

            const items = $(".wp-manga-chapter");

            const releaseStatusString = $(".post-status .post-content_item:nth-child(2) .summary-content").text().trim().toLowerCase();

            let end;
            if (releaseStatusString === "ongoing") {
                end = false;
            } else if (releaseStatusString === "completed") {
                end = true;
            }
            const tocMeta = {
                title: mediumTitle,
                mediumType: tools.MediaType.TEXT,
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

                yield {title: titleElement.text(), url: link, releaseDate: date};
            }
        })();

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
            content.episodes.should.be.an("array");

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
        const now = new Date();
        const generator = (async function* testGenerator() {
            yield {url: "", title: "Volume 1 I have a Title1 I am a Intermission1", releaseDate: now};
            yield {url: "", title: "I am a Intermission2", releaseDate: now};
            yield {url: "", title: "C1:  I am HitchCock1", releaseDate: now};
            yield {url: "", title: "Volume 1: I have a Title1 - C2:  I am HitchCock1 2/2", releaseDate: now};
            yield {url: "", title: "Volume 2 I have a Title2 I am a Intermission3", releaseDate: now};
            yield {url: "", title: "I am a Intermission4", releaseDate: now};
            yield {url: "", title: "Chapter. 3 -  I am HitchCock2", releaseDate: now};
            yield {url: "", title: "Volume 2 I have a Title2 C4-7 -  I am HitchCock3", releaseDate: now};
        })();

        const contents = await directTools.scrapeToc(generator);
        contents.should.deep.equal(createParts(
            {
                title: "I have a Title1",
                combiIndex: 1,
                episodes: [
                    {
                        title: "I am a Intermission1",
                        combiIndex: 0.1,
                        totalIndex: 0,
                        partialIndex: 1
                    },
                    {
                        title: "I am a Intermission2",
                        combiIndex: 0.2,
                        totalIndex: 0,
                        partialIndex: 2
                    },
                    {
                        title: "I am HitchCock1",
                        combiIndex: 1
                    },
                    {
                        title: "I am HitchCock1",
                        combiIndex: 2.2,
                        totalIndex: 2,
                        partialIndex: 2
                    },
                ]
            },
            {
                title: "I have a Title2",
                combiIndex: 2,
                episodes: [
                    {
                        title: "I am a Intermission3",
                        combiIndex: 2.301,
                        totalIndex: 2,
                        partialIndex: 301
                    },
                    {
                        title: "I am a Intermission4",
                        combiIndex: 2.302,
                        totalIndex: 2,
                        partialIndex: 302
                    },
                    {
                        title: "I am HitchCock2",
                        combiIndex: 3
                    },
                    {
                        title: "I am HitchCock3",
                        combiIndex: 4
                    },
                    {
                        title: "I am HitchCock3",
                        combiIndex: 5
                    },
                    {
                        title: "I am HitchCock3",
                        combiIndex: 6
                    },
                    {
                        title: "I am HitchCock3",
                        combiIndex: 7
                    },
                ]
            },
        ));
    });
    it("should extract correct toc: for an example toc with descending index and sometimes partialindex", async function () {
        const generator = (async function* testGenerator() {
            const content = await fs.promises.readFile("tests/resources/boxnovel-173.html", "utf8");
            const $ = cheerio.load(content);
            const mediumTitleElement = $(".post-title h3");
            mediumTitleElement.find("span").remove();
            const mediumTitle = tools.sanitizeString(mediumTitleElement.text());

            const items = $(".wp-manga-chapter");

            const releaseStatusString = $(".post-status .post-content_item:nth-child(2) .summary-content").text().trim().toLowerCase();

            let end;
            if (releaseStatusString === "ongoing") {
                end = false;
            } else if (releaseStatusString === "completed") {
                end = true;
            }
            const tocMeta = {
                title: mediumTitle,
                mediumType: tools.MediaType.TEXT,
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

                yield {title: titleElement.text(), url: link, releaseDate: date};
            }
        })();

        const contents = await directTools.scrapeToc(generator);
        contents.should.be.an("array");

        let currentEpisodeIndex = 210;
        let episodesCount = 0;

        for (const content of contents) {
            content.should.have.property("title");

            if (content.episodes) {
                content.episodes.should.be.an("array");

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
        const generator = (async function* testGenerator() {
            const now = new Date();
            for (let i = 1; i <= 7; i++) {
                const content = await fs.promises.readFile(`tests/resources/novelfull-122-${i}.html`, "utf8");
                const $ = cheerio.load(content);
                const mediumTitleElement = $(".desc .title").first();
                const mediumTitle = tools.sanitizeString(mediumTitleElement.text());

                const items = $(".list-chapter li a");

                const releaseStatusString = $(".info-holder .info div:nth-child(4) a").text().trim().toLowerCase();

                let end;
                if (releaseStatusString === "ongoing") {
                    end = false;
                } else if (releaseStatusString === "completed") {
                    end = true;
                }
                const tocMeta = {
                    title: mediumTitle,
                    mediumType: tools.MediaType.TEXT,
                    end,
                };
                yield tocMeta;

                for (let j = 0; j < items.length; j++) {
                    const newsRow = items.eq(j);
                    const link = newsRow.attr("href");
                    const episodeTitle = tools.sanitizeString(newsRow.text());
                    yield {title: episodeTitle, url: link, releaseDate: now};
                }
            }
        })();

        const contents = await directTools.scrapeToc(generator);
        contents.should.be.an("array");

        let currentEpisodeIndex = 1;
        let episodesCount = 0;

        for (const content of contents) {
            content.should.have.property("title");

            if (content.episodes) {
                content.episodes.should.be.an("array");

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
        const generator = (async function* testGenerator() {
            const now = new Date();
            for (let i = 1; i <= 13; i++) {
                const content = await fs.promises.readFile(`tests/resources/novel-test-toc-1-${i}.html`, "utf8");
                const $ = cheerio.load(content);
                const mediumTitleElement = $(".desc .title").first();
                const mediumTitle = tools.sanitizeString(mediumTitleElement.text());

                const items = $(".list-chapter li a");

                const releaseStatusString = $(".info-holder .info div:nth-child(4) a").text().trim().toLowerCase();

                let end;
                if (releaseStatusString === "ongoing") {
                    end = false;
                } else if (releaseStatusString === "completed") {
                    end = true;
                }
                const tocMeta = {
                    title: mediumTitle,
                    mediumType: tools.MediaType.TEXT,
                    end,
                };
                yield tocMeta;

                for (let j = 0; j < items.length; j++) {
                    const newsRow = items.eq(j);
                    const link = newsRow.attr("href");
                    const episodeTitle = tools.sanitizeString(newsRow.text());
                    yield {title: episodeTitle, url: link, releaseDate: now};
                }
            }
        })();

        const contents = await directTools.scrapeToc(generator);
        contents.should.be.an("array");

        let currentEpisodeIndex = 1;
        let episodesCount = 0;

        for (const content of contents) {
            content.should.have.property("title");

            if (content.episodes) {
                content.episodes.should.be.an("array");

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
        const generator = (async function* testGenerator() {
            const now = new Date();
            let tocYielded = false;
            for (let i = 1; i <= 13; i++) {
                const content = await fs.promises.readFile(`tests/resources/novelfull-155-${i}.html`, "utf8");
                const $ = cheerio.load(content);
                const mediumTitleElement = $(".desc .title").first();
                const mediumTitle = tools.sanitizeString(mediumTitleElement.text());

                const items = $(".list-chapter li a");

                const releaseStatusString = $(".info-holder .info div:nth-child(4) a").text().trim().toLowerCase();

                let end;
                if (releaseStatusString === "ongoing") {
                    end = false;
                } else if (releaseStatusString === "completed") {
                    end = true;
                }
                if (!tocYielded) {
                    const tocMeta = {
                        title: mediumTitle,
                        mediumType: tools.MediaType.TEXT,
                        end,
                    };
                    yield tocMeta;
                    tocYielded = true;
                }

                for (let j = 0; j < items.length; j++) {
                    const newsRow = items.eq(j);
                    const link = newsRow.attr("href");
                    const episodeTitle = tools.sanitizeString(newsRow.text());
                    yield {title: episodeTitle, url: link, releaseDate: now};
                }
            }
        })();

        const contents = await directTools.scrapeToc(generator);
        contents.should.be.an("array");

        let currentEpisodeIndex = 1;
        let episodesCount = 0;

        for (const content of contents) {
            content.should.have.property("title");

            if (content.episodes) {
                content.episodes.should.be.an("array");

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
        const generator = (async function* testGenerator() {
            const now = new Date();
            let tocYielded = false;
            for (let i = 1; i <= 25; i++) {
                const content = await fs.promises.readFile(`tests/resources/novelfull-178-${i}.html`, "utf8");
                const $ = cheerio.load(content);
                const mediumTitleElement = $(".desc .title").first();
                const mediumTitle = tools.sanitizeString(mediumTitleElement.text());

                const items = $(".list-chapter li a");

                const releaseStatusString = $(".info-holder .info div:nth-child(4) a").text().trim().toLowerCase();

                let end;
                if (releaseStatusString === "ongoing") {
                    end = false;
                } else if (releaseStatusString === "completed") {
                    end = true;
                }
                if (!tocYielded) {
                    const tocMeta = {
                        title: mediumTitle,
                        mediumType: tools.MediaType.TEXT,
                        end,
                    };
                    yield tocMeta;
                    tocYielded = true;
                }

                for (let j = 0; j < items.length; j++) {
                    const newsRow = items.eq(j);
                    const link = newsRow.attr("href");
                    const episodeTitle = tools.sanitizeString(newsRow.text());
                    yield {title: episodeTitle, url: link, releaseDate: now};
                }
            }
        })();

        const contents = await directTools.scrapeToc(generator);
        contents.should.be.an("array");

        let currentEpisodeIndex = 1;
        let episodesCount = 0;

        for (const content of contents) {
            content.should.have.property("title");

            if (content.episodes) {
                content.episodes.should.be.an("array");

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
        const generator = (async function* testGenerator() {
            const now = new Date();
            let tocYielded = false;
            for (let i = 1; i <= 12; i++) {
                const content = await fs.promises.readFile(`tests/resources/novelfull-182-${i}.html`, "utf8");
                const $ = cheerio.load(content);
                const mediumTitleElement = $(".desc .title").first();
                const mediumTitle = tools.sanitizeString(mediumTitleElement.text());

                const items = $(".list-chapter li a");

                const releaseStatusString = $(".info-holder .info div:nth-child(4) a").text().trim().toLowerCase();

                let end;
                if (releaseStatusString === "ongoing") {
                    end = false;
                } else if (releaseStatusString === "completed") {
                    end = true;
                }
                if (!tocYielded) {
                    const tocMeta = {
                        title: mediumTitle,
                        mediumType: tools.MediaType.TEXT,
                        end,
                    };
                    yield tocMeta;
                    tocYielded = true;
                }

                for (let j = 0; j < items.length; j++) {
                    const newsRow = items.eq(j);
                    const link = newsRow.attr("href");
                    const episodeTitle = tools.sanitizeString(newsRow.text());
                    yield {title: episodeTitle, url: link, releaseDate: now};
                }
            }
        })();

        const contents = await directTools.scrapeToc(generator);
        contents.should.be.an("array");

        let currentEpisodeIndex = 0;
        let episodesCount = 0;

        for (const content of contents) {
            content.should.have.property("title");

            if (content.episodes) {
                content.episodes.should.be.an("array");

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
