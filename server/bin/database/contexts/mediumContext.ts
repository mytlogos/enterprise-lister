import {SubContext} from "./subContext";
import {LikeMedium, LikeMediumQuery, Medium, SimpleMedium, Synonyms, TocSearchMedium} from "../../types";
import {Errors, ignore, multiSingle, promiseMultiSingle} from "../../tools";
import {escapeLike} from "../storages/storageTools";
import {Query} from "mysql";

export class MediumContext extends SubContext {
    /**
     * Adds a medium to the storage.
     */
    public async addMedium(medium: SimpleMedium, uuid?: string): Promise<SimpleMedium> {
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
            const resultArray: any[] = await this.query(`SELECT * FROM medium WHERE medium.id =?;`, mediumId);
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

    public async getTocSearchMedia(): Promise<TocSearchMedium[]> {
        const result: Array<{ host?: string, mediumId: number, title: string, medium: number }> = await this.query(
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
        const resultArray: any[] = await this.query(`SELECT * FROM medium WHERE medium.id =?;`, id);
        const result = resultArray[0];
        const synonyms: Synonyms[] = await this.getSynonyms(id);

        return {
            mediumId: result.id,
            medium: result.medium,
            title: result.title,
            synonyms: (synonyms[0] && synonyms[0].synonym) as string[] || []
        };
    }

    public getMedium(id: number, uuid: string): Promise<Medium>;

    public getMedium(id: number[], uuid: string): Promise<Medium[]>;

    /**
     * Gets one or multiple media from the storage.
     */
    public getMedium(id: number | number[], uuid: string): Promise<Medium | Medium[]> {
        // TODO: 29.06.2019 replace with id IN (...)
        // @ts-ignore
        return promiseMultiSingle(id, async (mediumId: number) => {
            let result = await this.query(`SELECT * FROM medium WHERE medium.id=?;`, mediumId);
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
    public updateMedium(medium: SimpleMedium): Promise<boolean> {
        const keys = [
            "countryOfOrigin?", "languageOfOrigin", "author", "title", "medium",
            "artist", "lang", "stateOrigin", "stateTL", "series", "universe"
        ];
        return this.update("medium", (updates, values) => {
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
    }

    public async getSynonyms(mediumId: number | number[]): Promise<Synonyms[]> {
        // TODO: 29.06.2019 replace with 'medium_id IN (list)'
        const synonyms = await this.queryInList("SELECT * FROM medium_synonyms WHERE medium_id ", mediumId);
        if (!synonyms) {
            return [];
        }
        const synonymMap = new Map<number, { mediumId: number, synonym: string[]; }>();
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
            return promiseMultiSingle(value.synonym, (item) => {
                return this.delete("medium_synonyms",
                    {
                        column: "synonym",
                        value: item
                    },
                    {
                        column: "medium_id",
                        value: value.mediumId
                    });
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
        await this.multiInsert(
            "INSERT IGNORE INTO medium_synonyms (medium_id, synonym) VALUES",
            params,
            (value) => value
        );
        return true;
    }

    public addToc(mediumId: number, link: string): Promise<void> {
        return this.query(
            "INSERT IGNORE INTO medium_toc (medium_id, link) VAlUES (?,?)",
            [mediumId, link]
        ).then(ignore);
    }

    public async getToc(mediumId: number): Promise<string[]> {
        const resultArray: any[] = await this.query("SELECT link FROM medium_toc WHERE medium_id=?", mediumId);
        return resultArray.map((value) => value.link).filter((value) => value);
    }

    public getAllMediaTocs(): Promise<Array<{ link?: string, id: number }>> {
        return this.query(
            "SELECT id, link FROM medium LEFT JOIN medium_toc ON medium.id=medium_toc.medium_id"
        );
    }

    public getAllTocs(): Promise<Array<{ link: string, id: number }>> {
        return this.query("SELECT medium_id as id, link FROM medium_toc");
    }
}
