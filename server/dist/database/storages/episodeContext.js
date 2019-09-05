"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const subContext_1 = require("./subContext");
const promise_mysql_1 = tslib_1.__importDefault(require("promise-mysql"));
const tools_1 = require("../../tools");
const logger_1 = tslib_1.__importDefault(require("../../logger"));
const databaseTypes_1 = require("../databaseTypes");
class EpisodeContext extends subContext_1.SubContext {
    /**
     *
     */
    async getLatestReleases(mediumId) {
        const resultArray = await this.query("SELECT episode.* FROM episode_release " +
            "INNER JOIN episode ON episode.id=episode_release.episode_id " +
            "INNER JOIN part ON part.id=episode.part_id  " +
            "WHERE medium_id=? " +
            "GROUP BY episode_id " +
            "ORDER BY episode.totalIndex DESC, episode.partialIndex DESC " +
            "LIMIT 5;", mediumId);
        // @ts-ignore
        return Promise.all(resultArray.map(async (rawEpisode) => {
            const releases = await this.getReleases(rawEpisode.id);
            return {
                id: rawEpisode.id,
                partialIndex: rawEpisode.partialIndex,
                partId: rawEpisode.part_id,
                totalIndex: rawEpisode.totalIndex,
                releases
            };
        }));
    }
    async getReleases(episodeId) {
        if (!episodeId || (Array.isArray(episodeId) && !episodeId.length)) {
            return [];
        }
        const resultArray = await this.queryInList("SELECT * FROM episode_release WHERE episode_id ", episodeId);
        if (!resultArray || !resultArray.length) {
            return [];
        }
        // @ts-ignore
        return resultArray.map((value) => {
            return {
                episodeId: value.episode_id,
                sourceType: value.source_type,
                releaseDate: value.releaseDate,
                locked: !!value.locked,
                url: value.url,
                title: value.title
            };
        });
    }
    async getReleasesByHost(episodeId, host) {
        if (!episodeId || (Array.isArray(episodeId) && !episodeId.length)) {
            return [];
        }
        const resultArray = await this.queryInList(`SELECT * FROM episode_release WHERE locate(${promise_mysql_1.default.escape(host)}, url) = 1 AND episode_id `, episodeId);
        if (!resultArray || !resultArray.length) {
            return [];
        }
        // @ts-ignore
        return resultArray.map((value) => {
            return {
                episodeId: value.episode_id,
                sourceType: value.source_type,
                releaseDate: value.releaseDate,
                locked: !!value.locked,
                url: value.url,
                title: value.title
            };
        });
    }
    async getPartsEpisodeIndices(partId) {
        const result = await this.queryInList("SELECT part_id, combiIndex as combinedIndex " +
            "FROM episode WHERE part_id ", partId);
        if (!result) {
            return [];
        }
        const idMap = new Map();
        result.forEach((value) => {
            const partValue = tools_1.getElseSet(idMap, value.part_id, () => {
                return { partId: value.part_id, episodes: [] };
            });
            partValue.episodes.push(value.combinedIndex);
        });
        if (Array.isArray(partId)) {
            partId.forEach((value) => {
                tools_1.getElseSet(idMap, value, () => {
                    return { partId: value, episodes: [] };
                });
            });
        }
        else {
            tools_1.getElseSet(idMap, partId, () => {
                return { partId, episodes: [] };
            });
        }
        return [...idMap.values()];
    }
    /**
     * Add progress of an user in regard to an episode to the storage.
     */
    async addProgress(uuid, episodeId, progress, readDate) {
        if (progress < 0 || progress > 1) {
            return Promise.reject(new Error(tools_1.Errors.INVALID_INPUT));
        }
        await this.multiInsert("REPLACE INTO user_episode " +
            "(user_uuid, episode_id, progress, read_date) " +
            "VALUES ", episodeId, (value) => [uuid, value, progress, readDate]);
        return true;
    }
    /**
     * Removes progress of an user in regard to an episode.
     */
    removeProgress(uuid, episodeId) {
        return this.delete("user_episode", {
            column: "user_uuid",
            value: uuid,
        }, {
            column: "episode_id",
            value: episodeId,
        });
    }
    /**
     * Sets the progress of an user in regard to an episode with one or multiple progressResult objects.
     */
    setProgress(uuid, progressResult) {
        // @ts-ignore
        return tools_1.promiseMultiSingle(progressResult, async (value) => {
            const resultArray = await this.query("SELECT episode_id FROM result_episode WHERE novel=? AND (chapter=? OR chapIndex=?)", [value.novel, value.chapter, value.chapIndex]);
            const episodeId = resultArray[0] && resultArray[0].episode_id;
            if (episodeId == null) {
                const msg = `could not find an episode for '${value.novel}', '${value.chapter}', '${value.chapIndex}'`;
                logger_1.default.info(msg);
                return;
            }
            await this.addProgress(uuid, episodeId, value.progress, value.readDate);
        }).then(tools_1.ignore);
    }
    /**
     * Get the progress of an user in regard to an episode.
     */
    async getProgress(uuid, episodeId) {
        const result = await this
            .query("SELECT * FROM user_episode " +
            "WHERE user_uuid = ? " +
            "AND episode_id = ?", [uuid, episodeId]);
        return result[0].progress;
    }
    /**
     * Updates the progress of an user in regard to an episode.
     */
    updateProgress(uuid, episodeId, progress, readDate) {
        // todo for now its the same as calling addProgress, but somehow do it better maybe?
        return this.addProgress(uuid, episodeId, progress, readDate);
    }
    /**
     * Marks an Episode as read and adds it into Storage if the episode does not exist yet.
     */
    async markEpisodeRead(uuid, result) {
        if (!result.accept) {
            return;
        }
        const teaserMatcher = /\(?teaser\)?$|(\s+$)/i;
        // @ts-ignore
        return tools_1.promiseMultiSingle(result.result, async (value) => {
            // todo what if it is not a serial medium but only an article? should it even save such things?
            if (!value.novel
                || (!value.chapIndex && !value.chapter)
                // do not mark episode if they are a teaser only
                || (value.chapter && value.chapter.match(teaserMatcher))) {
                return;
            }
            const resultArray = await this.query("SELECT episode_id FROM result_episode WHERE novel=? AND (chapter=? OR chapIndex=?);", [value.novel, value.chapter, value.chapIndex]);
            // if a similar/same result was mapped to an episode before, get episode_id and update read
            if (resultArray[0] && resultArray[0].episode_id != null) {
                return this.query("INSERT IGNORE INTO user_episode (user_uuid, episode_id,progress) VALUES (?,?,0);", [uuid, resultArray[0].episode_id]);
            }
            const escapedNovel = escapeLike(value.novel, { singleQuotes: true, noBoundaries: true });
            const media = await this.query("SELECT title, id,synonym FROM medium " +
                "LEFT JOIN medium_synonyms ON medium.id=medium_synonyms.medium_id " +
                "WHERE medium.title LIKE ? OR medium_synonyms.synonym LIKE ?;", [escapedNovel, escapedNovel]);
            // todo for now only get the first medium?, later test it against each other
            let bestMedium = media[0];
            if (!bestMedium) {
                const addedMedium = await this.addMedium({ title: value.novel, medium: tools_1.MediaType.TEXT }, uuid);
                bestMedium = { id: addedMedium.insertId, title: value.novel };
                // todo add medium if it is not known?
            }
            let volumeId;
            // if there is either an volume or volIndex in result
            // search or add the given volume to link the episode to the part/volume
            let volumeTitle = value.volume;
            // if there is no volume yet, with the given volumeTitle or index, add one
            let volIndex = Number(value.volIndex);
            if (volIndex || volumeTitle) {
                // todo: do i need to convert volIndex from a string to a number for the query?
                const volumeArray = await this.query("SELECT id FROM part WHERE medium_id=? AND title LIKE ? OR totalIndex=?)", [bestMedium.id, volumeTitle && escapeLike(volumeTitle, {
                        singleQuotes: true,
                        noBoundaries: true
                    }), volIndex]);
                const volume = volumeArray[0];
                if (volume) {
                    volumeId = volume.id;
                }
                else {
                    if (Number.isNaN(volIndex)) {
                        const lowestIndexArray = await this.query("SELECT MIN(totalIndex) as totalIndex FROM part WHERE medium_id=?", bestMedium.id);
                        // todo look if totalIndex incremential needs to be replaced with combiIndex
                        const lowestIndexObj = lowestIndexArray[0];
                        // if the lowest available totalIndex not indexed, decrement, else take -2
                        // -1 is reserved for all episodes, which do not have any volume/part assigned
                        volIndex = lowestIndexObj && lowestIndexObj.totalIndex < 0 ? --lowestIndexObj.totalIndex : -2;
                    }
                    if (!volumeTitle) {
                        volumeTitle = "Volume " + volIndex;
                    }
                    const addedVolume = await this.addPart(
                    // @ts-ignore
                    { title: volumeTitle, totalIndex: volIndex, mediumId: bestMedium.id });
                    volumeId = addedVolume.id;
                }
            }
            else {
                // check if there is a part/volume, with index -1, reserved for all episodes, which are not indexed
                const volumeArray = await this.query("SELECT id FROM part WHERE medium_id=? AND totalIndex=?", [bestMedium.id, -1]);
                const volume = volumeArray[0];
                if (!volume) {
                    volumeId = (await this.createStandardPart(bestMedium.id)).id;
                }
                else {
                    volumeId = volume.id;
                }
            }
            if (!Number.isInteger(volumeId) || volumeId <= 0) {
                throw Error("no volume id available");
            }
            const episodeSelectArray = await this.query("SELECT id, part_id, url FROM episode " +
                "LEFT JOIN episode_release " +
                "ON episode.id=episode_release.episode_id " +
                "WHERE title LIKE ? OR totalIndex=?", [value.chapter && escapeLike(value.chapter, {
                    noBoundaries: true,
                    singleQuotes: true
                }), value.chapIndex]);
            const episodeSelect = episodeSelectArray[0];
            let episodeId = episodeSelect && episodeSelect.id;
            if (episodeId == null) {
                let episodeIndex = Number(value.chapIndex);
                // if there is no index, decrement the minimum index available for this medium
                if (Number.isNaN(episodeIndex)) {
                    const latestEpisodeArray = await this.query("SELECT MIN(totalIndex) as totalIndex FROM episode " +
                        "WHERE part_id EXISTS (SELECT id from part WHERE medium_id=?);", bestMedium.id);
                    const latestEpisode = latestEpisodeArray[0];
                    // TODO: 23.07.2019 look if totalIndex needs to be replaced with combiIndex
                    // if the lowest available totalIndex not indexed, decrement, else take -1
                    episodeIndex = latestEpisode && latestEpisode.totalIndex < 0 ? --latestEpisode.totalIndex : -1;
                }
                let chapter = value.chapter;
                if (!chapter) {
                    chapter = "Chapter " + episodeIndex;
                }
                const episode = await this.addEpisode({
                    id: 0,
                    partId: volumeId,
                    totalIndex: episodeIndex,
                    releases: [{
                            title: chapter,
                            url: result.url,
                            releaseDate: new Date(),
                            // todo get source type
                            sourceType: "",
                            episodeId: 0
                        }],
                });
                // @ts-ignore
                episodeId = episode.id;
            }
            // now after setting the storage up, so that all data is 'consistent' with this result,
            // mark the episode as read
            // normally the progress should be updated by messages of the tracker
            // it should be inserted only, if there does not exist any progress
            await this
                .query("INSERT IGNORE INTO user_episode (user_uuid, episode_id, progress) VALUES (?,?,0);", [uuid, episodeId]);
            await this.query("INSERT INTO result_episode (novel, chapter, chapIndex, volume, volIndex, episode_id) " +
                "VALUES (?,?,?,?,?,?);", [value.novel, value.chapter, value.chapIndex, value.volume, value.volIndex, episodeId]);
        }).then(tools_1.ignore);
    }
    async addRelease(releases) {
        await this.multiInsert("INSERT IGNORE INTO episode_release " +
            "(episode_id, title, url, source_type, releaseDate, locked) " +
            "VALUES", releases, (release) => {
            if (!release.episodeId) {
                throw Error("missing episodeId on release");
            }
            return [
                release.episodeId,
                release.title,
                release.url,
                release.sourceType,
                release.releaseDate,
                release.locked
            ];
        });
        return releases;
    }
    getEpisodeLinks(episodeIds) {
        return this.queryInList("SELECT episode_id as episodeId, url FROM episode_release WHERE episode_id ", episodeIds);
    }
    getSourcedReleases(sourceType, mediumId) {
        return this
            .query("SELECT url, episode_release.title FROM episode_release " +
            "INNER JOIN episode ON episode.id=episode_release.episode_id " +
            "INNER JOIN part ON part.id=episode.part_id " +
            "WHERE source_type=? AND medium_id=?;", [sourceType, mediumId])
            .then((resultArray) => resultArray.map((value) => {
            value.sourceType = sourceType;
            value.mediumId = mediumId;
            return value;
        }));
    }
    updateRelease(releases) {
        // @ts-ignore
        return tools_1.promiseMultiSingle(releases, async (value) => {
            if (value.episodeId) {
                await this.update("episode_release", (updates, values) => {
                    if (value.title) {
                        updates.push("title=?");
                        values.push(value.title);
                    }
                    if (value.releaseDate) {
                        updates.push("releaseDate=?");
                        values.push(value.releaseDate);
                    }
                    if (value.sourceType) {
                        updates.push("source_type=?");
                        values.push(value.sourceType);
                    }
                    if (value.locked != null) {
                        updates.push("locked=?");
                        values.push(value.locked);
                    }
                }, {
                    column: "episode_id",
                    value: value.episodeId,
                }, {
                    column: "url",
                    value: value.url,
                });
            }
            else if (value.sourceType) {
                await this.query("UPDATE episode_release SET url=? WHERE source_type=? AND url != ? AND title=?", [value.url, value.sourceType, value.url, value.title]);
            }
        }).then(tools_1.ignore);
    }
    deleteRelease(release) {
        return this.delete("episode_release", {
            column: "episode_id",
            value: release.episodeId
        }, {
            column: "url",
            value: release.url
        }).then(tools_1.ignore);
    }
    async getEpisodeContentData(chapterLink) {
        const results = await this.query("SELECT episode_release.title as episodeTitle, episode.combiIndex as `index`, " +
            "medium.title as mediumTitle FROM episode_release " +
            "INNER JOIN episode ON episode.id=episode_release.episode_id " +
            "INNER JOIN part ON part.id=episode.part_id INNER JOIN medium ON medium.id=part.medium_id " +
            "WHERE episode_release.url=?", chapterLink);
        if (!results || !results.length) {
            return {
                episodeTitle: "",
                index: 0,
                mediumTitle: ""
            };
        }
        return {
            episodeTitle: results[0].episodeTitle,
            index: results[0].index,
            mediumTitle: results[0].mediumTitle
        };
    }
    /**
     * Adds a episode of a part to the storage.
     */
    addEpisode(episodes) {
        // TODO: 29.06.2019 insert multiple rows, what happens with insertId?
        const insertReleases = [];
        // @ts-ignore
        return tools_1.promiseMultiSingle(episodes, async (episode) => {
            if (!(episode.partId > 0)) {
                throw Error("episode without partId");
            }
            let insertId;
            try {
                const result = await this.query("INSERT INTO episode " +
                    "(part_id, totalIndex, partialIndex, combiIndex) " +
                    "VALUES (?,?,?,?);", [episode.partId, episode.totalIndex, episode.partialIndex, tools_1.combiIndex(episode)]);
                insertId = result.insertId;
            }
            catch (e) {
                // do not catch if it isn't an duplicate key error
                if (!e || (e.errno !== 1062 && e.errno !== 1022)) {
                    throw e;
                }
                const result = await this.query("SELECT id from episode where part_id=? and combiIndex=?", [episode.partId, tools_1.combiIndex(episode)]);
                insertId = result[0].id;
            }
            if (!Number.isInteger(insertId)) {
                throw Error(`invalid ID ${insertId}`);
            }
            if (episode.releases) {
                episode.releases.forEach((value) => value.episodeId = insertId);
                insertReleases.push(...episode.releases);
            }
            return {
                id: insertId,
                partId: episode.partId,
                partialIndex: episode.partialIndex,
                totalIndex: episode.totalIndex,
                releases: episode.releases,
                progress: 0,
                readDate: null,
            };
        }).then(async (value) => {
            if (insertReleases.length) {
                await this.addRelease(insertReleases);
            }
            return value;
        });
    }
    /**
     * Gets an episode from the storage.
     */
    async getEpisode(id, uuid) {
        const episodes = await this.queryInList("SELECT * FROM episode LEFT JOIN user_episode ON episode.id=user_episode.episode_id " +
            `WHERE (user_uuid IS NULL OR user_uuid=${promise_mysql_1.default.escape(uuid)}) AND episode.id`, id);
        if (!episodes || !episodes.length) {
            return [];
        }
        const idMap = new Map();
        const releases = await this.getReleases(episodes.map((value) => {
            idMap.set(value.id, value);
            return value.id;
        }));
        releases.forEach((value) => {
            const episode = idMap.get(value.episodeId);
            if (!episode) {
                throw Error("episode missing for queried release");
            }
            if (!episode.releases) {
                episode.releases = [];
            }
            episode.releases.push(value);
        });
        return episodes.map((episode) => {
            return {
                progress: episode.progress == null ? episode.progress : 0,
                readDate: episode.progress == null ? episode.read_date : null,
                id: episode.id,
                partialIndex: episode.partialIndex,
                partId: episode.part_id,
                totalIndex: episode.totalIndex,
                releases: episode.releases || [],
            };
        });
    }
    async getPartMinimalEpisodes(partId) {
        return this.query("SELECT id, combiIndex FROM episode WHERE part_id=?", partId);
    }
    async getPartEpisodePerIndex(partId, index) {
        const episodes = await this.queryInList("SELECT * FROM episode " +
            `where part_id =${promise_mysql_1.default.escape(partId)} AND combiIndex`, index);
        if (!episodes || !episodes.length) {
            return [];
        }
        const availableIndices = [];
        const idMap = new Map();
        const episodeIds = episodes.map((value) => {
            availableIndices.push(value.combiIndex);
            idMap.set(value.id, value);
            return value.id;
        });
        const releases = await this.getReleases(episodeIds);
        releases.forEach((value) => {
            const episode = idMap.get(value.episodeId);
            if (!episode) {
                throw Error("missing episode for release");
            }
            if (!episode.releases) {
                episode.releases = [];
            }
            episode.releases.push(value);
        });
        // @ts-ignore
        tools_1.multiSingle(index, (value) => {
            if (!availableIndices.includes(value)) {
                const separateValue = tools_1.separateIndex(value);
                tools_1.checkIndices(separateValue);
                episodes.push(separateValue);
            }
        });
        return episodes.map((value) => {
            tools_1.checkIndices(value);
            return {
                id: value.id,
                partId,
                totalIndex: value.totalIndex,
                partialIndex: value.partialIndex,
                releases: value.releases || []
            };
        });
    }
    async getMediumEpisodePerIndex(mediumId, index) {
        const episodes = await this.queryInList("SELECT episode.* FROM episode INNER JOIN part ON part.id=episode.part_id " +
            `WHERE medium_id =${promise_mysql_1.default.escape(mediumId)} AND episode.combiIndex`, index);
        if (!episodes || !episodes.length) {
            return [];
        }
        const availableIndices = [];
        const idMap = new Map();
        const episodeIds = episodes.map((value) => {
            availableIndices.push(value.combiIndex);
            idMap.set(value.id, value);
            return value.id;
        });
        const releases = await this.getReleases(episodeIds);
        releases.forEach((value) => {
            const episode = idMap.get(value.episodeId);
            if (!episode) {
                throw Error("missing episode for release");
            }
            if (!episode.releases) {
                episode.releases = [];
            }
            episode.releases.push(value);
        });
        // @ts-ignore
        tools_1.multiSingle(index, (value) => {
            if (!availableIndices.includes(value)) {
                const separateValue = tools_1.separateIndex(value);
                episodes.push(separateValue);
            }
        });
        return episodes.map((value) => {
            tools_1.checkIndices(value);
            return {
                id: value.id,
                partId: value.part_id,
                totalIndex: value.totalIndex,
                partialIndex: value.partialIndex,
                releases: value.releases || []
            };
        });
    }
    /**
     * Updates an episode from the storage.
     */
    async updateEpisode(episode) {
        return this.update("episode", (updates, values) => {
            if (episode.partId) {
                updates.push("part_id = ?");
                values.push(episode.partId);
            }
            if (episode.partialIndex) {
                updates.push("partialIndex = ?");
                values.push(episode.partialIndex);
            }
            if (episode.totalIndex) {
                updates.push("totalIndex = ?");
                values.push(episode.totalIndex);
            }
        }, {
            column: "id", value: episode.id
        });
    }
    /**
     * Updates an episode from the storage.
     */
    async moveEpisodeToPart(oldPartId, newPartId) {
        if (!oldPartId || !newPartId) {
            return false;
        }
        const replaceIds = await this.query("SELECT oldEpisode.id as oldId, newEpisode.id as newId FROM " +
            `(Select * from episode where part_id=?) as oldEpisode ` +
            `inner join (Select * from episode where part_id=?) as newEpisode ` +
            "ON oldEpisode.combiIndex=newEpisode.combiIndex", [oldPartId, newPartId]);
        const changePartIdsResult = await this.query("SELECT id FROM episode WHERE combiIndex IN " +
            `(SELECT combiIndex FROM episode WHERE part_id = ?) AND part_id = ?;`, [newPartId, oldPartId]);
        const changePartIds = changePartIdsResult.map((value) => value.id);
        await this.queryInList(`UPDATE episode SET part_id=${promise_mysql_1.default.escape(newPartId)} ` +
            `WHERE part_id=${promise_mysql_1.default.escape(oldPartId)} AND combiIndex`, changePartIds);
        if (!replaceIds.length) {
            return true;
        }
        const deleteReleaseIds = [];
        await Promise.all(replaceIds.map((replaceId) => {
            return this.query("UPDATE episode_release set episode_id=? where episode_id=?", [replaceId.newId, replaceId.oldId]).catch((reason) => {
                if (reason && databaseTypes_1.MySqlErrorNo.ER_DUP_ENTRY === reason.errno) {
                    deleteReleaseIds.push(replaceId.oldId);
                }
                else {
                    throw reason;
                }
            });
        }));
        const deleteProgressIds = [];
        await Promise.all(replaceIds.map((replaceId) => {
            return this.query("UPDATE user_episode set episode_id=? where episode_id=?", [replaceId.newId, replaceId.oldId]).catch((reason) => {
                if (reason && databaseTypes_1.MySqlErrorNo.ER_DUP_ENTRY === reason.errno) {
                    deleteProgressIds.push(replaceId.oldId);
                }
                else {
                    throw reason;
                }
            });
        }));
        const deleteResultIds = [];
        await Promise.all(replaceIds.map((replaceId) => {
            return this.query("UPDATE result_episode set episode_id=? where episode_id=?", [replaceId.newId, replaceId.oldId]).catch((reason) => {
                if (reason && databaseTypes_1.MySqlErrorNo.ER_DUP_ENTRY === reason.errno) {
                    deleteResultIds.push(replaceId.oldId);
                }
                else {
                    throw reason;
                }
            });
        }));
        const oldIds = replaceIds.map((value) => value.oldId);
        // TODO: 26.08.2019 this does not go quite well, throws error with 'cannot delete parent reference'
        await this.queryInList("DELETE FROM episode_release WHERE episode_id ", deleteReleaseIds);
        await this.queryInList("DELETE FROM user_episode WHERE episode_id ", deleteProgressIds);
        await this.queryInList("DELETE FROM result_episode WHERE episode_id ", deleteResultIds);
        await this.queryInList(`DELETE FROM episode WHERE part_id=${promise_mysql_1.default.escape(oldPartId)} AND id`, oldIds);
        return true;
    }
    /**
     * Deletes an episode from the storage irreversibly.
     */
    async deleteEpisode(id) {
        // remove episode from progress first
        await this.delete("user_episode", { column: "episode_id", value: id });
        await this.delete("episode_release", { column: "episode_id", value: id });
        // lastly remove episode itself
        return this.delete("episode", { column: "id", value: id });
    }
    async getChapterIndices(mediumId) {
        const result = await this.query("SELECT episode.combiIndex FROM episode INNER JOIN part ON episode.part_id=part.id WHERE medium_id=?", mediumId);
        return result.map((value) => value.combiIndex);
    }
    async getAllChapterLinks(mediumId) {
        const result = await this.query("SELECT url FROM episode " +
            "INNER JOIN episode_release ON episode.id=episode_release.episode_id " +
            "INNER JOIN part ON episode.part_id=part.id WHERE medium_id=?", mediumId);
        return result
            .map((value) => value.url)
            .filter((value) => value);
    }
    async getUnreadChapter(uuid) {
        const resultArray = await this.query("SELECT id FROM episode WHERE id NOT IN " +
            "(SELECT episode_id FROM user_episode WHERE progress < 1 AND user_uuid=?);", uuid);
        return resultArray.map((value) => value.id);
    }
    async getReadToday(uuid) {
        const resultArray = await this.query("SELECT * FROM user_episode WHERE read_date > (NOW() - INTERVAL 1 DAY) AND user_uuid=?;", uuid);
        return resultArray.map((value) => {
            return {
                episodeId: value.episode_id,
                readDate: value.read_date,
                progress: value.progress,
            };
        });
    }
}
exports.EpisodeContext = EpisodeContext;
//# sourceMappingURL=episodeContext.js.map