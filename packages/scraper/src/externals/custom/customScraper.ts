import { Hook } from "../types";
import { createNewsScraper } from "./news";
import { createTocScraper } from "./toc";
import { HookConfig } from "./types";

export function createHook(config: HookConfig): Hook {
  return {
    medium: config.medium,
    name: config.name,
    newsAdapter: createNewsScraper(config),
    tocAdapter: createTocScraper(config),
  };
}
