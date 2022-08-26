import { mediumStorage, storage } from "enterprise-core/dist/database/storages/storage";
import { EmptyPromise, JobRequest, MilliTime, ScrapeName } from "enterprise-core/dist/types";
import { TocRequest } from "../externals/types";

export const queueTocs = async (): EmptyPromise => {
  await storage.queueNewTocs();
};

export const queueTocsJob = async (): Promise<JobRequest[]> => {
  // TODO: 02.09.2019 a perfect candidate to use stream on
  const tocs = await mediumStorage.getAllTocs();
  return tocs.map((value): JobRequest => {
    const tocRequest: TocRequest = { mediumId: value.mediumId, url: value.link };
    return {
      runImmediately: true,
      arguments: JSON.stringify(tocRequest),
      type: ScrapeName.toc,
      name: `${ScrapeName.toc}-${value.mediumId}-${value.link}`,
      interval: MilliTime.HOUR,
      deleteAfterRun: false,
    };
  });
};
