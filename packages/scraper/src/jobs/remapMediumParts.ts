import { mediumStorage, partStorage, episodeStorage } from "enterprise-core/dist/database/storages/storage";
import { EmptyPromise } from "enterprise-core/dist/types";

export async function remapMediaParts(): EmptyPromise {
  const mediaIds = await mediumStorage.getAllMedia();
  await Promise.all(mediaIds.map((mediumId) => remapMediumPart(mediumId)));
}

export async function remapMediumPart(mediumId: number): EmptyPromise {
  const parts = await partStorage.getMediumPartIds(mediumId);

  const standardPartId = await partStorage.getStandardPartId(mediumId);

  // if there is no standard part, we return as there is no part to move from
  if (!standardPartId) {
    await partStorage.createStandardPart(mediumId);
    return;
  }
  const nonStandardPartIds = parts.filter((value) => value !== standardPartId);
  const overLappingParts = await partStorage.getOverLappingParts(standardPartId, nonStandardPartIds);

  const promises = [];
  for (const overLappingPart of overLappingParts) {
    promises.push(episodeStorage.moveEpisodeToPart(standardPartId, overLappingPart));
  }
  await Promise.all(promises);
}
