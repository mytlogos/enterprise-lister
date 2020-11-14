import {SubContext} from "./subContext";
import {
    FullMediumToc,
    LikeMedium,
    LikeMediumQuery,
    Medium,
    SimpleMedium,
    Synonyms,
    TocSearchMedium,
    UpdateMedium,
    Uuid,
    SecondaryMedium
} from "../../types";
import {count, Errors, getElseSet, invalidId, multiSingle, promiseMultiSingle} from "../../tools";
import {escapeLike} from "../storages/storageTools";
import {escape, Query} from "mysql";
import { storeModifications } from "../sqlTools";

export class MediumContext extends SubContext {
    public async removeToc(tocLink: string): Promise<void> {
        const result = await this.query("DELETE FROM medium_toc WHERE link = ?", tocLink);
        storeModifications("toc", "delete", result);
    }

    /**
     * Adds a medium to the storage.
     */
    public async addMedium(medium: SimpleMedium, uuid?: Uuid): Promise<SimpleMedium> {
        if (!medium || !medium.medium || !medium.title) {
            return Promise.reject(new Error(Errors.INVALID_INPUT));
        }
        const result = await this.query(
            "INSERT INTO medium(medium, title) VALUES (?,?);",
            [medium.medium, medium.title],
        );
        if (!Number.isInteger(result.insertId)) {
            throw Error(`invalid ID: ${result.insertId}`);
        }
        storeModifications("medium", "insert", result);

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

    public getSimpleMedium(id: number | number[]): Promise<SimpleMedium | SimpleMedium[]> {
        // TODO: 29.06.2019 replace with id IN (...)
        // @ts-ignore
        return promiseMultiSingle(id, async (mediumId) => {
            const resultArray: any[] = await this.query("SELECT * FROM medium WHERE medium.id =?;", mediumId);
            const result = resultArray[0];

            if (!result) {
                throw Error(`Medium with id ${mediumId} does not exist`);
            }
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

    public async getTocSearchMedia(): Promise<TocSearchMedium[]> {
        const result: Array<{ host?: string; mediumId: number; title: string; medium: number }> = await this.query(
            "SELECT substring(episode_release.url, 1, locate(\"/\",episode_release.url,9)) as host, " +
            "medium.id as mediumId, medium.title, medium.medium " +
            "FROM medium " +
            "LEFT JOIN part ON part.medium_id=medium.id " +
            "LEFT JOIN episode ON part_id=part.id " +
            "LEFT JOIN episode_release ON episode_release.episode_id=episode.id " +
            "GROUP BY mediumId, host;"
        );
        const idMap = new Map<number, TocSearchMedium>();
        const tocSearchMedia = result.map((value) => {
            const medium = idMap.get(value.mediumId);
            if (medium) {
                if (medium.hosts && value.host) {
                    medium.hosts.push(value.host);
                }
                return false;
            }
            const searchMedium: TocSearchMedium = {
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
        }).filter((value) => value) as any[] as TocSearchMedium[];
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
            } else {
                medium.synonyms.push(value.synonym);
            }
        });
        return tocSearchMedia;
    }

    public async getTocSearchMedium(id: number): Promise<TocSearchMedium> {
        const resultArray: any[] = await this.query("SELECT * FROM medium WHERE medium.id =?;", id);
        const result = resultArray[0];
        const synonyms: Synonyms[] = await this.getSynonyms(id);

        return {
            mediumId: result.id,
            medium: result.medium,
            title: result.title,
            synonyms: (synonyms[0] && synonyms[0].synonym) as string[] || []
        };
    }

    public getMedium(id: number, uuid: Uuid): Promise<Medium>;

    public getMedium(id: number[], uuid: Uuid): Promise<Medium[]>;

    /**
     * Gets one or multiple media from the storage.
     */
    public getMedium(id: number | number[], uuid: Uuid): Promise<Medium | Medium[]> {
        // TODO: 29.06.2019 replace with id IN (...)
        // @ts-ignore
        return promiseMultiSingle(id, async (mediumId: number) => {
            let result = await this.query("SELECT * FROM medium WHERE medium.id=?;", mediumId);
            result = result[0];

            const latestReleasesResult = await this.parentContext.episodeContext.getLatestReleases(mediumId);

            const currentReadResult = await this.query(
                "SELECT * FROM " +
                "(SELECT * FROM user_episode " +
                "WHERE episode_id IN (SELECT id from episode " +
                "WHERE part_id IN (SELECT id FROM part " +
                "WHERE medium_id=?))) as user_episode " +
                "INNER JOIN episode ON user_episode.episode_id=episode.id " +
                "WHERE user_uuid=? " +
                "ORDER BY totalIndex DESC, partialIndex DESC LIMIT 1",
                [mediumId, uuid]
            );
            const unReadResult = await this.query(
                "SELECT * FROM episode WHERE part_id IN (SELECT id FROM part WHERE medium_id=?) " +
                "AND id NOT IN (SELECT episode_id FROM user_episode WHERE user_uuid=?) " +
                "ORDER BY totalIndex DESC, partialIndex DESC;",
                [mediumId, uuid]
            );
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
                parts: partsResult.map((packet: any) => packet.id),
                currentRead: currentReadResult[0] ? currentReadResult[0].episode_id : undefined,
                latestReleases: latestReleasesResult.map((packet: any) => packet.id),
                unreadEpisodes: unReadResult.map((packet: any) => packet.id),
            };
        });
    }

    public async getAllMediaFull(): Promise<Query> {
        return this.queryStream(
            "SELECT " +
            "id, countryOfOrigin, languageOfOrigin, author, title," +
            "medium, artist, lang, stateOrigin, stateTL, series, universe " +
            "FROM medium"
        );
    }

    public async getAllSecondary(uuid: Uuid): Promise<SecondaryMedium[]> {
        const readStatsPromise = this.query(
            "SELECT part.medium_id as id, COUNT(part.medium_id) as totalEpisodes, COUNT(user.episode_id) as readEpisodes " +
            "FROM part " +
            "INNER JOIN episode ON part.id=episode.part_id " +
            "LEFT JOIN (SELECT * FROM user_episode WHERE ? = user_uuid AND progress = 1) as user ON user.episode_id=episode.id " + 
            "GROUP BY part.medium_id;",
            uuid
        );
        const tocs = await this.query(
            "SELECT id, medium_id as mediumId, link, " +
            "countryOfOrigin, languageOfOrigin, author, title," +
            "medium, artist, lang, stateOrigin, stateTL, series, universe " +
            "FROM medium_toc;",
        ) as FullMediumToc[];
        const readStats: Array<{ id: number; totalEpisode: number; readEpisodes: number }> = await readStatsPromise;
        const idMap = new Map<number, SecondaryMedium>();

        for (const value of readStats) {
            const secondary = value as unknown as SecondaryMedium;
            secondary.tocs = []
            idMap.set(value.id, secondary);
        }

        for (const toc of tocs) {
            let secondary = idMap.get(toc.mediumId);
            if (!secondary) {
                secondary = {id: toc.mediumId, readEpisodes: 0, totalEpisodes: 0, tocs: []};
            }
            secondary.tocs.push(toc);
        }

        return [...idMap.values()];
    }

    public async getAllMedia(): Promise<number[]> {
        const result: Array<{ id: number }> = await this.query("SELECT id FROM medium");
        return result.map((value) => value.id);
    }

    public getLikeMedium(likeMedia: LikeMediumQuery): Promise<LikeMedium>;

    public getLikeMedium(likeMedia: LikeMediumQuery[]): Promise<LikeMedium[]>;

    /**
     * Gets one or multiple media from the storage.
     */
    public getLikeMedium(likeMedia: LikeMediumQuery | LikeMediumQuery[])
        : Promise<LikeMedium | LikeMedium[]> {

        // @ts-ignore
        return promiseMultiSingle(likeMedia, async (value: LikeMediumQuery) => {
            const escapedLinkQuery = escapeLike(value.link || "", {noRightBoundary: true});
            const escapedTitle = escapeLike(value.title, {singleQuotes: true});

            let result: any[] = await this.query(
                "SELECT id,medium FROM medium WHERE title LIKE ? OR id IN " +
                "(SELECT medium_id FROM medium_toc WHERE medium_id IS NOT NULL AND link LIKE ?);",
                [escapedTitle, escapedLinkQuery]);

            if (value.type != null) {
                result = result.filter((medium: any) => medium.medium === value.type);
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
    public async updateMediumToc(mediumToc: FullMediumToc): Promise<boolean> {
        const keys = [
            "countryOfOrigin", "languageOfOrigin", "author", "title", "medium",
            "artist", "lang", "stateOrigin", "stateTL", "series", "universe"
        ];

        if (invalidId(mediumToc.mediumId) || !mediumToc.link) {
            throw Error("invalid medium_id or link is invalid: " + JSON.stringify(mediumToc));
        }
        const conditions = [];

        if (invalidId(mediumToc.id)) {
            conditions.push({column: "medium_id", value: mediumToc.mediumId});
            conditions.push({column: "link", value: mediumToc.link});
        } else {
            conditions.push({column: "id", value: mediumToc.id});
        }
        const result = await this.update("medium_toc", (updates, values) => {
            for (const key of keys) {
                const value = mediumToc[key];

                if (value === null) {
                    updates.push(`${key} = NULL`);
                } else if (value != null) {
                    updates.push(`${key} = ?`);
                    values.push(value);
                }
            }
        }, ...conditions);
        storeModifications("toc", "update", result);
        return result.changedRows > 0;
    }

    /**
     * Updates a medium from the storage.
     */
    public async updateMedium(medium: UpdateMedium): Promise<boolean> {
        const keys = [
            "countryOfOrigin", "languageOfOrigin", "author", "title", "medium",
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
        const result = await this.update("medium", (updates, values) => {
            for (const key of keys) {
                const value = medium[key];

                if (value === null) {
                    updates.push(`${key} = NULL`);
                } else if (value != null) {
                    updates.push(`${key} = ?`);
                    values.push(value);
                }
            }
        }, {column: "id", value: medium.id});
        storeModifications("medium", "update", result);
        return result.changedRows > 0;
    }

    public async getSynonyms(mediumId: number | number[]): Promise<Synonyms[]> {
        // TODO: 29.06.2019 replace with 'medium_id IN (list)'
        const synonyms = await this.queryInList("SELECT * FROM medium_synonyms WHERE medium_id ", mediumId);
        if (!synonyms) {
            return [];
        }
        const synonymMap = new Map<number, { mediumId: number; synonym: string[] }>();
        synonyms.forEach((value: any) => {
            let synonym = synonymMap.get(value.medium_id);
            if (!synonym) {
                synonym = {mediumId: value.medium_id, synonym: []};
                synonymMap.set(value.medium_id, synonym);
            }
            synonym.synonym.push(value.synonym);
        });
        return [...synonymMap.values()];
    }

    public removeSynonyms(synonyms: Synonyms | Synonyms[]): Promise<boolean> {
        // @ts-ignore
        return promiseMultiSingle(synonyms, (value: Synonyms) => {
            return promiseMultiSingle(value.synonym, async (item) => {
                const result = await this.delete("medium_synonyms",
                    {
                        column: "synonym",
                        value: item
                    },
                    {
                        column: "medium_id",
                        value: value.mediumId
                    });
                storeModifications("synonym", "delete", result);
                return result.affectedRows > 0;
            });
        }).then(() => true);
    }

    public async addSynonyms(synonyms: Synonyms | Synonyms[]): Promise<boolean> {
        const params: Array<[number, string]> = [];
        // @ts-ignore
        multiSingle(synonyms, (value: Synonyms) => {
            // @ts-ignore
            multiSingle(value.synonym, (item: string) => {
                params.push([value.mediumId, item]);
            });
        });
        const result = await this.multiInsert(
            "INSERT IGNORE INTO medium_synonyms (medium_id, synonym) VALUES",
            params,
            (value) => value
        );
        // @ts-expect-error
        multiSingle(result, (value) => storeModifications("synonym", "insert", value));
        return true;
    }

    public async addToc(mediumId: number, link: string): Promise<void> {
        const result = await this.query(
            "INSERT IGNORE INTO medium_toc (medium_id, link) VAlUES (?,?)",
            [mediumId, link]
        );
        storeModifications("toc", "insert", result);
    }

    public async getToc(mediumId: number): Promise<string[]> {
        const resultArray: any[] = await this.query("SELECT link FROM medium_toc WHERE medium_id=?", mediumId);
        return resultArray.map((value) => value.link).filter((value) => value);
    }

    public getMediumTocs(mediumId: number[]): Promise<FullMediumToc[]> {
        return this.queryInList(
            "SELECT id, medium_id as mediumId, link, " +
            "countryOfOrigin, languageOfOrigin, author, title," +
            "medium, artist, lang, stateOrigin, stateTL, series, universe " +
            "FROM medium_toc WHERE medium_id ",
            mediumId
        ) as Promise<FullMediumToc[]>;
    }

    public async removeMediumToc(mediumId: number, link: string): Promise<boolean> {
        const domainRegMatch = /https?:\/\/(.+?)(\/|$)/.exec(link);

        if (!domainRegMatch) {
            throw Error("Invalid Toc, Unable to extract Domain: " + link);
        }

        await this.parentContext.jobContext.removeJobLike("name", `toc-${mediumId}-${link}`);
        const domain = domainRegMatch[1];

        const releases = await this.parentContext.episodeContext.getEpisodeLinksByMedium(mediumId);
        const episodeMap: Map<number, string[]> = new Map();
        const valueCb = () => [];

        for (const release of releases) {
            getElseSet(episodeMap, release.episodeId, valueCb).push(release.url);
        }
        const removeEpisodesAfter: number[] = [];

        for (const [episodeId, links] of episodeMap.entries()) {
            const toMoveCount = count(links, (value) => value.includes(domain));

            if (toMoveCount) {
                if (links.length === toMoveCount) {
                    removeEpisodesAfter.push(episodeId);
                }
            }
        }
        const deletedReleaseResult = await this.query(
            "DELETE er FROM episode_release as er, episode as e, part as p" +
            " WHERE er.episode_id = e.id" +
            " AND e.part_id = p.id" +
            " AND p.medium_id = ?" +
            " AND locate(?,er.url) > 0;",
            [mediumId, domain]
        );
        storeModifications("release", "delete", deletedReleaseResult);

        const deletedProgressResult = await this.queryInList(
            "DELETE ue FROM user_episode as ue, episode as e, part as p" +
            " WHERE ue.episode_id = e.id" +
            " AND e.part_id = p.id" +
            ` AND p.medium_id = ${escape(mediumId)}` +
            " AND e.id",
            removeEpisodesAfter
        );
        // @ts-expect-error
        multiSingle(deletedProgressResult, value => storeModifications("progress", "delete", value));

        const deletedResultResult = await this.queryInList(
            "DELETE re FROM result_episode as re, episode as e, part as p" +
            " WHERE re.episode_id = e.id" +
            " AND e.part_id = p.id" +
            ` AND p.medium_id = ${escape(mediumId)}` +
            " AND e.id",
            removeEpisodesAfter
        );
        // @ts-expect-error
        multiSingle(deletedResultResult, value => storeModifications("result_episode", "delete", value));

        const deletedEpisodesResult = await this.queryInList(
            "DELETE FROM episode WHERE episode.id",
            removeEpisodesAfter
        );
        // @ts-expect-error
        multiSingle(deletedEpisodesResult, value => storeModifications("episode", "delete", value));

        const result = await this.delete(
            "medium_toc",
            {column: "medium_id", value: mediumId},
            {column: "link", value: link}
        );
        storeModifications("toc", "delete", result);
        return result.affectedRows > 0;
    }

    public getAllMediaTocs(): Promise<Array<{ link?: string; id: number }>> {
        return this.query(
            "SELECT medium.id, medium_toc.link FROM medium LEFT JOIN medium_toc ON medium.id=medium_toc.medium_id"
        );
    }

    public getAllTocs(): Promise<Array<{ link: string; id: number }>> {
        return this.query("SELECT medium_id as id, link FROM medium_toc");
    }

    public async mergeMedia(sourceMediumId: number, destMediumId: number): Promise<boolean> {
        // transfer all tocs from source to dest and with it all associated episodes
        // add source title as synonym for dest
        // remove any jobs related to source
        // replace or ignore source id with dest id in:
        //  list_medium, external_list_medium, medium_synonyms, news_medium
        // the parts will be dropped for source id, the next job for dest should correct that again if possible
        // the tocs will be transferred and do not need to be moved manually here
        // transferring the tocs should remove any related jobs,
        // and toc jobs should be the only jobs related directly to an medium
        const sourceTocs = await this.getToc(sourceMediumId);
        const destTocs = await this.getToc(destMediumId);

        // transfer unknown tocs and all related episodes
        await Promise.all(sourceTocs
            .filter((toc) => !destTocs.includes(toc))
            .map((toc) => this.transferToc(sourceMediumId, destMediumId, toc))
        );

        // remove all tocs of source
        let result = await this.delete("medium_toc", {column: "medium_id", value: sourceMediumId});
        storeModifications("toc", "delete", result);

        result = await this.query(
            "UPDATE IGNORE list_medium SET medium_id=? WHERE medium_id=?",
            [destMediumId, sourceMediumId]
        );
        storeModifications("list_item", "update", result);

        result = await this.delete("list_medium", {column: "medium_id", value: sourceMediumId});
        storeModifications("list_item", "delete", result);

        result = await this.query(
            "UPDATE IGNORE external_list_medium SET medium_id=? WHERE medium_id=?",
            [destMediumId, sourceMediumId]
        );
        storeModifications("external_list_item", "update", result);

        result = await this.delete("external_list_medium", {column: "medium_id", value: sourceMediumId});
        storeModifications("external_list_item", "delete", result);

        result = await this.query(
            "UPDATE IGNORE medium_synonyms SET medium_id=? WHERE medium_id=?",
            [destMediumId, sourceMediumId]
        );
        storeModifications("synonym", "update", result);

        result = await this.delete("medium_synonyms", {column: "medium_id", value: sourceMediumId});
        storeModifications("synonym", "delete", result);

        await this.query(
            "UPDATE IGNORE news_medium SET medium_id=? WHERE medium_id=?",
            [destMediumId, sourceMediumId]
        );

        await this.delete("news_medium", {column: "medium_id", value: sourceMediumId});
        const deletedReleaseResult = await this.query(
            "DELETE er FROM episode_release as er, episode as e, part as p" +
            " WHERE er.episode_id = e.id" +
            " AND e.part_id = p.id" +
            " AND p.medium_id = ?",
            sourceMediumId
        );
        storeModifications("release", "delete", deletedReleaseResult);

        const deletedProgressResult = await this.query(
            "DELETE ue FROM user_episode as ue, episode as e, part as p" +
            " WHERE ue.episode_id = e.id" +
            " AND e.part_id = p.id" +
            " AND p.medium_id = ?",
            sourceMediumId
        );
        storeModifications("progress", "delete", deletedProgressResult);

        const deletedResultResult = await this.query(
            "DELETE re FROM result_episode as re, episode as e, part as p" +
            " WHERE re.episode_id = e.id" +
            " AND e.part_id = p.id" +
            " AND p.medium_id = ?",
            sourceMediumId
        );
        storeModifications("result_episode", "delete", deletedResultResult);

        const deletedEpisodesResult = await this.query(
            "DELETE e FROM episode as e, part as p" +
            " WHERE e.part_id = p.id" +
            " AND p.medium_id = ?",
            sourceMediumId
        );
        storeModifications("episode", "delete", deletedEpisodesResult);

        const deletedPartResult = await this.query(
            "DELETE FROM part" +
            " WHERE medium_id = ?",
            sourceMediumId
        );
        storeModifications("part", "delete", deletedPartResult);

        const deletedMediumResult = await this.query(
            "DELETE FROM medium" +
            " WHERE id = ?",
            sourceMediumId
        );
        storeModifications("medium", "delete", deletedMediumResult);

        return true;
    }

    public async splitMedium(sourceMediumId: number, destMedium: SimpleMedium, toc: string): Promise<number> {
        if (!destMedium || !destMedium.medium || !destMedium.title) {
            return Promise.reject(new Error(Errors.INVALID_INPUT));
        }
        const result = await this.query(
            "INSERT IGNORE INTO medium(medium, title) VALUES (?,?);",
            [destMedium.medium, destMedium.title],
        );
        if (!Number.isInteger(result.insertId)) {
            throw Error(`invalid ID: ${result.insertId}`);
        }
        storeModifications("medium", "insert", result);
        let mediumId: number;
        // medium exists already if insertId == 0
        if (result.insertId === 0) {
            const realMedium: Array<{ id: number }> = await this.query(
                "SELECT id FROM medium WHERE (medium, title) = (?,?);",
                [destMedium.medium, destMedium.title],
            );
            if (!realMedium.length) {
                throw Error("Expected a MediumId, but got nothing");
            }
            mediumId = realMedium[0].id;
        } else {
            await this.parentContext.partContext.createStandardPart(result.insertId);
            mediumId = result.insertId;
        }
        const success = await this.transferToc(sourceMediumId, mediumId, toc);
        return success ? mediumId : 0;
    }

    public async transferToc(sourceMediumId: number, destMediumId: number, toc: string): Promise<boolean> {
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

        const updatedTocResult = await this.query(
            "UPDATE IGNORE medium_toc SET medium_id = ? WHERE (medium_id, link) = (?,?);",
            [destMediumId, sourceMediumId, toc]
        );
        storeModifications("toc", "update", updatedTocResult);

        const releases = await this.parentContext.episodeContext.getEpisodeLinksByMedium(sourceMediumId);
        const episodeMap: Map<number, string[]> = new Map();
        const valueCb = () => [];

        for (const release of releases) {
            getElseSet(episodeMap, release.episodeId, valueCb).push(release.url);
        }
        const copyEpisodes: number[] = [];
        const removeEpisodesAfter: number[] = [];

        for (const [episodeId, links] of episodeMap.entries()) {
            const toMoveCount = count(links, (value) => value.includes(domain));

            if (toMoveCount) {
                copyEpisodes.push(episodeId);

                if (links.length === toMoveCount) {
                    removeEpisodesAfter.push(episodeId);
                }
            }
        }
        // add the episodes of the releases
        const copyEpisodesResult = await this.queryInList(
            "INSERT IGNORE INTO episode" +
            " (part_id, totalIndex, partialIndex, combiIndex, updated_at)" +
            ` SELECT ${escape(standardPartId)}, episode.totalIndex, episode.partialIndex, episode.combiIndex, episode.updated_at` +
            " FROM episode INNER JOIN part ON part.id=episode.part_id" +
            ` WHERE part.medium_id = ${escape(sourceMediumId)} AND episode.id`,
            copyEpisodes
        );
        // @ts-expect-error
        multiSingle(copyEpisodesResult, value => storeModifications("episode", "insert", value));

        const updatedReleaseResult = await this.query(
            "UPDATE IGNORE episode_release, episode as src_e, episode as dest_e, part" +
            " SET episode_release.episode_id = dest_e.id" +
            " WHERE episode_release.episode_id = src_e.id" +
            " AND src_e.part_id = part.id" +
            " AND part.medium_id = ?" +
            " AND dest_e.part_id = ?" +
            " AND src_e.combiIndex = dest_e.combiIndex" +
            " AND locate(?,episode_release.url) > 0;",
            [sourceMediumId, standardPartId, domain]
        );
        storeModifications("release", "update", updatedReleaseResult);

        const updatedProgressResult = await this.queryInList(
            "UPDATE IGNORE user_episode, episode as src_e, episode as dest_e, part" +
            " SET user_episode.episode_id = dest_e.id" +
            " WHERE user_episode.episode_id = src_e.id" +
            " AND src_e.part_id = part.id" +
            ` AND part.medium_id = ${escape(sourceMediumId)}` +
            ` AND dest_e.part_id = ${escape(standardPartId)}` +
            " AND src_e.combiIndex = dest_e.combiIndex" +
            " AND src_e.id",
            removeEpisodesAfter
        );
        // @ts-expect-error
        multiSingle(updatedProgressResult, value => storeModifications("progress", "update", value));

        const updatedResultResult = await this.queryInList(
            "UPDATE IGNORE result_episode, episode as src_e, episode as dest_e, part" +
            " SET result_episode.episode_id = dest_e.id" +
            " WHERE result_episode.episode_id = src_e.id" +
            " AND src_e.part_id = part.id" +
            ` AND part.medium_id = ${escape(sourceMediumId)}` +
            ` AND dest_e.part_id = ${escape(standardPartId)}` +
            " AND src_e.combiIndex = dest_e.combiIndex" +
            " AND src_e.id",
            removeEpisodesAfter
        );
        // @ts-expect-error
        multiSingle(updatedResultResult, value => storeModifications("result_episode", "update", value));

        const deletedReleasesResult = await this.queryInList(
            "DELETE FROM episode_release" +
            " WHERE episode_id",
            removeEpisodesAfter
        );
        // @ts-expect-error
        multiSingle(deletedReleasesResult, value => storeModifications("release", "delete", value));

        const deletedUserEpisodesResult = await this.queryInList(
            "DELETE FROM user_episode" +
            " WHERE episode_id",
            removeEpisodesAfter
        );
        // @ts-expect-error
        multiSingle(deletedUserEpisodesResult, value => storeModifications("progress", "delete", value));

        const deletedResultEpisodesResult = await this.queryInList(
            "DELETE FROM result_episode" +
            " WHERE episode_id",
            removeEpisodesAfter
        );
        // @ts-expect-error
        multiSingle(deletedResultEpisodesResult, value => storeModifications("result_episode", "delete", value));

        const deletedEpisodesResult = await this.queryInList(
            "DELETE FROM episode" +
            " WHERE id",
            removeEpisodesAfter
        );
        // @ts-expect-error
        multiSingle(deletedEpisodesResult, value => storeModifications("episode", "delete", value));

        const copiedOnlyEpisodes: number[] = copyEpisodes.filter((value) => !removeEpisodesAfter.includes(value));
        const copiedProgressResult = await this.queryInList(
            " IGNORE INTO user_episode" +
            " (user_uuid, episode_id, progress, read_date)" +
            " SELECT user_episode.user_uuid, dest_e.id, user_episode.progress, user_episode.read_date" +
            " FROM user_episode, episode as src_e, episode as dest_e, part" +
            " WHERE user_episode.episode_id = src_e.id" +
            " AND src_e.part_id = part.id" +
            ` AND part.medium_id = ${escape(sourceMediumId)}` +
            ` AND dest_e.part_id = ${escape(standardPartId)}` +
            " AND src_e.combiIndex = dest_e.combiIndex" +
            " AND src_e.id",
            copiedOnlyEpisodes
        );
        // @ts-expect-error
        multiSingle(copiedProgressResult, value => storeModifications("progress", "insert", value));

        const copiedResultResult = await this.queryInList(
            "INSERT IGNORE INTO result_episode" +
            " (novel, chapter, chapIndex, volIndex, volume, episode_id)" +
            " SELECT result_episode.novel, result_episode.chapter, result_episode.chapIndex," +
            " result_episode.volIndex, result_episode.volume, dest_e.id" +
            " FROM result_episode, episode as src_e, episode as dest_e, part" +
            " WHERE result_episode.episode_id = src_e.id" +
            " AND src_e.part_id = part.id" +
            ` AND part.medium_id = ${escape(sourceMediumId)}` +
            ` AND dest_e.part_id = ${escape(standardPartId)}` +
            " AND src_e.combiIndex = dest_e.combiIndex" +
            " AND src_e.id",
            copiedOnlyEpisodes
        );
        // @ts-expect-error
        multiSingle(copiedResultResult, value => storeModifications("result_episode", "insert", value));
        return true;
    }
}
