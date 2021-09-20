"use strict";
jest.mock("request-promise-native");

import fs from "fs";
import cheerio from "cheerio";
import * as tools from "enterprise-core/dist/tools";
import { getHook } from "../../../externals/direct/boxNovelScraper";
import * as externalErrors from "../../../externals/errors";
import * as storage from "enterprise-core/dist/database/storages/storage";
import * as queueManager from "../../../externals/queueManager";
import * as scraperTestTools from "./scraperTestTools";
import { Hook } from "../../../externals/types";

const MediaType = tools.MediaType;
const UrlError = externalErrors.UrlError;
const MissingResourceError = externalErrors.MissingResourceError;

/**
 * Make specific properties in T required
 */
type Require<T, K extends keyof T> = T &
  {
    [P in K]-?: T[P];
  };

const boxNovelHook = getHook() as Require<Hook, "tocAdapter">;

afterAll(() => {
  tools.internetTester.stop();
  return storage.stopStorage();
});

it("should be valid hook object", () => {
  expect(boxNovelHook.tocAdapter).toBeDefined();
  expect(typeof boxNovelHook.name).toBe("string");
  expect(boxNovelHook).toHaveProperty("medium", MediaType.TEXT);
  expect(boxNovelHook.domainReg).toBeInstanceOf(RegExp);
});

describe.skip("testing boxNovel Hook toc", () => {
  const hookMocks = [] as jest.SpyInstance[];

  beforeAll(() => {
    hookMocks.push(
      jest.spyOn(queueManager, "queueCheerioRequest").mockImplementation((args) => {
        let path;
        if (args === "https://boxnovel.com/novel/i-am-a-missing-resource") {
          path = "./tests/resources/missingResources/boxnovel.html";
        } else if (args === "https://boxnovel.com/novel/demon-noble-girl-story-of-a-careless-demon/") {
          path = "./tests/resources/boxnovel-281.html";
        } else if (args === "https://boxnovel.com/novel/my-master-disconnected-yet-again/") {
          path = "./tests/resources/boxnovel-237.html";
        } else if (args === "https://boxnovel.com/novel/the-man-picked-up-by-the-gods-reboot/") {
          path = "./tests/resources/boxnovel-173.html";
        } else {
          return Promise.reject(new Error("unknown url"));
        }
        return fs.promises.readFile(path, "utf8").then((value) => cheerio.load(value));
      }),
    );
  });

  afterAll(() => {
    hookMocks.forEach((value) => value.mockRestore());
  });

  it("should throw UrlError", async () => {
    await expect(boxNovelHook.tocAdapter("https://google.de")).rejects.toBeInstanceOf(UrlError);
    await expect(boxNovelHook.tocAdapter("ftp://google.de")).rejects.toBeInstanceOf(UrlError);
    await expect(boxNovelHook.tocAdapter("google.de")).rejects.toBeInstanceOf(UrlError);
    await expect(boxNovelHook.tocAdapter("www.boxnovel.de")).rejects.toBeInstanceOf(UrlError);
    await expect(boxNovelHook.tocAdapter("http://www.boxnovel.de")).rejects.toBeInstanceOf(UrlError);
    await expect(boxNovelHook.tocAdapter("https://www.boxnovel.de")).rejects.toBeInstanceOf(UrlError);
    await expect(boxNovelHook.tocAdapter("https://boxnovel.de")).rejects.toBeInstanceOf(UrlError);
    await expect(boxNovelHook.tocAdapter("www.boxnovel.com")).rejects.toBeInstanceOf(UrlError);
    await expect(boxNovelHook.tocAdapter("sftp://www.boxnovel.com")).rejects.toBeInstanceOf(UrlError);
    await expect(boxNovelHook.tocAdapter("https://www.boxnovel.com/")).rejects.toBeInstanceOf(UrlError);
    await expect(boxNovelHook.tocAdapter("https://www.boxnovel.com/novel")).rejects.toBeInstanceOf(UrlError);
  });

  it("should throw MissingResourceError", () => {
    return expect(boxNovelHook.tocAdapter("https://boxnovel.com/novel/i-am-a-missing-resource")).rejects.toBeInstanceOf(
      MissingResourceError,
    );
  });
  it("should parse correct ToCs", async () => {
    // boxnovel-281.html
    const demonTocs = await boxNovelHook.tocAdapter(
      "https://boxnovel.com/novel/demon-noble-girl-story-of-a-careless-demon/",
    );
    expect(demonTocs).toBeInstanceOf(Array);
    expect(demonTocs).toHaveLength(1);
    scraperTestTools.testGeneralToc(demonTocs[0]);

    // boxnovel-237.html
    const masterTocs = await boxNovelHook.tocAdapter("https://boxnovel.com/novel/my-master-disconnected-yet-again/");
    expect(masterTocs).toBeInstanceOf(Array);
    expect(masterTocs).toHaveLength(1);
    scraperTestTools.testGeneralToc(masterTocs[0]);

    // boxnovel-173.html
    const rebootTocs = await boxNovelHook.tocAdapter(
      "https://boxnovel.com/novel/the-man-picked-up-by-the-gods-reboot/",
    );
    expect(rebootTocs).toBeInstanceOf(Array);
    expect(rebootTocs).toHaveLength(1);
    scraperTestTools.testGeneralToc(rebootTocs[0]);
  });
});
