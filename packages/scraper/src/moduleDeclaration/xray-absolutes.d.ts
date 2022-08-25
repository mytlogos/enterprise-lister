declare module "x-ray/lib/absolutes" {
  import { CheerioAPI } from "cheerio";

  export default function absolute(path: string, $: CheerioAPI): CheerioAPI;
}
