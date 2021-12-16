import { HookConfig } from "enterprise-scraper/dist/externals/custom/types";

export interface HookTest {
  config: HookConfig;
  key: keyof HookConfig;
  param: string;
}
