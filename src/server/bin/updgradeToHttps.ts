import * as storage from "./database/storages/storage";
import { EpisodeRelease, JobItem, JobRequest, JobState, ScrapeName, MediumToc } from "./types";

async function updateReleaseProtocol(domainReg: RegExp, toc: MediumToc, values: MediumToc[]) {
  const domainMatch = domainReg.exec(toc.link);
  if (!domainMatch) {
    console.log(`could not match domain for '${toc.link}'`);
    return;
  }
  const domain = domainMatch[1];
  const id = toc.mediumId;
  let differentIds = false;
  for (const value of values) {
    if (value.mediumId !== id) {
      differentIds = true;
      break;
    }
  }
  if (differentIds) {
    console.log("tocs with same link but different media: " + JSON.stringify(values));
    return;
  }
  const partIds = await storage.partStorage.getMediumParts(id);
  const episodeIds: number[] = partIds.flatMap((value) => value.episodes as number[]);
  const mediumReleases = await storage.episodeStorage.getReleases(episodeIds);

  const episodeMap: Map<number, EpisodeRelease[]> = new Map();
  for (const release of mediumReleases) {
    const releaseDomainMatch = domainReg.exec(release.url);
    if (!releaseDomainMatch) {
      console.log("could not match domain for release: " + JSON.stringify(release));
      continue;
    }
    const releaseDomain = releaseDomainMatch[1];

    if (domain === releaseDomain) {
      if (!episodeMap.has(release.episodeId)) {
        episodeMap.set(release.episodeId, []);
      }
      const links = episodeMap.get(release.episodeId) as EpisodeRelease[];
      links.push(release);
    }
  }
  const deleteReleases = [];
  const updateToHttpsReleases = [];

  for (const [, releases] of episodeMap.entries()) {
    if (releases.length > 1) {
      let hasHttps = false;
      const nonHttpsReleases = [];
      for (const release of releases) {
        if (release.url.startsWith("https://")) {
          hasHttps = true;
        } else {
          nonHttpsReleases.push(release);
        }
      }
      if (!hasHttps) {
        console.log("multiple releases for same episode and domain but no https");
      }
      for (const nonHttpsRelease of nonHttpsReleases) {
        deleteReleases.push(nonHttpsRelease);
      }
    } else {
      const release = releases[0];
      if (release.url.startsWith("http://")) {
        updateToHttpsReleases.push({
          ...release,
          url: release.url.replace("http", "https"),
        });
      }
    }
  }
  return { delete: deleteReleases, update: updateToHttpsReleases };
}

async function updateHttps(): Promise<Change> {
  const httpsOnly = ["http://novelfull.com"];
  const jobItems = await storage.jobStorage.getJobsInState(JobState.WAITING);
  jobItems.push(...(await storage.jobStorage.getJobsInState(JobState.RUNNING)));
  const allTocs: MediumToc[] = await storage.mediumStorage.getAllTocs();

  const tocMap: Map<string, MediumToc[]> = new Map();
  const regExp = /https?:\/\/(.+)/;
  const domainReg = /https?:\/\/(.+?)(\/|$)/;

  const removeJobs: JobItem[] = [];
  const addJobs: JobItem[] = [];
  const addReleases: EpisodeRelease[] = [];
  const removeReleases: EpisodeRelease[] = [];
  const removeTocs: MediumToc[] = [];
  const addTocs: MediumToc[] = [];

  for (const toc of allTocs) {
    const match = regExp.exec(toc.link);
    if (!match) {
      console.log("unexpectedly no valid toc: " + JSON.stringify(toc));
      continue;
    }
    let tocs = tocMap.get(match[1]);
    if (!tocs) {
      tocs = [];
      tocMap.set(match[1], tocs);
    }
    tocs.push(toc);
  }
  for (const [, values] of tocMap.entries()) {
    if (values.length > 1) {
      const httpsToc = values.find((value) => value.link.startsWith("https"));
      if (httpsToc) {
        const nonHttpsTocs = values.filter((value) => !value.link.startsWith("https"));
        const deleteJobs = [];

        for (const nonHttpsToc of nonHttpsTocs) {
          for (const jobItem of jobItems) {
            if (jobItem.name.includes(nonHttpsToc.link)) {
              deleteJobs.push(jobItem);
            }
          }
        }
        const httpsJobs = [];
        for (const jobItem of jobItems) {
          if (jobItem.name.includes(httpsToc.link)) {
            httpsJobs.push(jobItem);
          }
        }
        const newJobs = [];

        for (const deleteJob of deleteJobs) {
          let hasSameJobType = false;
          for (const job of httpsJobs) {
            if (job.type === deleteJob.type) {
              hasSameJobType = true;
              break;
            }
          }
          if (!hasSameJobType) {
            for (const job of newJobs) {
              if (job.type === deleteJob.type) {
                hasSameJobType = true;
                break;
              }
            }
          }
          if (hasSameJobType) {
            continue;
          }
          const httpsJob = { ...deleteJob };
          httpsJob.name = httpsJob.name.replace("http", "https");
          if (httpsJob.arguments) {
            httpsJob.arguments = httpsJob.arguments.replace(/http:/g, "https:");
          }
          newJobs.push(httpsJob);
        }
        removeJobs.push(...deleteJobs);
        addJobs.push(...newJobs);
        removeTocs.push(...nonHttpsTocs);

        const changes = await updateReleaseProtocol(domainReg, httpsToc, values);
        if (changes) {
          removeReleases.push(...changes.delete);
          addReleases.push(...changes.update);
        }
      } else {
        console.log("no https toc: " + httpsToc);
      }
    } else {
      const toc = values[0];
      if (toc.link.startsWith("https")) {
        const updateChanges = await updateReleaseProtocol(domainReg, toc, values);
        if (updateChanges) {
          removeReleases.push(...updateChanges.delete);
          addReleases.push(...updateChanges.update);
        }
        continue;
      }
      if (!httpsOnly.some((value) => toc.link.startsWith(value))) {
        continue;
      }
      const deleteJobs = [];

      for (const jobItem of jobItems) {
        if (jobItem.name.includes(toc.link)) {
          deleteJobs.push(jobItem);
        }
      }
      const newJobs = [];

      for (const deleteJob of deleteJobs) {
        let hasSameJobType = false;
        if (!hasSameJobType) {
          for (const job of newJobs) {
            if (job.type === deleteJob.type) {
              hasSameJobType = true;
              break;
            }
          }
        }
        if (hasSameJobType) {
          continue;
        }
        const httpsJob = { ...deleteJob };
        httpsJob.name = httpsJob.name.replace("http", "https");
        if (httpsJob.arguments) {
          httpsJob.arguments = httpsJob.arguments.replace(/http:/g, "https:");
        }
        newJobs.push(httpsJob);
      }

      removeJobs.push(...deleteJobs);
      addJobs.push(...newJobs);
      removeTocs.push(toc);
      addTocs.push({
        mediumId: toc.mediumId,
        link: toc.link.replace("http:", "https:"),
      });

      const changes = await updateReleaseProtocol(domainReg, toc, values);
      if (changes) {
        removeReleases.push(...changes.delete);
        addReleases.push(...changes.update);
      }
    }
  }
  for (const jobItem of jobItems.filter((value) => !removeJobs.includes(value))) {
    if (jobItem.type === ScrapeName.toc) {
      const argument = JSON.parse(jobItem.arguments as string);
      const url = argument.url as string;

      if (!url.startsWith("http:")) {
        continue;
      }
      if (!httpsOnly.some((value) => url.startsWith(value))) {
        continue;
      }
      const httpsJob = { ...jobItem };
      httpsJob.name = httpsJob.name.replace("http", "https");
      httpsJob.arguments = (httpsJob.arguments as string).replace(/http:/g, "https:");

      let hasSameJobType = false;
      for (const job of addJobs) {
        if (job.name === jobItem.name) {
          hasSameJobType = true;
          break;
        }
      }
      if (hasSameJobType) {
        continue;
      }
      removeJobs.push(jobItem);
      addJobs.push(httpsJob);
    }
  }
  return {
    addJobs,
    removeJobs,
    addReleases,
    removeReleases,
    removeTocs,
    addTocs,
  };
}

interface Change {
  addJobs: JobItem[];
  removeTocs: MediumToc[];
  addTocs: MediumToc[];
  removeReleases: EpisodeRelease[];
  removeJobs: JobItem[];
  addReleases: EpisodeRelease[];
}

async function executeChange(changes: Change) {
  const jobRequests: JobRequest[] = [];

  for (const addJob of changes.addJobs) {
    if (addJob.runAfter) {
      console.log("job which should run after another!: " + JSON.stringify(addJob));
      continue;
    }
    jobRequests.push({
      arguments: addJob.arguments,
      deleteAfterRun: addJob.deleteAfterRun,
      interval: addJob.interval,
      name: addJob.name,
      runImmediately: false,
      type: addJob.type,
    });
  }
  await storage.jobStorage.addJobs(jobRequests);
  await Promise.all(changes.addTocs.map((value) => storage.mediumStorage.addToc(value.mediumId, value.link)));
  await storage.episodeStorage.addRelease(changes.addReleases);
  await Promise.all(changes.removeReleases.map((value) => storage.episodeStorage.deleteRelease(value)));
  await storage.jobStorage.removeJobs(changes.removeJobs);
  const removeTocLinks = [...new Set(changes.removeTocs.map((value) => value.link))];
  await Promise.all(removeTocLinks.map((value) => storage.mediumStorage.removeToc(value)));
}

async function makeChanges() {
  const firstChanges = await updateHttps();
  await executeChange(firstChanges);
  const secondChanges = await updateHttps();
  await executeChange(secondChanges);
  const thirdChanges = await updateHttps();

  if (
    thirdChanges.removeTocs.length ||
    thirdChanges.removeJobs.length ||
    thirdChanges.removeReleases.length ||
    thirdChanges.addReleases.length ||
    thirdChanges.addJobs.length ||
    thirdChanges.addTocs.length
  ) {
    throw Error("Migration from 7 to 8 failed, still changes to make after second try");
  }
}

makeChanges()
  .then(() => console.log("Finished successfully"))
  .catch(console.error)
  .finally(() => process.exit(0));
