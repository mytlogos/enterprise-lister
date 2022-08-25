import { Id } from "enterprise-core/dist/types";
import { defineStore } from "pinia";
import { notificationEnabled, notify } from "../notifications";
import { useReleaseStore } from "./releases";

let intervalId: ReturnType<typeof setInterval> | undefined;

export const useSettingsStore = defineStore("settings", {
  persist: true,
  state: () => ({
    notifications: {
      newReleases: {
        enabled: false,
        push: false,
        allMedia: false,
        media: [] as Id[],
        alreadyNotified: [] as string[],
      },
      push: false,
    },
  }),
  actions: {
    activateNewReleases() {
      if (intervalId) {
        return;
      }
      let lastCheck = Date.now();
      const interval = 60000;
      const releaseStore = useReleaseStore();

      intervalId = setInterval(async () => {
        if (!this.notifications.newReleases.enabled || !this.notifications.newReleases.push || !notificationEnabled()) {
          console.info("ignoring checking for new releases");
          return;
        }

        const start = Date.now();
        await releaseStore.loadDisplayReleases(false);

        // add the time the request itself has taken?
        const allowedDifference = interval + (Date.now() - start);

        // if there are not media to be listened for, skip filtering
        if (!this.notifications.newReleases.allMedia && !this.notifications.newReleases.media.length) {
          console.info("ignoring checking for new releases: nothing to check for");
          return;
        }

        const releasestoNotify = releaseStore.releases.filter(
          (release) =>
            (this.notifications.newReleases.allMedia ||
              this.notifications.newReleases.media.includes(release.mediumId)) &&
            lastCheck - release.time <= allowedDifference &&
            // notify only once
            !this.notifications.newReleases.alreadyNotified.includes(release.key),
        );

        // TODO: clear this.notifications.newReleases.alreadyNotified sometimes
        releasestoNotify.forEach((value) => this.notifications.newReleases.alreadyNotified.push(value.key));

        if (releasestoNotify.length < 2) {
          releasestoNotify.forEach((release) => {
            notify({ title: "New Release for " + release.mediumTitle, content: release.title });
          });
        } else {
          const release = releasestoNotify[0];
          const uniqueMedia = new Set(releasestoNotify.map((item) => item.mediumId)).size;

          notify({
            title: releasestoNotify.length + " new Releases",
            content: release.mediumTitle + " and " + (uniqueMedia - 1) + " other titles",
          });
        }
        console.info("notified for %d new releases", releasestoNotify.length);
        lastCheck = Date.now();
      }, interval);
    },

    deactivateNewReleases() {
      if (!intervalId || this.notifications.newReleases.enabled) {
        return;
      }
      clearInterval(intervalId);
      intervalId = undefined;
    },
  },
});
