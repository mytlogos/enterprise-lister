"use strict";
const sinon = require("sinon");
const sinon_chai = require("sinon-chai");
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const directTools = require("../../../server/dist/externals/direct/directTools");

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
            yield {url: "", title: "c4 -  I am HitchCock3 Part 1", releaseDate: now};
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
});
