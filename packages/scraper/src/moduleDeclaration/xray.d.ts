import XRayCrawler from "x-ray-crawler";
import { CheerioAPI } from "cheerio";

declare module "x-ray" {
  interface Instance extends XRayCrawler.Instance {
    (source: string | CheerioAPI, selector: Selector): InstanceInvocation;
    (source: string | CheerioAPI, context: string, selector: Selector): InstanceInvocation;
    (context: string, selector: Selector): InstanceInvocation;
    (selector: Selector): InstanceInvocation;
  }
}
