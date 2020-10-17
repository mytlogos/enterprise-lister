import {SubContext} from "./subContext";
import {Episode, FullPart, MinPart, MultiSingle, Part, ShallowPart, SimpleEpisode} from "../../types";
import mySql from "promise-mysql";
import {combiIndex, getElseSetObj, multiSingle, separateIndex} from "../../tools";
import {Query} from "mysql";

export class PartContext extends SubContext {
    public async getAll(): Promise<Query> {
        return this.queryStream(
            "SELECT id, totalIndex, partialIndex, title, medium_id as mediumId FROM part"
        );
    }

    public async getStandardPartId(mediumId: number): Promise<number | undefined> {
        const [standardPartResult]: any = await this.query(
            "SELECT id FROM part WHERE medium_id = ? AND totalIndex=-1",
            mediumId
        );
        return standardPartResult ? standardPartResult.id : undefined;
    }

    public async getStandardPart(mediumId: number): Promise<ShallowPart | undefined> {
        const [standardPartResult]: any = await this.query(
            "SELECT * FROM part WHERE medium_id = ? AND totalIndex=-1",
            mediumId
        );

        if (!standardPartResult) {
            return;
        }

        const episodesIds: Array<{ id: number; partId: number }> | undefined = await this.queryInList(
            "SELECT id, part_id as partId FROM episode WHERE part_id",
            standardPartResult.id,
        );

        const standardPart: ShallowPart = {
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

    public async getMediumPartIds(mediumId: number): Promise<number[]> {
        const result: any[] = await this.query("SELECT id FROM part WHERE medium_id = ?;", mediumId);
        return result.map((value) => value.id);
    }

    /**
     * Returns all parts of an medium.
     */
    public async getMediumParts(mediumId: number, uuid?: string): Promise<Part[]> {
        const parts: any[] = await this.query("SELECT * FROM part WHERE medium_id = ?", mediumId);

        const idMap = new Map<number, FullPart>();

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
        const episodesIds: Array<{ id: number; partId: number }> | undefined = await this.queryInList(
            "SELECT id, part_id as partId FROM episode WHERE part_id",
            parts,
            undefined,
            (value) => value.id
        );

        if (episodesIds) {
            if (uuid) {
                const values = episodesIds.map((episode: any): number => episode.id);
                const episodes = await this.parentContext.episodeContext.getEpisode(values, uuid);
                episodes.forEach((value) => {
                    const part = idMap.get(value.partId);
                    if (!part) {
                        throw Error(`no part ${value.partId} found even though only available episodes were queried`);
                    }
                    part.episodes.push(value);
                });
            } else {
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
    public async getMediumPartsPerIndex(mediumId: number, partCombiIndex: MultiSingle<number>): Promise<MinPart[]> {
        const parts: any[] | undefined = await this.queryInList(
            "SELECT * FROM part " +
            `WHERE medium_id = ${mySql.escape(mediumId)} AND combiIndex `,
            partCombiIndex
        );
        if (!parts || !parts.length) {
            return [];
        }

        // @ts-ignore
        multiSingle(partCombiIndex, (combinedIndex: number) => {
            if (parts.every((part) => part.combiIndex !== combinedIndex)) {
                const separateValue = separateIndex(combinedIndex);
                parts.push(separateValue);
            }
        });

        return parts.map((value): MinPart => {
            return {
                id: value.id,
                totalIndex: value.totalIndex,
                partialIndex: value.partialIndex,
                title: value.title,
                mediumId: value.medium_id,
            };
        });
    }

    public getParts(partId: number, uuid: string): Promise<Part>;
    public getParts(partId: number[], uuid: string): Promise<Part[]>;

    /**
     * Returns all parts of an medium.
     */
    public async getParts(partId: number | number[], uuid: string): Promise<Part[] | Part> {
        const parts: any[] | undefined = await this.queryInList("SELECT * FROM part WHERE id", partId);
        if (!parts || !parts.length) {
            return [];
        }
        const partIdMap = new Map<number, any>();
        const episodesResult: any[] | undefined = await this.queryInList(
            "SELECT id FROM episode WHERE part_id ",
            parts,
            undefined,
            (value) => {
                partIdMap.set(value.id, value);
                return value.id;
            }
        );

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
    public async getPartItems(partIds: number[]): Promise<{ [key: number]: number[] }> {
        if (!partIds.length) {
            return {};
        }
        const episodesResult: Array<{ id: number; part_id: number }> | undefined = await this.queryInList(
            "SELECT id, part_id FROM episode WHERE part_id ",
            partIds
        );

        const episodes = episodesResult || [];
        const result = {};

        episodes.forEach((value) => {
            (getElseSetObj(result, value.part_id, () => []) as number[]).push(value.id);
        });
        for (const partId of partIds) {
            getElseSetObj(result, partId, () => []);
        }
        return result;
    }

    /**
     * Returns all parts of an medium.
     */
    public async getPartReleases(partIds: number[]): Promise<{ [key: number]: Array<{ id: number; url: string }> }> {
        if (!partIds.length) {
            return {};
        }
        const episodesResult: Array<{ id: number; url: string; part_id: number }> | undefined = await this.queryInList(
            "SELECT id, part_id, url FROM episode_release INNER JOIN episode ON id = episode_id WHERE part_id ",
            partIds
        );

        const episodes = episodesResult || [];
        const result = {};

        episodes.forEach((value) => {
            const items = getElseSetObj(result, value.part_id, () => []) as any[];
            delete value.part_id;
            items.push(value);
        });

        for (const partId of partIds) {
            getElseSetObj(result, partId, () => []);
        }
        return result;
    }

    public async getOverLappingParts(standardId: number, nonStandardPartIds: number[]): Promise<number[]> {
        if (!nonStandardPartIds.length) {
            return [];
        }
        const results = await this.queryInList(
            "SELECT part_id FROM episode WHERE combiIndex IN" +
            `(SELECT combiIndex FROM episode WHERE part_id = ${mySql.escape(standardId)}) ` +
            "AND part_id",
            nonStandardPartIds,
            "group by part_id"
        );
        if (!results) {
            return [];
        }
        return results.map((value) => value.part_id);
    }

    /**
     * Adds a part of an medium to the storage.
     */
    public async addPart(part: Part): Promise<Part> {
        if (part.totalIndex === -1) {
            return this.createStandardPart(part.mediumId);
        }
        let partId: number;
        const partCombiIndex = combiIndex(part);

        try {
            const result = await this.query(
                "INSERT INTO part (medium_id, title, totalIndex, partialIndex, combiIndex) VALUES (?,?,?,?,?);",
                [part.mediumId, part.title, part.totalIndex, part.partialIndex, partCombiIndex],
            );
            partId = result.insertId;
        } catch (e) {
            // do not catch if it isn't an duplicate key error
            if (!e || (e.errno !== 1062 && e.errno !== 1022)) {
                throw e;
            }
            const result = await this.query(
                "SELECT id from part where medium_id=? and combiIndex=?",
                [part.mediumId, partCombiIndex]
            );
            partId = result[0].id;
        }

        if (!Number.isInteger(partId) || partId <= 0) {
            throw Error(`invalid ID ${partId}`);
        }
        let episodes: Episode[];

        if (part.episodes && part.episodes.length) {
            // @ts-ignore
            if (!Number.isInteger(part.episodes[0])) {
                episodes = await this.parentContext.episodeContext.addEpisode(part.episodes as SimpleEpisode[]);
            } else {
                episodes = [];
            }
        } else {
            episodes = [];
        }
        return {
            mediumId: part.mediumId,
            id: partId,
            title: part.title,
            partialIndex: part.partialIndex,
            totalIndex: part.totalIndex,
            episodes,
        } as FullPart;
    }

    /**
     * Updates a part.
     */
    public updatePart(part: Part): Promise<boolean> {
        return this.update(
            "part", 
            (updates, values) => {
                if (part.title) {
                    updates.push("title = ?");
                    values.push(part.title);
                } else { // noinspection JSValidateTypes
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
            },
            {
                column: "id",
                value: part.id
            }
        );
    }

    /**
     * Deletes a part from the storage.
     */
    public async deletePart(id: number): Promise<boolean> {
        // TODO delete all episode in this part or just transfer them to the "all" part?
        return false;
    }

    public createStandardPart(mediumId: number): Promise<ShallowPart> {
        const partName = "Non Indexed Volume";
        return this.query(
            "INSERT IGNORE INTO part (medium_id,title, totalIndex, combiIndex) VALUES (?,?,?,?);",
            [mediumId, partName, -1, -1]
        ).then((value): ShallowPart => {
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
