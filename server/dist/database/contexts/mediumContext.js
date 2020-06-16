"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const subContext_1 = require("./subContext");
const tools_1 = require("../../tools");
const storageTools_1 = require("../storages/storageTools");
const mysql_1 = require("mysql");
class MediumContext extends subContext_1.SubContext {
    async removeToc(tocLink) {
        await this.query("DELETE FROM medium_toc WHERE link = ?", tocLink);
    }
    /**
     * Adds a medium to the storage.
     */
    async addMedium(medium, uuid) {
        if (!medium || !medium.medium || !medium.title) {
            return Promise.reject(new Error(tools_1.Errors.INVALID_INPUT));
        }
        const result = await this.query("INSERT INTO medium(medium, title) VALUES (?,?);", [medium.medium, medium.title]);
        if (!Number.isInteger(result.insertId)) {
            throw Error(`invalid ID: ${result.insertId}`);
        }
        await this.parentContext.partContext.createStandardPart(result.insertId);
        const newMedium = {
            ...medium,
            id: result.insertId,
        };
        // if it should be added to an list, do it right away
        if (uuid) {
            // add item to listId of medium or the standard list
            await this.parentContext.internalListContext.addItemToList(newMedium, uuid);
        }
        return newMedium;
    }
    getSimpleMedium(id) {
        // TODO: 29.06.2019 replace with id IN (...)
        // @ts-ignore
        return tools_1.promiseMultiSingle(id, async (mediumId) => {
            const resultArray = await this.query(`SELECT * FROM medium WHERE medium.id =?;`, mediumId);
            const result = resultArray[0];
            return {
                id: result.id,
                countryOfOrigin: result.countryOfOrigin,
                languageOfOrigin: result.languageOfOrigin,
                author: result.author,
                title: result.title,
                medium: result.medium,
                artist: result.artist,
                lang: result.lang,
                stateOrigin: result.stateOrigin,
                stateTL: result.stateTL,
                series: result.series,
                universe: result.universe,
            };
        });
    }
    async getTocSearchMedia() {
        const result = await this.query("SELECT substring(episode_release.url, 1, locate(\"/\",episode_release.url,9)) as host, " +
            "medium.id as mediumId, medium.title, medium.medium " +
            "FROM medium " +
            "LEFT JOIN part ON part.medium_id=medium.id " +
            "LEFT JOIN episode ON part_id=part.id " +
            "LEFT JOIN episode_release ON episode_release.episode_id=episode.id " +
            "GROUP BY mediumId, host;");
        const idMap = new Map();
        const tocSearchMedia = result.map((value) => {
            const medium = idMap.get(value.mediumId);
            if (medium) {
                if (medium.hosts && value.host) {
                    medium.hosts.push(value.host);
                }
                return false;
            }
            const searchMedium = {
                mediumId: value.mediumId,
                hosts: [],
                synonyms: [],
                medium: value.medium,
                title: value.title
            };
            if (value.host && searchMedium.hosts) {
                searchMedium.hosts.push(value.host);
            }
            idMap.set(value.mediumId, searchMedium);
            return searchMedium;
        }).filter((value) => value);
        const synonyms = await this.getSynonyms(tocSearchMedia.map((value) => value.mediumId));
        synonyms.forEach((value) => {
            const medium = idMap.get(value.mediumId);
            if (!medium) {
                throw Error("missing medium for queried synonyms");
            }
            if (!medium.synonyms) {
                medium.synonyms = [];
            }
            if (Array.isArray(value.synonym)) {
                medium.synonyms.push(...value.synonym);
            }
            else {
                medium.synonyms.push(value.synonym);
            }
        });
        return tocSearchMedia;
    }
    async getTocSearchMedium(id) {
        const resultArray = await this.query(`SELECT * FROM medium WHERE medium.id =?;`, id);
        const result = resultArray[0];
        const synonyms = await this.getSynonyms(id);
        return {
            mediumId: result.id,
            medium: result.medium,
            title: result.title,
            synonyms: (synonyms[0] && synonyms[0].synonym) || []
        };
    }
    /**
     * Gets one or multiple media from the storage.
     */
    getMedium(id, uuid) {
        // TODO: 29.06.2019 replace with id IN (...)
        // @ts-ignore
        return tools_1.promiseMultiSingle(id, async (mediumId) => {
            let result = await this.query(`SELECT * FROM medium WHERE medium.id=?;`, mediumId);
            result = result[0];
            const latestReleasesResult = await this.parentContext.episodeContext.getLatestReleases(mediumId);
            const currentReadResult = await this.query("SELECT * FROM " +
                "(SELECT * FROM user_episode " +
                "WHERE episode_id IN (SELECT id from episode " +
                "WHERE part_id IN (SELECT id FROM part " +
                "WHERE medium_id=?))) as user_episode " +
                "INNER JOIN episode ON user_episode.episode_id=episode.id " +
                "WHERE user_uuid=? " +
                "ORDER BY totalIndex DESC, partialIndex DESC LIMIT 1", [mediumId, uuid]);
            const unReadResult = await this.query("SELECT * FROM episode WHERE part_id IN (SELECT id FROM part WHERE medium_id=?) " +
                "AND id NOT IN (SELECT episode_id FROM user_episode WHERE user_uuid=?) " +
                "ORDER BY totalIndex DESC, partialIndex DESC;", [mediumId, uuid]);
            const partsResult = await this.query("SELECT id FROM part WHERE medium_id=?;", mediumId);
            return {
                id: result.id,
                countryOfOrigin: result.countryOfOrigin,
                languageOfOrigin: result.languageOfOrigin,
                author: result.author,
                title: result.title,
                medium: result.medium,
                artist: result.artist,
                lang: result.lang,
                stateOrigin: result.stateOrigin,
                stateTL: result.stateTL,
                series: result.series,
                universe: result.universe,
                parts: partsResult.map((packet) => packet.id),
                currentRead: currentReadResult[0] ? currentReadResult[0].episode_id : undefined,
                latestReleases: latestReleasesResult.map((packet) => packet.id),
                unreadEpisodes: unReadResult.map((packet) => packet.id),
            };
        });
    }
    async getAllMediaFull() {
        return this.queryStream("SELECT " +
            "id, countryOfOrigin, languageOfOrigin, author, title," +
            "medium, artist, lang, stateOrigin, stateTL, series, universe " +
            "FROM medium");
    }
    async getAllMedia() {
        const result = await this.query("SELECT id FROM medium");
        return result.map((value) => value.id);
    }
    /**
     * Gets one or multiple media from the storage.
     */
    getLikeMedium(likeMedia) {
        // @ts-ignore
        return tools_1.promiseMultiSingle(likeMedia, async (value) => {
            const escapedLinkQuery = storageTools_1.escapeLike(value.link || "", { noRightBoundary: true });
            const escapedTitle = storageTools_1.escapeLike(value.title, { singleQuotes: true });
            let result = await this.query("SELECT id,medium FROM medium WHERE title LIKE ? OR id IN " +
                "(SELECT medium_id FROM medium_toc WHERE medium_id IS NOT NULL AND link LIKE ?);", [escapedTitle, escapedLinkQuery]);
            if (value.type != null) {
                result = result.filter((medium) => medium.medium === value.type);
            }
            return {
                medium: result[0],
                title: value.title,
                link: value.link,
            };
        });
    }
    /**
     * Updates a medium from the storage.
     */
    updateMedium(medium) {
        const keys = [
            "countryOfOrigin?", "languageOfOrigin", "author", "title", "medium",
            "artist", "lang", "stateOrigin", "stateTL", "series", "universe"
        ];
        // prevent anybody from removing most important data from media
        if (medium.title != null && !medium.title) {
            delete medium.title;
        }
        if (medium.medium != null && !medium.medium) {
            delete medium.medium;
        }
        if (!Number.isInteger(medium.id) || medium.id <= 0) {
            throw Error("invalid medium, id, title or medium is invalid: " + JSON.stringify(medium));
        }
        return this.update("medium", (updates, values) => {
            for (const key of keys) {
                const value = medium[key];
                if (value === null) {
                    updates.push(`${key} = NULL`);
                }
                else if (value != null) {
                    updates.push(`${key} = ?`);
                    values.push(value);
                }
            }
        }, { column: "id", value: medium.id });
    }
    async getSynonyms(mediumId) {
        // TODO: 29.06.2019 replace with 'medium_id IN (list)'
        const synonyms = await this.queryInList("SELECT * FROM medium_synonyms WHERE medium_id ", mediumId);
        if (!synonyms) {
            return [];
        }
        const synonymMap = new Map();
        synonyms.forEach((value) => {
            let synonym = synonymMap.get(value.medium_id);
            if (!synonym) {
                synonym = { mediumId: value.medium_id, synonym: [] };
                synonymMap.set(value.medium_id, synonym);
            }
            synonym.synonym.push(value.synonym);
        });
        return [...synonymMap.values()];
    }
    removeSynonyms(synonyms) {
        // @ts-ignore
        return tools_1.promiseMultiSingle(synonyms, (value) => {
            return tools_1.promiseMultiSingle(value.synonym, (item) => {
                return this.delete("medium_synonyms", {
                    column: "synonym",
                    value: item
                }, {
                    column: "medium_id",
                    value: value.mediumId
                });
            });
        }).then(() => true);
    }
    async addSynonyms(synonyms) {
        const params = [];
        // @ts-ignore
        tools_1.multiSingle(synonyms, (value) => {
            // @ts-ignore
            tools_1.multiSingle(value.synonym, (item) => {
                params.push([value.mediumId, item]);
            });
        });
        await this.multiInsert("INSERT IGNORE INTO medium_synonyms (medium_id, synonym) VALUES", params, (value) => value);
        return true;
    }
    addToc(mediumId, link) {
        return this.query("INSERT IGNORE INTO medium_toc (medium_id, link) VAlUES (?,?)", [mediumId, link]).then(tools_1.ignore);
    }
    async getToc(mediumId) {
        const resultArray = await this.query("SELECT link FROM medium_toc WHERE medium_id=?", mediumId);
        return resultArray.map((value) => value.link).filter((value) => value);
    }
    getMediumTocs(mediumId) {
        return this.queryInList("SELECT medium_id as mediumId, link FROM medium_toc WHERE medium_id ", mediumId);
    }
    async removeMediumToc(mediumId, link) {
        const domainRegMatch = /https?:\/\/(.+?)(\/|$)/.exec(link);
        if (!domainRegMatch) {
            throw Error("Invalid Toc, Unable to extract Domain: " + link);
        }
        await this.parentContext.jobContext.removeJobLike("name", `toc-${mediumId}-${link}`);
        const domain = domainRegMatch[1];
        const releases = await this.parentContext.episodeContext.getEpisodeLinksByMedium(mediumId);
        const episodeMap = new Map();
        const valueCb = () => [];
        for (const release of releases) {
            tools_1.getElseSet(episodeMap, release.episodeId, valueCb).push(release.url);
        }
        const removeEpisodesAfter = [];
        for (const [episodeId, links] of episodeMap.entries()) {
            const toMoveCount = tools_1.count(links, (value) => value.includes(domain));
            if (toMoveCount) {
                if (links.length === toMoveCount) {
                    removeEpisodesAfter.push(episodeId);
                }
            }
        }
        const updatedReleaseResult = await this.query("DELETE er FROM episode_release as er, episode as e, part as p" +
            " WHERE er.episode_id = e.id" +
            " AND e.part_id = p.id" +
            " AND p.medium_id = ?" +
            " AND locate(?,er.url) > 0;", [mediumId, domain]);
        const updatedProgressResult = await this.queryInList("DELETE ue FROM user_episode as ue, episode as e, part as p" +
            " WHERE ue.episode_id = e.id" +
            " AND e.part_id = p.id" +
            ` AND p.medium_id = ${mysql_1.escape(mediumId)}` +
            " AND e.id", removeEpisodesAfter);
        const updatedResultResult = await this.queryInList("DELETE re FROM result_episode as re, episode as e, part as p" +
            " WHERE re.episode_id = e.id" +
            " AND e.part_id = p.id" +
            ` AND p.medium_id = ${mysql_1.escape(mediumId)}` +
            " AND e.id", removeEpisodesAfter);
        const deletedEpisodesResult = await this.queryInList("DELETE FROM episode WHERE episode.id", removeEpisodesAfter);
        return this.delete("medium_toc", { column: "medium_id", value: mediumId }, { column: "link", value: link });
    }
    getAllMediaTocs() {
        return this.query("SELECT id, link FROM medium LEFT JOIN medium_toc ON medium.id=medium_toc.medium_id");
    }
    getAllTocs() {
        return this.query("SELECT medium_id as id, link FROM medium_toc");
    }
    async mergeMedia(sourceMediumId, destMediumId) {
        // transfer all tocs from source to dest and with it all associated episodes
        // add source title as synonym for dest
        // remove any jobs related to source
        // replace or ignore source id with dest id in:
        //  list_medium, external_list_medium, medium_synonyms, news_medium
        // the parts will be dropped for source id, the next job for dest should correct that again if possible
        // the tocs will be transferred and do not need to be moved manually here
        // transferring the tocs should remove any related jobs,
        // and toc jobs should be the only jobs related directly to an medium
        const tocs = await this.getToc(sourceMediumId);
        // transfer tocs and all related episodes
        await Promise.all(tocs.map((toc) => this.transferToc(sourceMediumId, destMediumId, toc)));
        await this.query("UPDATE IGNORE list_medium SET medium_id=? WHERE medium_id=?", [destMediumId, sourceMediumId]);
        await this.delete("list_medium", { column: "medium_id", value: sourceMediumId });
        await this.query("UPDATE IGNORE external_list_medium SET medium_id=? WHERE medium_id=?", [destMediumId, sourceMediumId]);
        await this.delete("external_list_medium", { column: "medium_id", value: sourceMediumId });
        await this.query("UPDATE IGNORE medium_synonyms SET medium_id=? WHERE medium_id=?", [destMediumId, sourceMediumId]);
        await this.delete("medium_synonyms", { column: "medium_id", value: sourceMediumId });
        await this.query("UPDATE IGNORE news_medium SET medium_id=? WHERE medium_id=?", [destMediumId, sourceMediumId]);
        await this.delete("news_medium", { column: "medium_id", value: sourceMediumId });
        const deletedReleaseResult = await this.query("DELETE er FROM episode_release as er, episode as e, part as p" +
            " WHERE er.episode_id = e.id" +
            " AND e.part_id = p.id" +
            " AND p.medium_id = ?", sourceMediumId);
        const deletedProgressResult = await this.query("DELETE ue FROM user_episode as ue, episode as e, part as p" +
            " WHERE ue.episode_id = e.id" +
            " AND e.part_id = p.id" +
            " AND p.medium_id = ?", sourceMediumId);
        const deletedResultResult = await this.query("DELETE re FROM result_episode as re, episode as e, part as p" +
            " WHERE re.episode_id = e.id" +
            " AND e.part_id = p.id" +
            " AND p.medium_id = ?", sourceMediumId);
        const deletedEpisodesResult = await this.query("DELETE e FROM episode as e, part as p" +
            " WHERE e.part_id = p.id" +
            " AND p.medium_id = ?", sourceMediumId);
        const deletedMediumResult = await this.query("DELETE FROM medium" +
            " WHERE medium_id = ?", sourceMediumId);
        return true;
    }
    async splitMedium(sourceMediumId, destMedium, toc) {
        if (!destMedium || !destMedium.medium || !destMedium.title) {
            return Promise.reject(new Error(tools_1.Errors.INVALID_INPUT));
        }
        const result = await this.query("INSERT IGNORE INTO medium(medium, title) VALUES (?,?);", [destMedium.medium, destMedium.title]);
        if (!Number.isInteger(result.insertId)) {
            throw Error(`invalid ID: ${result.insertId}`);
        }
        let mediumId;
        // medium exists already if insertId == 0
        if (result.insertId === 0) {
            const realMedium = await this.query("SELECT id FROM medium WHERE (medium, title) = (?,?);", [destMedium.medium, destMedium.title]);
            if (!realMedium.length) {
                throw Error("Expected a MediumId, but got nothing");
            }
            mediumId = realMedium[0].id;
        }
        else {
            await this.parentContext.partContext.createStandardPart(result.insertId);
            mediumId = result.insertId;
        }
        return this.transferToc(sourceMediumId, mediumId, toc);
    }
    async transferToc(sourceMediumId, destMediumId, toc) {
        const domainRegMatch = /https?:\/\/(.+?)(\/|$)/.exec(toc);
        if (!domainRegMatch) {
            throw Error("Invalid Toc, Unable to extract Domain: " + toc);
        }
        const domain = domainRegMatch[1];
        await this.parentContext.jobContext.removeJobLike("name", `toc-${sourceMediumId}-${toc}`);
        const standardPartId = await this.parentContext.partContext.getStandardPartId(destMediumId);
        if (!standardPartId) {
            throw Error("medium does not have a standard part");
        }
        const updatedTocResult = await this.query("UPDATE IGNORE medium_toc SET medium_id = ? WHERE (medium_id, link) = (?,?);", [destMediumId, sourceMediumId, toc]);
        const releases = await this.parentContext.episodeContext.getEpisodeLinksByMedium(sourceMediumId);
        const episodeMap = new Map();
        const valueCb = () => [];
        for (const release of releases) {
            tools_1.getElseSet(episodeMap, release.episodeId, valueCb).push(release.url);
        }
        const copyEpisodes = [];
        const removeEpisodesAfter = [];
        for (const [episodeId, links] of episodeMap.entries()) {
            const toMoveCount = tools_1.count(links, (value) => value.includes(domain));
            if (toMoveCount) {
                copyEpisodes.push(episodeId);
                if (links.length === toMoveCount) {
                    removeEpisodesAfter.push(episodeId);
                }
            }
        }
        // add the episodes of the releases
        const copyEpisodesResult = await this.queryInList("INSERT IGNORE INTO episode" +
            " (part_id, totalIndex, partialIndex, combiIndex, updated_at)" +
            ` SELECT ${mysql_1.escape(standardPartId)}, episode.totalIndex, episode.partialIndex, episode.combiIndex, episode.updated_at` +
            " FROM episode INNER JOIN part ON part.id=episode.part_id" +
            ` WHERE part.medium_id = ${mysql_1.escape(sourceMediumId)} AND episode.id`, copyEpisodes);
        const updatedReleaseResult = await this.query("UPDATE episode_release, episode as src_e, episode as dest_e, part" +
            " SET episode_release.episode_id = dest_e.id" +
            " WHERE episode_release.episode_id = src_e.id" +
            " AND src_e.part_id = part.id" +
            " AND part.medium_id = ?" +
            " AND dest_e.part_id = ?" +
            " AND src_e.combiIndex = dest_e.combiIndex" +
            " AND locate(?,episode_release.url) > 0;", [sourceMediumId, standardPartId, domain]);
        const updatedProgressResult = await this.queryInList("UPDATE user_episode, episode as src_e, episode as dest_e, part" +
            " SET user_episode.episode_id = dest_e.id" +
            " WHERE user_episode.episode_id = src_e.id" +
            " AND src_e.part_id = part.id" +
            ` AND part.medium_id = ${mysql_1.escape(sourceMediumId)}` +
            ` AND dest_e.part_id = ${mysql_1.escape(standardPartId)}` +
            " AND src_e.combiIndex = dest_e.combiIndex" +
            " AND src_e.id", removeEpisodesAfter);
        const updatedResultResult = await this.queryInList("UPDATE result_episode, episode as src_e, episode as dest_e, part" +
            " SET result_episode.episode_id = dest_e.id" +
            " WHERE result_episode.episode_id = src_e.id" +
            " AND src_e.part_id = part.id" +
            ` AND part.medium_id = ${mysql_1.escape(sourceMediumId)}` +
            ` AND dest_e.part_id = ${mysql_1.escape(standardPartId)}` +
            " AND src_e.combiIndex = dest_e.combiIndex" +
            " AND src_e.id", removeEpisodesAfter);
        const deletedEpisodesResult = await this.queryInList("DELETE FROM episode WHERE episode.id", removeEpisodesAfter);
        const copiedOnlyEpisodes = copyEpisodes.filter((value) => !removeEpisodesAfter.includes(value));
        const copiedProgressResult = await this.queryInList("INSERT IGNORE INTO user_episode" +
            " (user_uuid, episode_id, progress, read_date)" +
            " SELECT user_episode.user_uuid, dest_e.id, user_episode.progress, user_episode.read_date" +
            " FROM user_episode, episode as src_e, episode as dest_e, part" +
            " WHERE user_episode.episode_id = src_e.id" +
            " AND src_e.part_id = part.id" +
            ` AND part.medium_id = ${mysql_1.escape(sourceMediumId)}` +
            ` AND dest_e.part_id = ${mysql_1.escape(standardPartId)}` +
            " AND src_e.combiIndex = dest_e.combiIndex" +
            " AND src_e.id", copiedOnlyEpisodes);
        const copiedResultResult = await this.queryInList("INSERT IGNORE INTO result_episode" +
            " (novel, chapter, chapIndex, volIndex, volume, episode_id)" +
            " SELECT result_episode.novel, result_episode.chapter, result_episode.chapIndex," +
            " result_episode.volIndex, result_episode.volume, dest_e.id" +
            " FROM result_episode, episode as src_e, episode as dest_e, part" +
            " WHERE result_episode.episode_id = src_e.id" +
            " AND src_e.part_id = part.id" +
            ` AND part.medium_id = ${mysql_1.escape(sourceMediumId)}` +
            ` AND dest_e.part_id = ${mysql_1.escape(standardPartId)}` +
            " AND src_e.combiIndex = dest_e.combiIndex" +
            " AND src_e.id", copiedOnlyEpisodes);
        return true;
    }
}
exports.MediumContext = MediumContext;
//# sourceMappingURL=mediumContext.js.map