import { SimpleExternalUser } from "enterprise-core/dist/database/databaseTypes";
import { externalUserStorage } from "enterprise-core/dist/database/storages/storage";
import { JobRequest, ScrapeName } from "enterprise-core/dist/types";
import { factory } from "../externals/listManager";

export async function queueExternalUser(): Promise<readonly JobRequest[]> {
  // eslint-disable-next-line prefer-rest-params
  console.log("queueing all external user", arguments);
  const externalUser = await externalUserStorage.getScrapeExternalUser();

  const promises: Array<Promise<[boolean, SimpleExternalUser]>> = [];
  for (const user of externalUser) {
    const listManager = factory(user.type, user.cookies == null ? undefined : user.cookies);
    promises.push(
      listManager.test(user.identifier).then((value: boolean) => {
        user.cookies = listManager.stringifyCookies();
        return [value, user];
      }),
    );
  }
  const results: Array<[boolean, SimpleExternalUser]> = await Promise.all(promises);

  return results
    .filter((value) => value[0])
    .map((value) => value[1])
    .map((value): JobRequest => {
      return {
        type: ScrapeName.oneTimeUser,
        interval: -1,
        deleteAfterRun: true,
        runImmediately: true,
        name: `${ScrapeName.oneTimeUser}-${value.uuid}`,
        arguments: JSON.stringify({
          uuid: value.uuid,
          info: value.cookies,
        }),
      };
    });
}
