import { mediumInWaitStorage } from "enterprise-core/dist/database/storages/storage";

export async function removeUsedMediaInWaits() {
  await mediumInWaitStorage.deleteUsedMediumInWait();
}
