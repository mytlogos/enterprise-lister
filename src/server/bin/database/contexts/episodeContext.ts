import { SubContext } from "./subContext";
import {
    Episode,
    EpisodeContentData,
    EpisodeRelease,
    MetaResult,
    ProgressResult,
    ReadEpisode,
    Result,
    SimpleEpisode,
    SimpleRelease,
    DisplayReleasesResponse,
    MediumRelease,
    Uuid,
    EmptyPromise,
    PromiseMultiSingle,
    MultiSingleValue,
    Optional,
    Nullable,
    UpdateMedium
} from "../../types";
import {
    checkIndices,
    combiIndex,
    Errors,
    getElseSet,
    ignore,
    MediaType,
    multiSingle,
    promiseMultiSingle,
    separateIndex,
    batch
} from "../../tools";
import logger from "../../logger";
import { MysqlServerError } from "../mysqlError";
import { escapeLike } from "../storages/storageTools";
import { Query, OkPacket } from "mysql";
import { storeModifications } from "../sqlTools";

export class EpisodeContext extends SubContext {
    /**
     * Return a Query of all episodes and together with the read progress and date of the given user uuid.
     * @param uuid uuid to check the progress of
     */
    public async getAll(uuid: Uuid): Promise<Query> {
        return this.queryStream(
            "SELECT episode.id, episode.partialIndex, episode.totalIndex, episode.combiIndex, " +
            "episode.part_id as partId, coalesce(progress, 0) as progress, read_date as readDate " +
            "FROM episode LEFT JOIN user_episode ON episode.id=user_episode.episode_id AND user_uuid IS NULL OR user_uuid=?",
            uuid
        );
    }

    public async getAllReleases(): Promise<Query> {
        return this.queryStream(
            "SELECT episode_id as episodeId, source_type as sourceType, releaseDate, locked, url, title FROM episode_release"
        );
    }

    public async getDisplayReleases(latestDate: Date, untilDate: Nullable<Date>, read: Nullable<boolean>, uuid: Uuid): Promise<DisplayReleasesResponse> {
        const progressCondition = read == null ? "1" : read ? "progress = 1" : "(progress IS NULL OR progress < 1)";
        const releasePromise = this.query(
            "SELECT er.episode_id as episodeId, er.title, er.url as link, er.releaseDate as date, er.locked, medium_id as mediumId, progress " +
            "FROM (SELECT * FROM episode_release WHERE releaseDate < ? AND (? IS NULL OR releaseDate > ?)) as er " +
            "INNER JOIN episode ON episode.id=er.episode_id " +
            "LEFT JOIN (SELECT * FROM user_episode WHERE user_uuid = ?) as ue ON episode.id=ue.episode_id " +
            "INNER JOIN part ON part.id=part_id " +
            `WHERE ${progressCondition} ORDER BY releaseDate DESC LIMIT 500;`,
            [latestDate, untilDate, untilDate, uuid, read, read]
        );
        const mediaPromise: Promise<Array<{ id: number; title: string }>> = this.query("SELECT id, title FROM medium;");
        const latestReleaseResult: Array<{ releaseDate: string }> = await this.query("SELECT releaseDate FROM episode_release ORDER BY releaseDate LIMIT 1;");
        const releases = await releasePromise;

        const mediaIds: Set<number> = new Set();

        for (const release of releases) {
            mediaIds.add(release.mediumId);
        }
        const media: { [key: number]: string } = {};

        for (const medium of await mediaPromise) {
            if (mediaIds.has(medium.id)) {
                media[medium.id] = medium.title;
            }
        }

        return {
            latest: latestReleaseResult.length ? new Date(latestReleaseResult[0].releaseDate) : new Date(0),
            media,
            releases
        };
    }

    public async getMediumReleases(mediumId: number, uuid: Uuid): Promise<MediumRelease[]> {
        return this.query(
            "SELECT er.episode_id as episodeId, er.title, er.url as link, er.releaseDate as date, er.locked, episode.combiIndex, progress " +
            "FROM episode_release as er " +
            "INNER JOIN episode ON episode.id=er.episode_id " +
            "LEFT JOIN (SELECT * FROM user_episode WHERE user_uuid = ?) as ue ON episode.id=ue.episode_id " +
            "INNER JOIN part ON part.id=part_id " +
            "WHERE part.medium_id = ?;",
            [uuid, mediumId]
        );
    }

    public async getAssociatedEpisode(url: string): Promise<number> {
        const result: Array<Pick<UpdateMedium, "id">> = await this.query(
            "SELECT id FROM episode INNER JOIN episode_release ON episode.id=episode_release.episode_id WHERE url=?",
            url
        );
        if (result.length === 1) {
            return result[0].id;
        }
        return 0;
    }

    /**
     *
     */
    public async getLatestReleases(mediumId: number): Promise<SimpleEpisode[]> {
        const resultArray: any[] = await this.query(
            "SELECT episode.* FROM episode_release " +
            "INNER JOIN episode ON episode.id=episode_release.episode_id " +
            "INNER JOIN part ON part.id=episode.part_id  " +
            "WHERE medium_id=? " +
            "GROUP BY episode_id " +
            "ORDER BY episode.totalIndex DESC, episode.partialIndex DESC " +
            "LIMIT 5;",
            mediumId
        );
        return Promise.all(resultArray.map(async (rawEpisode) => {
            const releases = await this.getReleases(rawEpisode.id);
            return {
                id: rawEpisode.id,
                partialIndex: rawEpisode.partialIndex,
                partId: rawEpisode.part_id,
                totalIndex: rawEpisode.totalIndex,
                combiIndex: rawEpisode.combiIndex,
                releases
            };
        }));
    }

    public async getReleases(episodeId: number | number[]): Promise<EpisodeRelease[]> {
        if (!episodeId || (Array.isArray(episodeId) && !episodeId.length)) {
            return [];
        }
        const resultArray: Optional<any[]> = await this.queryInList(
            "SELECT * FROM episode_release WHERE episode_id IN (??)",
            [episodeId]
        );
        if (!resultArray || !resultArray.length) {
            return [];
        }
        return resultArray.map((value: any): EpisodeRelease => {
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

    public async getReleasesByHost(episodeId: number | number[], host: string): Promise<EpisodeRelease[]> {
        if (!episodeId || (Array.isArray(episodeId) && !episodeId.length)) {
            return [];
        }
        const resultArray: Optional<any[]> = await this.queryInList(
            "SELECT * FROM episode_release WHERE locate(?, url) = 1 AND episode_id IN (??);",
            [host, episodeId]
        );
        if (!resultArray || !resultArray.length) {
            return [];
        }
        return resultArray.map((value: any): EpisodeRelease => {
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

    public async getMediumReleasesByHost(mediumId: number, host: string): Promise<EpisodeRelease[]> {
        const resultArray: any[] = await this.query(
            `
            SELECT er.* FROM episode_release as er
            INNER JOIN episode as e ON e.id=er.episode_id
            INNER JOIN part as p ON p.id=e.part_id
            WHERE medium_id = ? 
            AND locate(?, url) = 1
            `,
            [mediumId, host]
        );
        return resultArray.map((value: any): EpisodeRelease => {
            return {
                episodeId: value.episode_id,
                sourceType: value.source_type,
                releaseDate: value.releaseDate,
                locked: !!value.locked,
                url: value.url,
                title: value.title,
                tocId: value.toc_id,
            };
        });
    }

    public async getPartsEpisodeIndices(partId: number | number[])
        : Promise<Array<{ partId: number; episodes: number[] }>> {

        const result: Optional<Array<{ part_id: number; combinedIndex: number }>> = await this.queryInList(
            "SELECT part_id, combiIndex as combinedIndex " +
            "FROM episode WHERE part_id IN (??)",
            [partId]
        );
        if (!result) {
            return [];
        }
        const idMap = new Map<number, { partId: number; episodes: number[] }>();
        result.forEach((value) => {
            const partValue = getElseSet(idMap, value.part_id, () => {
                return { partId: value.part_id, episodes: [] };
            });
            partValue.episodes.push(value.combinedIndex);
        });
        if (Array.isArray(partId)) {
            partId.forEach((value) => {
                getElseSet(idMap, value, () => {
                    return { partId: value, episodes: [] };
                });
            });
        } else {
            getElseSet(idMap, partId, () => {
                return { partId, episodes: [] };
            });
        }
        return [...idMap.values()];
    }

    /**
     * Add progress of an user in regard to an episode to the storage.
     * Returns always true if it succeeded (no error).
     */
    public async addProgress(uuid: Uuid, episodeId: number | number[], progress: number, readDate: Nullable<Date>)
        : Promise<boolean> {

        if (progress < 0 || progress > 1) {
            return Promise.reject(new Error(Errors.INVALID_INPUT));
        }
        const results = await this.multiInsert(
            "REPLACE INTO user_episode " +
            "(user_uuid, episode_id, progress, read_date) " +
            "VALUES ",
            episodeId,
            (value) => [uuid, value, progress, readDate]
        );
        multiSingle(results, (value: OkPacket) => storeModifications("progress", "update", value))
        return true;
    }

    /**
     * Removes progress of an user in regard to an episode.
     */
    public async removeProgress(uuid: Uuid, episodeId: number): Promise<boolean> {
        const result = await this.delete(
            "user_episode",
            {
                column: "user_uuid",
                value: uuid,
            },
            {
                column: "episode_id",
                value: episodeId,
            },
        );
        storeModifications("progress", "delete", result);
        return result.affectedRows > 0;
    }

    /**
     * Sets the progress of an user in regard to an episode with one or multiple progressResult objects.
     */
    public setProgress(uuid: Uuid, progressResult: ProgressResult | ProgressResult[]): EmptyPromise {
        return promiseMultiSingle(progressResult, async (value: ProgressResult) => {
            const resultArray: any[] = await this.query(
                "SELECT episode_id FROM result_episode WHERE novel=? AND (chapter=? OR chapIndex=?)",
                [value.novel, value.chapter, value.chapIndex]
            );
            const episodeId: Optional<number> = resultArray[0] && resultArray[0].episode_id;

            if (episodeId == null) {
                const msg = `could not find an episode for '${value.novel}', '${value.chapter}', '${value.chapIndex}'`;
                logger.info(msg);
                return;
            }
            await this.addProgress(uuid, episodeId, value.progress, value.readDate);
        }).then(ignore);
    }

    /**
     * Get the progress of an user in regard to an episode.
     */
    public async getProgress(uuid: Uuid, episodeId: number): Promise<number> {
        const result = await this.query(
            "SELECT * FROM user_episode " +
            "WHERE user_uuid = ? " +
            "AND episode_id = ?",
            [uuid, episodeId],
        );

        return result[0].progress;
    }

    /**
     * Updates the progress of an user in regard to an episode.
     */
    public updateProgress(uuid: Uuid, episodeId: number, progress: number, readDate: Nullable<Date>): Promise<boolean> {
        // TODO for now its the same as calling addProgress, but somehow do it better maybe?
        return this.addProgress(uuid, episodeId, progress, readDate);
    }

    /**
     * Marks an Episode as read and adds it into Storage if the episode does not exist yet.
     */
    public async markEpisodeRead(uuid: Uuid, result: Result): EmptyPromise {
        if (!result.accept) {
            return;
        }
        const teaserMatcher = /\(?teaser\)?$|(\s+$)/i;
        return promiseMultiSingle(result.result, async (value: MetaResult): EmptyPromise => {
            // TODO what if it is not a serial medium but only an article? should it even save such things?
            if (!value.novel
                || (!value.chapIndex && !value.chapter)
                // do not mark episode if they are a teaser only
                || (value.chapter && value.chapter.match(teaserMatcher))) {
                return;
            }

            const resultArray: any[] = await this.query(
                "SELECT episode_id FROM result_episode WHERE novel=? AND (chapter=? OR chapIndex=?);",
                [value.novel, value.chapter, value.chapIndex]
            );
            // if a similar/same result was mapped to an episode before, get episode_id and update read
            if (resultArray[0] && resultArray[0].episode_id != null) {
                const insertResult = await this.query(
                    "INSERT IGNORE INTO user_episode (user_uuid, episode_id,progress) VALUES (?,?,0);",
                    [uuid, resultArray[0].episode_id]
                );
                storeModifications("progress", "insert", insertResult);
                return;
            }

            const escapedNovel = escapeLike(value.novel, { singleQuotes: true, noBoundaries: true });
            const media: Array<{ title: string; id: number; synonym?: string }> = await this.query(
                "SELECT title, id,synonym FROM medium " +
                "LEFT JOIN medium_synonyms ON medium.id=medium_synonyms.medium_id " +
                "WHERE medium.title LIKE ? OR medium_synonyms.synonym LIKE ?;",
                [escapedNovel, escapedNovel]
            );
            // TODO for now only get the first medium?, later test it against each other
            let bestMedium = media[0];

            if (!bestMedium) {
                const addedMedium = await this.parentContext.mediumContext.addMedium({
                    title: value.novel,
                    medium: MediaType.TEXT
                }, uuid);
                bestMedium = { id: addedMedium.insertId, title: value.novel };
                // TODO add medium if it is not known?
            }

            let volumeId;

            // if there is either an volume or volIndex in result
            // search or add the given volume to link the episode to the part/volume
            let volumeTitle = value.volume;
            // if there is no volume yet, with the given volumeTitle or index, add one
            let volIndex = Number(value.volIndex);

            if (volIndex || volumeTitle) {
                // TODO: do i need to convert volIndex from a string to a number for the query?
                const volumeArray: Array<{ id: number }> = await this.query(
                    "SELECT id FROM part WHERE medium_id=? AND title LIKE ? OR totalIndex=?)",
                    [bestMedium.id, volumeTitle && escapeLike(volumeTitle, {
                        singleQuotes: true,
                        noBoundaries: true
                    }), volIndex]);

                const volume = volumeArray[0];

                if (volume) {
                    volumeId = volume.id;
                } else {
                    if (Number.isNaN(volIndex)) {
                        const lowestIndexArray: Array<{ totalIndex: number }> = await this.query(
                            "SELECT MIN(totalIndex) as totalIndex FROM part WHERE medium_id=?",
                            bestMedium.id
                        );
                        // TODO look if totalIndex incremential needs to be replaced with combiIndex
                        const lowestIndexObj = lowestIndexArray[0];
                        // if the lowest available totalIndex not indexed, decrement, else take -2
                        // -1 is reserved for all episodes, which do not have any volume/part assigned
                        volIndex = lowestIndexObj && lowestIndexObj.totalIndex < 0 ? --lowestIndexObj.totalIndex : -2;
                    }
                    if (!volumeTitle) {
                        volumeTitle = "Volume " + volIndex;
                    }
                    const addedVolume = await this.parentContext.partContext.addPart(
                        // @ts-expect-error
                        { title: volumeTitle, totalIndex: volIndex, mediumId: bestMedium.id }
                    );
                    volumeId = addedVolume.id;
                }
            } else {
                // check if there is a part/volume, with index -1, reserved for all episodes, which are not indexed
                const volumeArray: Array<{ id: number }> = await this.query(
                    "SELECT id FROM part WHERE medium_id=? AND totalIndex=?",
                    [bestMedium.id, -1]
                );
                const volume = volumeArray[0];

                if (!volume) {
                    volumeId = (await this.parentContext.partContext.createStandardPart(bestMedium.id)).id;
                } else {
                    volumeId = volume.id;
                }
            }

            if (!Number.isInteger(volumeId) || volumeId <= 0) {
                throw Error("no volume id available");
            }

            const episodeSelectArray: Array<{ id: number; part_id: number; link: string }> = await this.query(
                "SELECT id, part_id, url FROM episode " +
                "LEFT JOIN episode_release " +
                "ON episode.id=episode_release.episode_id " +
                "WHERE title LIKE ? OR totalIndex=?",
                [value.chapter && escapeLike(value.chapter, {
                    noBoundaries: true,
                    singleQuotes: true
                }), value.chapIndex]);

            const episodeSelect = episodeSelectArray[0];

            let episodeId = episodeSelect && episodeSelect.id;

            if (episodeId == null) {
                let episodeIndex = Number(value.chapIndex);

                // if there is no index, decrement the minimum index available for this medium
                if (Number.isNaN(episodeIndex)) {
                    const latestEpisodeArray: Array<{ totalIndex: number }> = await this.query(
                        "SELECT MIN(totalIndex) as totalIndex FROM episode " +
                        "WHERE part_id EXISTS (SELECT id from part WHERE medium_id=?);",
                        bestMedium.id
                    );
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
                        // TODO get source type
                        sourceType: "",
                        episodeId: 0
                    }],
                });
                episodeId = episode.id;
            }

            // now after setting the storage up, so that all data is 'consistent' with this result,
            // mark the episode as read
            // normally the progress should be updated by messages of the tracker
            // it should be inserted only, if there does not exist any progress
            let queryResult = await this
                .query(
                    "INSERT IGNORE INTO user_episode (user_uuid, episode_id, progress) VALUES (?,?,0);",
                    [uuid, episodeId]
                );
            storeModifications("progress", "insert", queryResult);
            queryResult = await this.query(
                "INSERT INTO result_episode (novel, chapter, chapIndex, volume, volIndex, episode_id) " +
                "VALUES (?,?,?,?,?,?);",
                [value.novel, value.chapter, value.chapIndex, value.volume, value.volIndex, episodeId]
            );
            storeModifications("result_episode", "insert", queryResult);
        }).then(ignore);
    }

    public async addRelease<T extends EpisodeRelease>(releases: T[]): Promise<T[]>;
    public async addRelease<T extends EpisodeRelease>(releases: T): Promise<T>;

    public async addRelease<T extends MultiSingleValue<EpisodeRelease>>(releases: T): Promise<T> {
        const results = await this.multiInsert(
            "INSERT IGNORE INTO episode_release " +
            "(episode_id, title, url, source_type, releaseDate, locked, toc_id) " +
            "VALUES",
            releases,
            (release) => {
                if (!release.episodeId) {
                    throw Error("missing episodeId on release");
                }
                return [
                    release.episodeId,
                    release.title,
                    release.url,
                    release.sourceType,
                    release.releaseDate,
                    release.locked,
                    release.tocId,
                ];
            });
        multiSingle(results, (value: OkPacket) => storeModifications("release", "insert", value))
        return releases;
    }

    public getEpisodeLinks(episodeIds: number[]): Promise<SimpleRelease[]> {
        return this.queryInList(
            "SELECT episode_id as episodeId, url FROM episode_release WHERE episode_id IN (??)",
            [episodeIds]
        ) as Promise<SimpleRelease[]>;
    }

    public getEpisodeLinksByMedium(mediumId: number): Promise<SimpleRelease[]> {
        return this.query(
            "SELECT episode_id as episodeId, url FROM episode_release " +
            "inner join episode on episode.id=episode_release.episode_id " +
            "inner join part on part.id=episode.part_id " +
            "WHERE medium_id = ?;",
            mediumId
        ) as Promise<SimpleRelease[]>;
    }

    public getSourcedReleases(sourceType: string, mediumId: number):
        Promise<Array<{ sourceType: string; url: string; title: string; mediumId: number }>> {
        return this
            .query(
                "SELECT url, episode_release.title FROM episode_release " +
                "INNER JOIN episode ON episode.id=episode_release.episode_id " +
                "INNER JOIN part ON part.id=episode.part_id " +
                "WHERE source_type=? AND medium_id=?;",
                [sourceType, mediumId]
            )
            .then((resultArray) => resultArray.map((value: any) => {
                value.sourceType = sourceType;
                value.mediumId = mediumId;
                return value;
            }));
    }

    public async updateRelease(releases: MultiSingleValue<EpisodeRelease>): EmptyPromise {
        if (!Array.isArray(releases)) {
            releases = [releases];
        }
        const batches = batch(releases, 100);
        await Promise.all(batches.map(async (releaseBatch) => {
            const params = releaseBatch.flatMap(release => {
                return [
                    release.episodeId,
                    release.url,
                    release.title,
                    release.releaseDate,
                    release.sourceType,
                    !!release.locked,
                    release.tocId
                ];
            })
            const result: OkPacket = await this.query(
                `
                INSERT INTO episode_release
                (episode_id, url, title, releaseDate, source_type, locked, toc_id) 
                VALUES ${"(?,?,?,?,?,?,?),".repeat(releaseBatch.length).slice(0, -1)}
                ON DUPLICATE KEY UPDATE 
                title = VALUES(title),
                releaseDate = VALUES(releaseDate),
                source_type = VALUES(source_type),
                locked = VALUES(locked),
                toc_id = VALUES(toc_id);
                `,
                params
            );
            storeModifications("release", "update", result);
        }));
    }

    public async deleteRelease(release: EpisodeRelease): EmptyPromise {
        const result = await this.delete(
            "episode_release",
            {
                column: "episode_id",
                value: release.episodeId
            },
            {
                column: "url",
                value: release.url
            }
        );
        storeModifications("release", "delete", result);
    }

    public async getEpisodeContentData(chapterLink: string): Promise<EpisodeContentData> {
        const results: EpisodeContentData[] = await this.query(
            "SELECT episode_release.title as episodeTitle, episode.combiIndex as `index`, " +
            "medium.title as mediumTitle FROM episode_release " +
            "INNER JOIN episode ON episode.id=episode_release.episode_id " +
            "INNER JOIN part ON part.id=episode.part_id INNER JOIN medium ON medium.id=part.medium_id " +
            "WHERE episode_release.url=?",
            chapterLink
        );

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

    public addEpisode(episode: SimpleEpisode): Promise<Episode>;
    public addEpisode(episode: SimpleEpisode[]): Promise<Episode[]>;

    /**
     * Adds a episode of a part to the storage.
     */
    public addEpisode<T extends MultiSingleValue<SimpleEpisode>>(episodes: T): PromiseMultiSingle<T, Episode> {
        // TODO: 29.06.2019 insert multiple rows, what happens with insertId?
        const insertReleases: EpisodeRelease[] = [];
        // @ts-expect-error
        return promiseMultiSingle(episodes, async (episode: SimpleEpisode): Episode => {
            if (episode.partId == null || episode.partId <= 0) {
                throw Error("episode without partId");
            }
            let insertId: Optional<number>;
            const episodeCombiIndex = episode.combiIndex == null ? combiIndex(episode) : episode.combiIndex;
            try {
                const result: any = await this.query(
                    "INSERT INTO episode " +
                    "(part_id, totalIndex, partialIndex, combiIndex) " +
                    "VALUES (?,?,?,?);",
                    [
                        episode.partId,
                        episode.totalIndex,
                        episode.partialIndex,
                        episodeCombiIndex
                    ]
                );
                storeModifications("episode", "insert", result);
                insertId = result.insertId;
            } catch (e) {
                // do not catch if it isn't an duplicate key error
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                if (!e || (e.errno !== MysqlServerError.ER_DUP_KEY && e.errno !== MysqlServerError.ER_DUP_ENTRY)) {
                    throw e;
                }
                const result = await this.query(
                    "SELECT id from episode where part_id=? and combiIndex=?",
                    [episode.partId, combiIndex(episode)]
                );
                insertId = result[0].id;
            }
            if (!Number.isInteger(insertId)) {
                throw Error(`invalid ID ${insertId}`);
            }

            if (episode.releases) {
                // @ts-expect-error
                episode.releases.forEach((value) => value.episodeId = insertId);
                insertReleases.push(...episode.releases);
            }
            return {
                id: insertId as number,
                partId: episode.partId,
                partialIndex: episode.partialIndex,
                totalIndex: episode.totalIndex,
                combiIndex: episodeCombiIndex,
                releases: episode.releases,
                progress: 0,
                readDate: null,
            } as Episode;
        }).then(async (value: MultiSingleValue<Episode>) => {
            if (insertReleases.length) {
                await this.addRelease(insertReleases);
            }
            return value;
        });
    }

    public getEpisode(id: number, uuid: Uuid): Promise<Episode>;
    public getEpisode(id: number[], uuid: Uuid): Promise<Episode[]>;

    /**
     * Gets an episode from the storage.
     */
    public async getEpisode(id: number | number[], uuid: Uuid): Promise<Episode | Episode[]> {
        const episodes: Optional<any[]> = await this.queryInList(
            "SELECT * FROM episode LEFT JOIN user_episode ON episode.id=user_episode.episode_id " +
            "WHERE (user_uuid IS NULL OR user_uuid=?) AND episode.id IN (??);",
            [uuid, id]
        );
        if (!episodes || !episodes.length) {
            return [];
        }
        const idMap = new Map<number, any>();
        const releases = await this.getReleases(episodes.map((value: any): number => {
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
                progress: episode.progress != null ? episode.progress : 0,
                readDate: episode.progress != null ? episode.read_date : null,
                id: episode.id,
                partialIndex: episode.partialIndex,
                partId: episode.part_id,
                totalIndex: episode.totalIndex,
                combiIndex: episode.combiIndex,
                releases: episode.releases || [],
            };
        });
    }

    public async getPartMinimalEpisodes(partId: number): Promise<Array<{ id: number; combiIndex: number }>> {
        return this.query("SELECT id, combiIndex FROM episode WHERE part_id=?", partId);
    }

    public async getPartEpisodePerIndex(partId: number, index: number | number[]): Promise<SimpleEpisode[]> {
        const episodes: Optional<any[]> = await this.queryInList(
            "SELECT * FROM episode WHERE part_id = ? AND combiIndex IN (??);",
            [partId, index]
        );
        if (!episodes || !episodes.length) {
            return [];
        }
        const availableIndices: number[] = [];
        const idMap = new Map<number, any>();
        const episodeIds = episodes.map((value: any) => {
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

        multiSingle(index, (value: number) => {
            if (!availableIndices.includes(value)) {
                const separateValue = separateIndex(value);
                checkIndices(separateValue);
                episodes.push(separateValue);
            }
        });
        return episodes.map((value) => {
            checkIndices(value);
            return {
                id: value.id,
                partId,
                totalIndex: value.totalIndex,
                partialIndex: value.partialIndex,
                combiIndex: value.combiIndex,
                releases: value.releases || []
            };
        });
    }


    public async getMediumEpisodes(mediumId: number): Promise<Array<SimpleEpisode & { combiIndex: number }>> {
        const episodes: any[] = await this.query(
            `
            SELECT episode.*
            FROM episode
            INNER JOIN part ON part.id=episode.part_id
            WHERE medium_id = ?;
            `,
            mediumId
        );
        if (!episodes || !episodes.length) {
            return [];
        }
        return episodes.map((value) => {
            checkIndices(value);
            return {
                id: value.id,
                partId: value.part_id,
                totalIndex: value.totalIndex,
                partialIndex: value.partialIndex,
                combiIndex: value.combiIndex || combiIndex(value),
                releases: []
            };
        });
    }

    public getMediumEpisodePerIndex(mediumId: number, index: number, ignoreRelease?: boolean): Promise<SimpleEpisode>;
    public getMediumEpisodePerIndex(mediumId: number, index: number[], ignoreRelease?: boolean): Promise<SimpleEpisode[]>;

    public async getMediumEpisodePerIndex(mediumId: number, index: number | number[], ignoreRelease = false)
        : Promise<SimpleEpisode | SimpleEpisode[]> {

        const episodes: Optional<any[]> = await this.queryInList(
            "SELECT episode.* FROM episode INNER JOIN part ON part.id=episode.part_id " +
            "WHERE medium_id = ? AND episode.combiIndex IN (??);",
            [mediumId, index]
        );
        if (!episodes || !episodes.length) {
            return [];
        }
        const availableIndices: number[] = [];
        const idMap = new Map<number, any>();
        const episodeIds = episodes.map((value: any) => {
            availableIndices.push(value.combiIndex);
            idMap.set(value.id, value);
            return value.id;
        });
        const releases = ignoreRelease ? [] : await this.getReleases(episodeIds);
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

        multiSingle(index, (value: number) => {
            if (!availableIndices.includes(value)) {
                const separateValue = separateIndex(value);
                episodes.push(separateValue);
            }
        });
        return episodes.map((value) => {
            checkIndices(value);
            return {
                id: value.id,
                partId: value.part_id,
                totalIndex: value.totalIndex,
                partialIndex: value.partialIndex,
                combiIndex: value.combiIndex,
                releases: value.releases || []
            };
        });
    }

    /**
     * Updates an episode from the storage.
     */
    public async updateEpisode(episode: SimpleEpisode): Promise<boolean> {
        const result = await this.update("episode", (updates, values) => {
            if (episode.partId) {
                updates.push("part_id = ?");
                values.push(episode.partId);
            }

            if (episode.partialIndex != null) {
                updates.push("partialIndex = ?");
                values.push(episode.partialIndex);
            }

            if (episode.totalIndex != null) {
                updates.push("totalIndex = ?");
                values.push(episode.totalIndex);
            }
            if (episode.totalIndex || episode.partialIndex) {
                updates.push("combiIndex = ?");
                values.push(episode.combiIndex == null ? combiIndex(episode) : episode.combiIndex);
            }
        }, {
            column: "id", value: episode.id
        });
        storeModifications("episode", "update", result);
        return result.changedRows > 0;
    }

    /**
     * Updates an episode from the storage.
     */
    public async moveEpisodeToPart(oldPartId: number, newPartId: number): Promise<boolean> {
        if (!oldPartId || !newPartId) {
            return false;
        }
        const replaceIds: Array<{ oldId: number; newId: number }> = await this.query(
            "SELECT oldEpisode.id as oldId, newEpisode.id as newId FROM " +
            "(Select * from episode where part_id=?) as oldEpisode " +
            "inner join (Select * from episode where part_id=?) as newEpisode " +
            "ON oldEpisode.combiIndex=newEpisode.combiIndex",
            [oldPartId, newPartId]
        );

        const changePartIdsResult: any[] = await this.query(
            "SELECT id FROM episode WHERE combiIndex IN " +
            "(SELECT combiIndex FROM episode WHERE part_id = ?) AND part_id = ?;",
            [newPartId, oldPartId]
        );
        const changePartIds: number[] = changePartIdsResult.map((value) => value.id);

        let result = await this.queryInList(
            "UPDATE episode SET part_id= ? " +
            "WHERE part_id= ? AND combiIndex IN (??);",
            [newPartId, oldPartId, changePartIds]
        );
        multiSingle(result, value => storeModifications("release", "update", value));
        if (!replaceIds.length) {
            return true;
        }
        const deleteReleaseIds: number[] = [];
        await Promise.all(replaceIds.map((replaceId) => {
            return this.query(
                "UPDATE episode_release set episode_id=? where episode_id=?",
                [replaceId.newId, replaceId.oldId]
            )
                .then(value => storeModifications("release", "update", value))
                .catch((reason) => {
                    if (reason && MysqlServerError.ER_DUP_ENTRY === reason.errno) {
                        deleteReleaseIds.push(replaceId.oldId);
                    } else {
                        throw reason;
                    }
                });
        }));
        const deleteProgressIds: number[] = [];

        await Promise.all(replaceIds.map((replaceId) => {
            return this.query(
                "UPDATE user_episode set episode_id=? where episode_id=?",
                [replaceId.newId, replaceId.oldId]
            )
                .then(value => storeModifications("progress", "update", value))
                .catch((reason) => {
                    if (reason && MysqlServerError.ER_DUP_ENTRY === reason.errno) {
                        deleteProgressIds.push(replaceId.oldId);
                    } else {
                        throw reason;
                    }
                });
        }));
        const deleteResultIds: number[] = [];

        await Promise.all(replaceIds.map((replaceId) => {
            return this.query(
                "UPDATE result_episode set episode_id=? where episode_id=?",
                [replaceId.newId, replaceId.oldId]
            )
                .then(value => storeModifications("result_episode", "update", value))
                .catch((reason) => {
                    if (reason && MysqlServerError.ER_DUP_ENTRY === reason.errno) {
                        deleteResultIds.push(replaceId.oldId);
                    } else {
                        throw reason;
                    }
                });
        }));
        const oldIds = replaceIds.map((value) => value.oldId);
        // TODO: 26.08.2019 this does not go quite well, throws error with 'cannot delete parent reference'
        result = await this.queryInList("DELETE FROM episode_release WHERE episode_id IN (??);", [deleteReleaseIds]);
        multiSingle(result, value => storeModifications("release", "delete", value));

        result = await this.queryInList("DELETE FROM user_episode WHERE episode_id IN (??);", [deleteProgressIds]);
        multiSingle(result, value => storeModifications("progress", "delete", value));

        result = await this.queryInList("DELETE FROM result_episode WHERE episode_id IN (??);", [deleteResultIds]);
        multiSingle(result, value => storeModifications("result_episode", "delete", value));

        result = await this.queryInList(
            "DELETE FROM episode WHERE part_id= ? AND id IN (??);",
            [oldPartId, oldIds],
        );
        multiSingle(result, value => storeModifications("episode", "delete", value));
        return true;
    }

    /**
     * Deletes an episode from the storage irreversibly.
     */
    public async deleteEpisode(id: number): Promise<boolean> {
        // remove episode from progress first
        let result = await this.delete("user_episode", { column: "episode_id", value: id });
        storeModifications("progress", "delete", result);

        result = await this.delete("episode_release", { column: "episode_id", value: id });
        storeModifications("release", "delete", result);

        // lastly remove episode itself
        result = await this.delete("episode", { column: "id", value: id });
        storeModifications("episode", "delete", result);
        return result.affectedRows > 0;
    }

    public async getChapterIndices(mediumId: number): Promise<number[]> {
        const result: any[] = await this.query(
            "SELECT episode.combiIndex FROM episode INNER JOIN part ON episode.part_id=part.id WHERE medium_id=?",
            mediumId
        );
        return result.map((value) => value.combiIndex);
    }

    public async getAllChapterLinks(mediumId: number): Promise<string[]> {
        const result: any[] = await this.query(
            "SELECT url FROM episode " +
            "INNER JOIN episode_release ON episode.id=episode_release.episode_id " +
            "INNER JOIN part ON episode.part_id=part.id WHERE medium_id=?",
            mediumId
        );
        return result
            .map((value) => value.url)
            .filter((value) => value);
    }

    public async getUnreadChapter(uuid: Uuid): Promise<number[]> {
        const resultArray = await this.query(
            "SELECT id FROM episode WHERE id NOT IN " +
            "(SELECT episode_id FROM user_episode WHERE progress < 1 AND user_uuid=?);",
            uuid
        );
        return resultArray.map((value: any) => value.id);
    }

    public async getReadToday(uuid: Uuid): Promise<ReadEpisode[]> {
        const resultArray = await this.query(
            "SELECT * FROM user_episode WHERE read_date > (NOW() - INTERVAL 1 DAY) AND user_uuid=?;",
            uuid
        );
        return resultArray.map((value: any): ReadEpisode => {
            return {
                episodeId: value.episode_id,
                readDate: value.read_date,
                progress: value.progress,
            };
        });
    }

    public async markLowerIndicesRead(uuid: Uuid, id: number, partInd?: number, episodeInd?: number): EmptyPromise {
        if (!uuid || !id || (partInd == null && episodeInd == null)) {
            return;
        }
        // TODO: 09.03.2020 rework query and input, for now the episodeIndices are only relative to their parts mostly,
        //  not always relative to the medium
        const result = await this.query(
            "UPDATE user_episode, episode, part " +
            "SET user_episode.progress=1 " +
            "WHERE user_episode.episode_id=episode.id" +
            "AND episode.part_id=part.id" +
            "AND user_uuid = ?" +
            "AND part.medium_id=?" +
            "AND (? IS NOT NULL AND part.combiIndex < ?)" +
            "AND episode.combiIndex < ?",
            [uuid, id, partInd, episodeInd]
        );
        storeModifications("progress", "update", result);
    }
}
