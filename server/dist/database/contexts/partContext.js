"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const subContext_1 = require("./subContext");
const promise_mysql_1 = tslib_1.__importDefault(require("promise-mysql"));
const tools_1 = require("../../tools");
class PartContext extends subContext_1.SubContext {
    async getStandardPartId(mediumId) {
        const [standardPartResult] = await this.query("SELECT id FROM part WHERE medium_id = ? AND totalIndex=-1", mediumId);
        return standardPartResult ? standardPartResult.id : undefined;
    }
    async getStandardPart(mediumId) {
        const [standardPartResult] = await this.query("SELECT * FROM part WHERE medium_id = ? AND totalIndex=-1", mediumId);
        if (!standardPartResult) {
            return;
        }
        const episodesIds = await this.queryInList("SELECT id, part_id as partId FROM episode WHERE part_id", standardPartResult.id);
        const standardPart = {
            id: standardPartResult.id,
            totalIndex: standardPartResult.totalIndex,
            partialIndex: standardPartResult.partialIndex,
            title: standardPartResult.title,
            episodes: [],
            mediumId: standardPartResult.medium_id,
        };
        if (episodesIds) {
            episodesIds.forEach((value) => standardPart.episodes.push(value.id));
        }
        return standardPart;
    }
    async getMediumPartIds(mediumId) {
        const result = await this.query("SELECT id FROM part WHERE medium_id = ?;", mediumId);
        return result.map((value) => value.id);
    }
    /**
     * Returns all parts of an medium.
     */
    async getMediumParts(mediumId, uuid) {
        const parts = await this.query("SELECT * FROM part WHERE medium_id = ?", mediumId);
        const idMap = new Map();
        // recreate shallow parts
        const fullParts = parts.map((value) => {
            const part = {
                id: value.id,
                totalIndex: value.totalIndex,
                partialIndex: value.partialIndex,
                title: value.title,
                episodes: [],
                mediumId: value.medium_id,
            };
            idMap.set(value.id, part);
            return part;
        });
        const episodesIds = await this.queryInList("SELECT id, part_id as partId FROM episode WHERE part_id", parts, undefined, (value) => value.id);
        if (episodesIds) {
            if (uuid) {
                const values = episodesIds.map((episode) => episode.id);
                const episodes = await this.parentContext.episodeContext.getEpisode(values, uuid);
                episodes.forEach((value) => {
                    const part = idMap.get(value.partId);
                    if (!part) {
                        throw Error(`no part ${value.partId} found even though only available episodes were queried`);
                    }
                    part.episodes.push(value);
                });
            }
            else {
                episodesIds.forEach((value) => {
                    const part = idMap.get(value.partId);
                    if (!part) {
                        throw Error(`no part ${value.partId} found even though only available episodes were queried`);
                    }
                    // @ts-ignore
                    part.episodes.push(value.id);
                });
            }
        }
        return fullParts;
    }
    /**
     * Returns all parts of an medium with specific totalIndex.
     * If there is no such part, it returns an object with only the totalIndex as property.
     */
    async getMediumPartsPerIndex(mediumId, index) {
        const parts = await this.queryInList("SELECT * FROM part " +
            `WHERE medium_id = ${promise_mysql_1.default.escape(mediumId)} AND combiIndex `, index);
        if (!parts || !parts.length) {
            return [];
        }
        const partIdMap = new Map();
        const indexMap = new Map();
        parts.forEach((value) => {
            partIdMap.set(value.id, value);
            indexMap.set(value.combiIndex, true);
        });
        // @ts-ignore
        tools_1.multiSingle(index, (value) => {
            if (parts.every((part) => part.combiIndex !== value)) {
                const separateValue = tools_1.separateIndex(value);
                parts.push(separateValue);
            }
        });
        // @ts-ignore
        return parts.map((value) => {
            return {
                id: value.id,
                totalIndex: value.totalIndex,
                partialIndex: value.partialIndex,
                title: value.title,
                mediumId: value.medium_id,
            };
        });
    }
    /**
     * Returns all parts of an medium.
     */
    async getParts(partId, uuid) {
        const parts = await this.queryInList("SELECT * FROM part WHERE id", partId);
        if (!parts || !parts.length) {
            return [];
        }
        const partIdMap = new Map();
        const episodesResult = await this.queryInList("SELECT id FROM episode WHERE part_id ", parts, undefined, (value) => {
            partIdMap.set(value.id, value);
            return value.id;
        });
        const episodes = episodesResult || [];
        if (episodes) {
            const episodeIds = episodes.map((value) => value.id);
            const fullEpisodes = await this.parentContext.episodeContext.getEpisode(episodeIds, uuid);
            fullEpisodes.forEach((value) => {
                const part = partIdMap.get(value.partId);
                if (!part) {
                    throw Error("missing part for queried episode");
                }
                if (!part.episodes) {
                    part.episodes = [];
                }
                part.episodes.push(value);
            });
        }
        return parts.map((part) => {
            return {
                id: part.id,
                totalIndex: part.totalIndex,
                partialIndex: part.partialIndex,
                title: part.title,
                episodes: part.episodes || [],
                mediumId: part.medium_id,
            };
        });
    }
    /**
     * Returns all parts of an medium.
     */
    async getPartItems(partIds) {
        if (!partIds.length) {
            return {};
        }
        const episodesResult = await this.queryInList("SELECT id, part_id FROM episode WHERE part_id ", partIds);
        const episodes = episodesResult || [];
        const result = {};
        episodes.forEach((value) => {
            tools_1.getElseSetObj(result, value.part_id, () => []).push(value.id);
        });
        for (const partId of partIds) {
            tools_1.getElseSetObj(result, partId, () => []);
        }
        return result;
    }
    /**
     * Returns all parts of an medium.
     */
    async getPartReleases(partIds) {
        if (!partIds.length) {
            return {};
        }
        const episodesResult = await this.queryInList("SELECT id, part_id, url FROM episode_release INNER JOIN episode ON id = episode_id WHERE part_id ", partIds);
        const episodes = episodesResult || [];
        const result = {};
        episodes.forEach((value) => {
            const items = tools_1.getElseSetObj(result, value.part_id, () => []);
            delete value.part_id;
            items.push(value);
        });
        for (const partId of partIds) {
            tools_1.getElseSetObj(result, partId, () => []);
        }
        return result;
    }
    async getOverLappingParts(standardId, nonStandardPartIds) {
        if (!nonStandardPartIds.length) {
            return [];
        }
        const results = await this.queryInList("SELECT part_id FROM episode WHERE combiIndex IN" +
            `(SELECT combiIndex FROM episode WHERE part_id = ${promise_mysql_1.default.escape(standardId)}) ` +
            "AND part_id", nonStandardPartIds, "group by part_id");
        if (!results) {
            return [];
        }
        return results.map((value) => value.part_id);
    }
    /**
     * Adds a part of an medium to the storage.
     */
    async addPart(part) {
        if (part.totalIndex === -1) {
            return this.createStandardPart(part.mediumId);
        }
        let partId;
        const partCombiIndex = tools_1.combiIndex(part);
        try {
            const result = await this.query("INSERT INTO part (medium_id, title, totalIndex, partialIndex, combiIndex) VALUES (?,?,?,?,?);", [part.mediumId, part.title, part.totalIndex, part.partialIndex, partCombiIndex]);
            partId = result.insertId;
        }
        catch (e) {
            // do not catch if it isn't an duplicate key error
            if (!e || (e.errno !== 1062 && e.errno !== 1022)) {
                throw e;
            }
            const result = await this.query("SELECT id from part where medium_id=? and combiIndex=?", [part.mediumId, partCombiIndex]);
            partId = result[0].id;
        }
        if (!Number.isInteger(partId) || partId <= 0) {
            throw Error(`invalid ID ${partId}`);
        }
        let episodes;
        if (part.episodes && part.episodes.length) {
            // @ts-ignore
            if (!Number.isInteger(part.episodes[0])) {
                episodes = await this.parentContext.episodeContext.addEpisode(part.episodes);
            }
            else {
                episodes = [];
            }
        }
        else {
            episodes = [];
        }
        return {
            mediumId: part.mediumId,
            id: partId,
            title: part.title,
            partialIndex: part.partialIndex,
            totalIndex: part.totalIndex,
            episodes,
        };
    }
    /**
     * Updates a part.
     */
    updatePart(part) {
        return this.update("part", (updates, values) => {
            if (part.title) {
                updates.push("title = ?");
                values.push(part.title);
            }
            else { // noinspection JSValidateTypes
                if (part.title === null) {
                    updates.push("title = NULL");
                }
            }
            if (part.partialIndex) {
                updates.push("partialIndex = ?");
                values.push(part.partialIndex);
            }
            if (part.totalIndex) {
                updates.push("totalIndex = ?");
                values.push(part.totalIndex);
            }
        }, {
            column: "id",
            value: part.id
        });
    }
    /**
     * Deletes a part from the storage.
     */
    async deletePart(id) {
        // todo delete all episode in this part or just transfer them to the "all" part?
        return false;
    }
    createStandardPart(mediumId) {
        const partName = "Non Indexed Volume";
        return this.query("INSERT IGNORE INTO part (medium_id,title, totalIndex, combiIndex) VALUES (?,?,?,?);", [mediumId, partName, -1, -1]).then((value) => {
            return {
                totalIndex: -1,
                title: partName,
                id: value.insertId,
                mediumId,
                episodes: []
            };
        });
    }
}
exports.PartContext = PartContext;
//# sourceMappingURL=partContext.js.map