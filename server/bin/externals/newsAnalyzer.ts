import request from "request-promise-native";
import cheerio from "cheerio";

async function loadBody(link: string): Promise<string> {
    return request.get(link);
}

export const analyze = async ({link, body}: { link?: string, body?: string }) => {
    if (link) {
        body = await loadBody(link);
    }
    if (!body) {
        return;
    }
    const $ = cheerio.load(body);
};
