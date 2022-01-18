import * as cheerio from "cheerio";
import { EmptyPromise } from "enterprise-core/dist/types";
import request from "./request";

async function loadBody(link: string): Promise<string> {
  const response = await request.get({ url: link });
  return response.data;
}

export const analyze = async ({ link, body }: { link?: string; body?: string }): EmptyPromise => {
  if (link) {
    body = await loadBody(link);
  }
  if (!body) {
    return;
  }
  const $ = cheerio.load(body);
};
