import { readFileSync } from "fs";
import { join as joinPath } from "path";
import { getHooks } from "enterprise-scraper/dist/externals/hookManager";
import { getElseSet } from "enterprise-core/dist/tools";
import * as cheerio from "cheerio";

const path = joinPath(process.cwd(), "tests", "results", "Test Results - tests_mocha_hook_test_js.html");
const html = readFileSync(path, { encoding: "utf-8" });
const $ = cheerio.load(html);
const hooks = getHooks();

const suites = $(".level.suite");
const hookMap = new Map();

for (let i = 0; i < suites.length; i++) {
  const suite = suites.eq(i);
  const title = suite.children().first();
  const text = title.text();

  if (!text.includes("download")) {
    continue;
  }

  const hook = hooks.find((value) => text.includes(value.name));

  if (!hook) {
    console.log("no hook found for " + text);
    continue;
  }
  const failedLinks = getElseSet(hookMap, hook, () => []);
  const failedTests = suite.find(".level.test.failed");

  for (let j = 0; j < failedTests.length; j++) {
    const failedTest = failedTests.eq(j);
    const testTitleElement = failedTest.children().first();
    testTitleElement.find(".status, .time").remove();
    const url = testTitleElement.text();
    failedLinks.push(url);
  }
}
