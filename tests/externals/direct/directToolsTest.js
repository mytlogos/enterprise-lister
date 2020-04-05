"use strict";
const sinon = require("sinon");
const sinon_chai = require("sinon-chai");
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const directTools = require("../../../server/dist/externals/direct/directTools");
const tools = require("../../../server/dist/tools");
after(() => {
    tools.internetTester.stop();
});

chai.use(sinon_chai);
chai.use(chaiAsPromised);
chai.should();

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
        contents.should.deep.equal([{
            title: "",
            combiIndex: 1,
            totalIndex: 1,
            partialIndex: undefined,
            locked: false,
            url: "",
            releaseDate: now
        },
            {
                title: "",
                combiIndex: 2,
                totalIndex: 2,
                partialIndex: undefined,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "",
                combiIndex: 3,
                totalIndex: 3,
                partialIndex: undefined,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "",
                combiIndex: 4,
                totalIndex: 4,
                partialIndex: undefined,
                locked: false,
                url: "",
                releaseDate: now
            }])
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
        contents.should.deep.equal([{
            title: "I am HitchCock",
            combiIndex: 1,
            totalIndex: 1,
            partialIndex: undefined,
            locked: false,
            url: "",
            releaseDate: now
        },
            {
                title: "I am HitchCock1",
                combiIndex: 2,
                totalIndex: 2,
                partialIndex: undefined,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am HitchCock2",
                combiIndex: 3,
                totalIndex: 3,
                partialIndex: undefined,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am HitchCock3",
                combiIndex: 4,
                totalIndex: 4,
                partialIndex: undefined,
                locked: false,
                url: "",
                releaseDate: now
            }])
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
        contents.should.deep.equal([
            {
                title: "I am HitchCock",
                combiIndex: 1,
                totalIndex: 1,
                partialIndex: undefined,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am HitchCock1",
                combiIndex: 2,
                totalIndex: 2,
                partialIndex: undefined,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am HitchCock1",
                combiIndex: 2.5,
                totalIndex: 2,
                partialIndex: 5,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am HitchCock2",
                combiIndex: 3,
                totalIndex: 3,
                partialIndex: undefined,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am HitchCock3",
                combiIndex: 4.1,
                totalIndex: 4,
                partialIndex: 1,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am HitchCock3",
                combiIndex: 4.2,
                totalIndex: 4,
                partialIndex: 2,
                locked: false,
                url: "",
                releaseDate: now
            }
        ])
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
        contents.should.deep.equal([
            {
                title: "I am HitchCock",
                combiIndex: 1,
                totalIndex: 1,
                partialIndex: undefined,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am HitchCock1",
                combiIndex: 2,
                totalIndex: 2,
                partialIndex: undefined,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am HitchCock1",
                combiIndex: 2.5,
                totalIndex: 2,
                partialIndex: 5,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am HitchCock2",
                combiIndex: 3,
                totalIndex: 3,
                partialIndex: undefined,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am HitchCock3",
                combiIndex: 4.1,
                totalIndex: 4,
                partialIndex: 1,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am HitchCock3",
                combiIndex: 4.2,
                totalIndex: 4,
                partialIndex: 2,
                locked: false,
                url: "",
                releaseDate: now
            }
        ])
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
        contents.should.deep.equal([
            {
                title: "I am HitchCock",
                combiIndex: 1,
                totalIndex: 1,
                partialIndex: undefined,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am HitchCock1",
                combiIndex: 2,
                totalIndex: 2,
                partialIndex: undefined,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am HitchCock1",
                combiIndex: 2.5,
                totalIndex: 2,
                partialIndex: 5,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am HitchCock1",
                combiIndex: 3,
                totalIndex: 3,
                partialIndex: undefined,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am HitchCock2",
                combiIndex: 4,
                totalIndex: 4,
                partialIndex: undefined,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am HitchCock3",
                combiIndex: 5.1,
                totalIndex: 5,
                partialIndex: 1,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am HitchCock3",
                combiIndex: 5.2,
                totalIndex: 5,
                partialIndex: 2,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am HitchCock1",
                combiIndex: 100,
                totalIndex: 100,
                partialIndex: undefined,
                locked: false,
                url: "",
                releaseDate: now
            }
        ])
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
        contents.should.deep.equal([
            {
                title: "",
                combiIndex: 1,
                totalIndex: 1,
                partialIndex: undefined,
                episodes: [
                    {
                        title: "I am HitchCock",
                        combiIndex: 1,
                        totalIndex: 1,
                        partialIndex: undefined,
                        locked: false,
                        url: "",
                        releaseDate: now
                    },
                    {
                        title: "I am HitchCock1",
                        combiIndex: 2,
                        totalIndex: 2,
                        partialIndex: undefined,
                        locked: false,
                        url: "",
                        releaseDate: now
                    }
                ]
            },
            {
                title: "",
                combiIndex: 2,
                totalIndex: 2,
                partialIndex: undefined,
                episodes: [
                    {
                        title: "I am HitchCock2",
                        combiIndex: 3,
                        totalIndex: 3,
                        partialIndex: undefined,
                        locked: false,
                        url: "",
                        releaseDate: now
                    },
                    {
                        title: "I am HitchCock3",
                        combiIndex: 4,
                        totalIndex: 4,
                        partialIndex: undefined,
                        locked: false,
                        url: "",
                        releaseDate: now
                    }
                ]
            },
        ])
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
        contents.should.deep.equal([
            {
                title: "",
                combiIndex: 1,
                totalIndex: 1,
                partialIndex: undefined,
                episodes: [
                    {
                        title: "I am HitchCock",
                        combiIndex: 1,
                        totalIndex: 1,
                        partialIndex: undefined,
                        locked: false,
                        url: "",
                        releaseDate: now
                    },
                    {
                        title: "I am HitchCock1",
                        combiIndex: 2,
                        totalIndex: 2,
                        partialIndex: undefined,
                        locked: false,
                        url: "",
                        releaseDate: now
                    }
                ]
            },
            {
                title: "",
                combiIndex: 2,
                totalIndex: 2,
                partialIndex: undefined,
                episodes: [
                    {
                        title: "I am HitchCock2",
                        combiIndex: 3,
                        totalIndex: 3,
                        partialIndex: undefined,
                        locked: false,
                        url: "",
                        releaseDate: now
                    },
                    {
                        title: "I am HitchCock3",
                        combiIndex: 4,
                        totalIndex: 4,
                        partialIndex: undefined,
                        locked: false,
                        url: "",
                        releaseDate: now
                    }
                ]
            },
        ])
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
        contents.should.deep.equal([
            {
                title: "I am a title1",
                combiIndex: 1,
                totalIndex: 1,
                partialIndex: undefined,
                episodes: [
                    {
                        title: "I am HitchCock",
                        combiIndex: 1,
                        totalIndex: 1,
                        partialIndex: undefined,
                        locked: false,
                        url: "",
                        releaseDate: now
                    },
                    {
                        title: "I am HitchCock1",
                        combiIndex: 2,
                        totalIndex: 2,
                        partialIndex: undefined,
                        locked: false,
                        url: "",
                        releaseDate: now
                    }
                ]
            },
            {
                title: "I am a title2",
                combiIndex: 2,
                totalIndex: 2,
                partialIndex: undefined,
                episodes: [
                    {
                        title: "I am HitchCock2",
                        combiIndex: 3,
                        totalIndex: 3,
                        partialIndex: undefined,
                        locked: false,
                        url: "",
                        releaseDate: now
                    },
                    {
                        title: "I am HitchCock3",
                        combiIndex: 4,
                        totalIndex: 4,
                        partialIndex: undefined,
                        locked: false,
                        url: "",
                        releaseDate: now
                    }
                ]
            },
        ])
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
        contents.should.deep.equal([
            {
                title: "I am a title1",
                combiIndex: 1,
                totalIndex: 1,
                partialIndex: undefined,
                episodes: [
                    {
                        title: "I am HitchCock",
                        combiIndex: 1,
                        totalIndex: 1,
                        partialIndex: undefined,
                        locked: false,
                        url: "",
                        releaseDate: now
                    },
                    {
                        title: "I am HitchCock1",
                        combiIndex: 2,
                        totalIndex: 2,
                        partialIndex: undefined,
                        locked: false,
                        url: "",
                        releaseDate: now
                    }
                ]
            },
            {
                title: "I am a title2",
                combiIndex: 2,
                totalIndex: 2,
                partialIndex: undefined,
                episodes: [
                    {
                        title: "I am HitchCock2",
                        combiIndex: 3,
                        totalIndex: 3,
                        partialIndex: undefined,
                        locked: false,
                        url: "",
                        releaseDate: now
                    },
                    {
                        title: "I am HitchCock3",
                        combiIndex: 4,
                        totalIndex: 4,
                        partialIndex: undefined,
                        locked: false,
                        url: "",
                        releaseDate: now
                    }
                ]
            },
        ])
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
        contents.should.deep.equal([
            {
                title: "",
                combiIndex: 54,
                totalIndex: 54,
                partialIndex: undefined,
                episodes: [
                    {
                        title: "All That Labor Work",
                        combiIndex: 3.3,
                        totalIndex: 3,
                        partialIndex: 3,
                        locked: false,
                        url: "",
                        releaseDate: now
                    },
                    {
                        title: "Plan of Annihilation",
                        combiIndex: 4.1,
                        totalIndex: 4,
                        partialIndex: 1,
                        locked: false,
                        url: "",
                        releaseDate: now
                    },
                    {
                        title: "Plan of Annihilation",
                        combiIndex: 4.2,
                        totalIndex: 4,
                        partialIndex: 2,
                        locked: false,
                        url: "",
                        releaseDate: now
                    },
                    {
                        title: "Plan of Annihilation",
                        combiIndex: 4.3,
                        totalIndex: 4,
                        partialIndex: 3,
                        locked: false,
                        url: "",
                        releaseDate: now
                    },
                ]
            }
        ])
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
        contents.should.deep.equal([
            {
                title: "",
                combiIndex: 54,
                totalIndex: 54,
                partialIndex: undefined,
                episodes: [
                    {
                        title: "All That Labor Work",
                        combiIndex: 586,
                        totalIndex: 586,
                        partialIndex: undefined,
                        locked: false,
                        url: "",
                        releaseDate: now
                    },
                    {
                        title: "Plan of Annihilation",
                        combiIndex: 587,
                        totalIndex: 587,
                        partialIndex: undefined,
                        locked: false,
                        url: "",
                        releaseDate: now
                    },
                    {
                        title: "Plan of Annihilation",
                        combiIndex: 588,
                        totalIndex: 588,
                        partialIndex: undefined,
                        locked: false,
                        url: "",
                        releaseDate: now
                    },
                    {
                        title: "Plan of Annihilation",
                        combiIndex: 589,
                        totalIndex: 589,
                        partialIndex: undefined,
                        locked: false,
                        url: "",
                        releaseDate: now
                    },
                ]
            }
        ])
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
        contents.should.deep.equal([
            {
                title: "",
                combiIndex: 54,
                totalIndex: 54,
                partialIndex: undefined,
                episodes: [
                    {
                        title: "All That Labor Work",
                        combiIndex: 586,
                        totalIndex: 586,
                        partialIndex: undefined,
                        locked: false,
                        url: "",
                        releaseDate: now
                    },
                    {
                        title: "Plan of Annihilation",
                        combiIndex: 587,
                        totalIndex: 587,
                        partialIndex: undefined,
                        locked: false,
                        url: "",
                        releaseDate: now
                    },
                    {
                        title: "Plan of Annihilation",
                        combiIndex: 588,
                        totalIndex: 588,
                        partialIndex: undefined,
                        locked: false,
                        url: "",
                        releaseDate: now
                    },
                    {
                        title: "Plan of Annihilation",
                        combiIndex: 589,
                        totalIndex: 589,
                        partialIndex: undefined,
                        locked: false,
                        url: "",
                        releaseDate: now
                    },
                ]
            }
        ])
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
        contents.should.deep.equal([
            {
                title: "",
                combiIndex: 1,
                totalIndex: 1,
                partialIndex: undefined,
                episodes: [
                    {
                        title: "All That Labor Work",
                        combiIndex: 586,
                        totalIndex: 586,
                        partialIndex: undefined,
                        locked: false,
                        url: "",
                        releaseDate: now
                    },
                    {
                        title: "Plan of Annihilation",
                        combiIndex: 587,
                        totalIndex: 587,
                        partialIndex: undefined,
                        locked: false,
                        url: "",
                        releaseDate: now
                    },
                ]
            },
            {
                title: "",
                combiIndex: 2,
                totalIndex: 2,
                partialIndex: undefined,
                episodes: [
                    {
                        title: "Plan of Annihilation",
                        combiIndex: 588,
                        totalIndex: 588,
                        partialIndex: undefined,
                        locked: false,
                        url: "",
                        releaseDate: now
                    },
                    {
                        title: "Plan of Annihilation",
                        combiIndex: 589,
                        totalIndex: 589,
                        partialIndex: undefined,
                        locked: false,
                        url: "",
                        releaseDate: now
                    },
                ]
            }
        ])
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
        contents.should.deep.equal([
            {
                title: "I am HitchCock",
                combiIndex: 1,
                totalIndex: 1,
                partialIndex: undefined,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am HitchCock1",
                combiIndex: 2.1,
                totalIndex: 2,
                partialIndex: 1,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am HitchCock1",
                combiIndex: 2.2,
                totalIndex: 2,
                partialIndex: 2,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am HitchCock2",
                combiIndex: 3,
                totalIndex: 3,
                partialIndex: undefined,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am HitchCock3",
                combiIndex: 4.1,
                totalIndex: 4,
                partialIndex: 1,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am HitchCock3",
                combiIndex: 4.2,
                totalIndex: 4,
                partialIndex: 2,
                locked: false,
                url: "",
                releaseDate: now
            }
        ])
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
        contents.should.deep.equal([
            {
                title: "I am a Intermission1",
                combiIndex: 0.1,
                totalIndex: 0,
                partialIndex: 1,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am a Intermission2",
                combiIndex: 0.2,
                totalIndex: 0,
                partialIndex: 2,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am a Intermission3",
                combiIndex: 0.3,
                totalIndex: 0,
                partialIndex: 3,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am a Intermission4",
                combiIndex: 0.4,
                totalIndex: 0,
                partialIndex: 4,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am HitchCock1",
                combiIndex: 1,
                totalIndex: 1,
                partialIndex: undefined,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am HitchCock1",
                combiIndex: 2.2,
                totalIndex: 2,
                partialIndex: 2,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am HitchCock2",
                combiIndex: 3,
                totalIndex: 3,
                partialIndex: undefined,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am HitchCock3",
                combiIndex: 4.2,
                totalIndex: 4,
                partialIndex: 2,
                locked: false,
                url: "",
                releaseDate: now
            }
        ])
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
        contents.should.deep.equal([
            {
                title: "I am a Intermission1",
                combiIndex: 0.1,
                totalIndex: 0,
                partialIndex: 1,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am a Intermission2",
                combiIndex: 0.2,
                totalIndex: 0,
                partialIndex: 2,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am HitchCock1",
                combiIndex: 1,
                totalIndex: 1,
                partialIndex: undefined,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am HitchCock1",
                combiIndex: 2.2,
                totalIndex: 2,
                partialIndex: 2,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am HitchCock2",
                combiIndex: 3,
                totalIndex: 3,
                partialIndex: undefined,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am HitchCock3",
                combiIndex: 4.2,
                totalIndex: 4,
                partialIndex: 2,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am a Intermission3",
                combiIndex: 4.3,
                totalIndex: 4,
                partialIndex: 3,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am a Intermission4",
                combiIndex: 4.4,
                totalIndex: 4,
                partialIndex: 4,
                locked: false,
                url: "",
                releaseDate: now
            },
        ])
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
        contents.should.deep.equal([
            {
                title: "I am HitchCock3",
                combiIndex: 4.2,
                totalIndex: 4,
                partialIndex: 2,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am HitchCock2",
                combiIndex: 3,
                totalIndex: 3,
                partialIndex: undefined,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am HitchCock1",
                combiIndex: 2.2,
                totalIndex: 2,
                partialIndex: 2,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am HitchCock1",
                combiIndex: 1,
                totalIndex: 1,
                partialIndex: undefined,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am a Intermission4",
                combiIndex: 0.4,
                totalIndex: 0,
                partialIndex: 4,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am a Intermission3",
                combiIndex: 0.3,
                totalIndex: 0,
                partialIndex: 3,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am a Intermission2",
                combiIndex: 0.2,
                totalIndex: 0,
                partialIndex: 2,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am a Intermission1",
                combiIndex: 0.1,
                totalIndex: 0,
                partialIndex: 1,
                locked: false,
                url: "",
                releaseDate: now
            },
        ])
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
        contents.should.deep.equal([
            {
                title: "I am a Intermission4",
                combiIndex: 4.4,
                totalIndex: 4,
                partialIndex: 4,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am a Intermission3",
                combiIndex: 4.3,
                totalIndex: 4,
                partialIndex: 3,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am HitchCock3",
                combiIndex: 4.2,
                totalIndex: 4,
                partialIndex: 2,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am HitchCock2",
                combiIndex: 3,
                totalIndex: 3,
                partialIndex: undefined,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am HitchCock1",
                combiIndex: 2.2,
                totalIndex: 2,
                partialIndex: 2,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am HitchCock1",
                combiIndex: 1,
                totalIndex: 1,
                partialIndex: undefined,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am a Intermission2",
                combiIndex: 0.2,
                totalIndex: 0,
                partialIndex: 2,
                locked: false,
                url: "",
                releaseDate: now
            },
            {
                title: "I am a Intermission1",
                combiIndex: 0.1,
                totalIndex: 0,
                partialIndex: 1,
                locked: false,
                url: "",
                releaseDate: now
            },
        ])
    });
});
