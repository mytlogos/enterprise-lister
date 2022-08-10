import { ActionTree, MutationTree } from "vuex";
import { notificationEnabled, notify } from "../notifications";
import { SettingStore, VuexStore } from "../siteTypes";

export const state = (): SettingStore => ({
  notifications: {
    newReleases: {
      enabled: false,
      push: false,
      allMedia: false,
      media: [],
    },
    push: false,
  },
});

export const mutations: MutationTree<SettingStore> = {
  updateNotificationSettings(state, settings: SettingStore["notifications"]) {
    Object.assign(state.notifications, settings);
  },
};

let intervalId: ReturnType<typeof setInterval> | undefined;

export const actions: ActionTree<SettingStore, VuexStore> = {
  activateNewReleases({ dispatch, state, rootState }) {
    if (intervalId) {
      return;
    }
    let lastCheck = Date.now();
    const interval = 60000;

    intervalId = setInterval(async () => {
      if (!state.notifications.newReleases.enabled || !state.notifications.newReleases.push || !notificationEnabled()) {
        console.info("ignoring checking for new releases");
        return;
      }

      const start = Date.now();
      await dispatch("releases/loadDisplayReleases");

      // add the time the request itself has taken?
      const allowedDifference = interval + (Date.now() - start);

      // if there are not media to be listened for, skip filtering
      if (!state.notifications.newReleases.allMedia && !state.notifications.newReleases.media.length) {
        console.info("ignoring checking for new releases: nothing to check for");
        return;
      }

      const releasestoNotify = rootState.releases.releases.filter(
        (release) =>
          (state.notifications.newReleases.allMedia ||
            state.notifications.newReleases.media.includes(release.mediumId)) &&
          lastCheck - release.time <= allowedDifference,
      );

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

  deactivateNewReleases({ state }) {
    if (!intervalId || state.notifications.newReleases.enabled) {
      return;
    }
    clearInterval(intervalId);
    intervalId = undefined;
  },
};
