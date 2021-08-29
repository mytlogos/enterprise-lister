/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require("fs");
const requestPromise = require("request-promise-native");
const request = require("request");
const tar = require("tar-fs");
const path = require("path");

/**
 * @returns {Promise<string>} the version string
 */
module.exports.readLocalVersion = async function readLocalVersion() {
  const packageJsonPath = path.join(process.cwd(), "package.json");
  const packageJsonString = await fs.promises.readFile(packageJsonPath, "utf8");
  const packageJson = JSON.parse(packageJsonString);
  return packageJson.version;
};

module.exports.readRemoteVersion = async function readRemoteVersion() {
  const response = await requestPromise.get("https://api.github.com/repos/mytlogos/enterprise-lister/releases/latest", {
    headers: {
      "User-Agent": "bot",
      Accept: "application/vnd.github.v3+json",
    },
  });

  const latestRelease = JSON.parse(response);
  return latestRelease.tag_name;
};

module.exports.downloadLatest = async function downloadLatest() {
  console.log("Checking for latest Release...");
  const response = await requestPromise.get("https://api.github.com/repos/mytlogos/enterprise-lister/releases/latest", {
    headers: {
      "User-Agent": "bot",
      Accept: "application/vnd.github.v3+json",
    },
  });

  const latestRelease = JSON.parse(response);
  console.log(`Latest Release is ${latestRelease.tag_name}.`);

  let distAsset;
  for (const asset of latestRelease.assets) {
    if (asset.name === "dist.tar") {
      distAsset = asset;
      break;
    }
  }
  if (distAsset) {
    const distDir = path.join(process.cwd(), "dist");
    console.log("Dist Asset available, wiping previous dist directory...");
    // wipe dist directory clean
    await fs.promises.rmdir(distDir, { recursive: true });

    console.log(`Finished wiping '${distDir}'. Downloading and extracting new Dist Directory...`);

    // download latest dist.tar and extract it directly into the dist directory
    await new Promise((resolve, reject) => {
      let finished = false;
      request(distAsset.browser_download_url)
        .pipe(tar.extract(process.cwd()))
        .on("entry", (header) => console.log(`Extracting ${header.name}...`))
        .on("error", () => {
          if (!finished) {
            finished = true;
            reject();
          }
        })
        .on("finish", () => {
          if (!finished) {
            finished = true;
            resolve();
          }
        });
    });
    console.log("Finished downloading and extracting dist.");
  } else {
    console.log("No Dist Asset available.");
  }
};

// run this if this file was called directly via node
if (require.main === module) {
  module.exports
    .downloadLatest()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error.body);
      process.exit(1);
    });
}
