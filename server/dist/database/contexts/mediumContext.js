"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const subContext_1 = require("./subContext");
const tools_1 = require("../../tools");
const storageTools_1 = require("../storages/storageTools");
class MediumContext extends subContext_1.SubContext {
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
        return this.update("medium", (updates, values) => {
            for (const key of Object.keys(medium)) {
                if (key === "synonyms" || key === "id") {
                    continue;
                }
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
    getAllMediaTocs() {
        return this.query("SELECT id, link FROM medium LEFT JOIN medium_toc ON medium.id=medium_toc.medium_id");
    }
    getAllTocs() {
        return this.query("SELECT medium_id as id, link FROM medium_toc");
    }
}
exports.MediumContext = MediumContext;
//# sourceMappingURL=mediumContext.js.map