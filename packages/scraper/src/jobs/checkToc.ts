import { mediumStorage, episodeStorage } from "enterprise-core/dist/database/storages/storage";
import logger from "enterprise-core/dist/logger";
import { getElseSet, hasMediaType, maxValue } from "enterprise-core/dist/tools";
import { TocSearchMedium, JobRequest, ScrapeName, Optional } from "enterprise-core/dist/types";
import { tocScraperEntries, tocDiscoveryEntries, getHooks } from "../externals/hookManager";

export const checkTocsJob = async (): Promise<JobRequest[]> => {
  const mediaTocs = await mediumStorage.getAllMediaTocs();
  const tocSearchMedia = await mediumStorage.getTocSearchMedia();
  const mediaWithTocs: Map<number, string[]> = new Map();

  const mediaWithoutTocs = mediaTocs
    .filter((value) => {
      if (value.link) {
        const links = getElseSet(mediaWithTocs, value.id, () => []);
        links.push(value.link);
        return false;
      }
      return true;
    })
    .map((value) => value.id);

  const newJobs1: JobRequest[] = mediaWithoutTocs
    .map((id) => {
      return searchTocJob(
        id,
        tocSearchMedia.find((value) => value.mediumId === id),
      );
    })
    .flat(2);

  const hooks = getHooks();
  const promises = [...mediaWithTocs.entries()]
    .map(async (value) => {
      const mediumId = value[0];
      const indices = await episodeStorage.getChapterIndices(mediumId);

      const maxIndex = maxValue(indices);
      const mediumTocs = value[1];
      if (!maxIndex || indices.length < maxIndex) {
        return searchTocJob(
          mediumId,
          tocSearchMedia.find((searchMedium) => searchMedium.mediumId === mediumId),
          mediumTocs,
        );
      }
      let missingChapters;
      for (let i = 1; i < maxIndex; i++) {
        if (!indices.includes(i)) {
          missingChapters = true;
          break;
        }
      }
      if (missingChapters) {
        return searchTocJob(
          mediumId,
          tocSearchMedia.find((searchMedium) => searchMedium.mediumId === mediumId),
          mediumTocs,
        );
      }
      if (mediumTocs.some((mediumToc) => hooks.every((hook) => !hook.domainReg || !hook.domainReg.test(mediumToc)))) {
        return searchTocJob(
          mediumId,
          tocSearchMedia.find((searchMedium) => searchMedium.mediumId === mediumId),
          mediumTocs,
        );
      }
    })
    .flat(2);
  const newJobs2: Array<Optional<JobRequest[]>> = await Promise.all(promises);
  return (
    [newJobs1, newJobs2]
      // flaten to one dimensional array
      .flat(3)
      // filter undefined values
      .filter((value) => value) as JobRequest[]
  );
};

function searchTocJob(id: number, tocSearch?: TocSearchMedium, availableTocs?: string[]): JobRequest[] {
  const consumed: RegExp[] = [];

  if (availableTocs) {
    for (const availableToc of availableTocs) {
      for (const entry of tocScraperEntries()) {
        const [reg] = entry;

        if (!consumed.includes(reg) && reg.test(availableToc)) {
          consumed.push(reg);
          break;
        }
      }
    }
  }

  const searchJobs: JobRequest[] = [];
  if (tocSearch) {
    for (const entry of tocDiscoveryEntries()) {
      const [reg, searcher] = entry;
      let searchFound = false;

      if (tocSearch.hosts) {
        for (const link of tocSearch.hosts) {
          if (!consumed.includes(reg) && reg.test(link)) {
            searchFound = true;
            consumed.push(reg);
            break;
          }
        }
      }
      if (!searchFound && (!hasMediaType(searcher.medium, tocSearch.medium) || !searcher.blindSearch)) {
        continue;
      }
      searchJobs.push({
        name: `${searcher.hookName || ""}-${ScrapeName.searchForToc}-${tocSearch.mediumId}`,
        interval: -1,
        arguments: JSON.stringify([searcher.hookName, tocSearch]),
        type: ScrapeName.searchForToc,
        deleteAfterRun: true,
        runImmediately: false,
      });
    }
  }
  if (!searchJobs.length) {
    logger.info("did not find any tocdiscoveries", { medium_id: id, search: JSON.stringify(tocSearch) });
    return [];
  }
  for (let i = 0; i < searchJobs.length; i++) {
    const job = searchJobs[i];

    if (i === 0) {
      job.runImmediately = true;
      continue;
    }
    job.runAfter = searchJobs[i - 1];
  }
  return searchJobs;
}
