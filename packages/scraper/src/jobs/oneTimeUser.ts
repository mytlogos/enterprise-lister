import { ignore } from "enterprise-core/dist/tools";
import { Uuid, EmptyPromise } from "enterprise-core/dist/types";
import { factory, ListType } from "../externals/listManager";
import { checkLink } from "../externals/scraperTools";
import { ExternalListResult } from "../externals/types";

/**
 * Scrapes ListWebsites and follows possible redirected pages.
 */
export const list = async (value: { info: string; uuid: Uuid }): Promise<ExternalListResult> => {
  // TODO: 10.03.2020 for now list scrape novelupdates only, later it should take listtype as an argument
  const manager = factory(ListType.NOVELUPDATES, value.info);
  try {
    const lists = await manager.scrapeLists();
    const listsPromise: EmptyPromise = Promise.all(
      lists.lists.map(async (scrapedList) => (scrapedList.link = await checkLink(scrapedList.link, scrapedList.name))),
    ).then(ignore);

    const feedLinksPromise: Promise<string[]> = Promise.all(lists.feed.map((feedLink) => checkLink(feedLink)));

    const mediaPromise = Promise.all(
      lists.media.map(async (medium) => {
        const titleLinkPromise: Promise<string> = checkLink(medium.title.link, medium.title.text);

        let currentLinkPromise: Promise<string> | null;
        if ("link" in medium.current && medium.current.link) {
          currentLinkPromise = checkLink(medium.current.link, medium.current.text);
        } else {
          currentLinkPromise = null;
        }
        let latestLinkPromise: Promise<string> | null;
        if ("link" in medium.latest && medium.latest.link) {
          latestLinkPromise = checkLink(medium.latest.link, medium.latest.text);
        } else {
          latestLinkPromise = null;
        }

        medium.title.link = await titleLinkPromise;
        if ("link" in medium.current && currentLinkPromise) {
          medium.current.link = await currentLinkPromise;
        }
        if ("link" in medium.latest && latestLinkPromise) {
          medium.latest.link = await latestLinkPromise;
        }
      }),
    ).then(ignore);

    await listsPromise;
    await mediaPromise;
    lists.feed = await feedLinksPromise;
    return {
      external: {
        type: ListType.NOVELUPDATES,
        // TODO: add useruuid here
        userUuid: "",
        cookies: value.info,
        uuid: value.uuid,
      },
      lists,
    };
  } catch (e) {
    // eslint-disable-next-line prefer-promise-reject-errors
    return Promise.reject({ ...value, error: e });
  }
};
