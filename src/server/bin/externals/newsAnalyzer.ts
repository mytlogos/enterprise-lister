import cheerio from "cheerio";
import {queueRequest} from "./queueManager";
import { EmptyPromise } from "../types";

async function loadBody(link: string): Promise<string> {
    return queueRequest(link);
}

export const analyze = async ({link, body}: { link?: string; body?: string }): EmptyPromise => {
    if (link) {
        body = await loadBody(link);
    }
    if (!body) {
        return;
    }
    const $ = cheerio.load(body);
};
