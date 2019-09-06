import { Episode, EpisodeContentData, EpisodeRelease, MultiSingle, ProgressResult, Result, SimpleEpisode, SimpleRelease } from "../../types";
export declare class EpisodeStorage {
    /**
     * Gets one or multiple media from the storage.
     */
    getLatestReleases(mediumId: number): Promise<SimpleEpisode[]>;
    /**
     */
    getChapterIndices(mediumId: number): Promise<number[]>;
    getAllChapterLinks(mediumId: number): Promise<string[]>;
    getPartsEpisodeIndices(partId: number | number[]): Promise<Array<{
        partId: number;
        episodes: number[];
    }>>;
    /**
     * Adds a episode of a part to the storage.
     */
    addEpisode(episode: MultiSingle<SimpleEpisode>): Promise<MultiSingle<SimpleEpisode>>;
    /**
     * Updates an episode from the storage.
     */
    updateEpisode(episode: SimpleEpisode): Promise<boolean>;
    moveEpisodeToPart(oldPartId: number, newPartId: number): Promise<boolean>;
    getEpisode(id: number, uuid: string): Promise<Episode>;
    getEpisode(id: number[], uuid: string): Promise<Episode[]>;
    getReleases(episodeId: number | number[]): Promise<EpisodeRelease[]>;
    getReleasesByHost(episodeId: number | number[], host: string): Promise<EpisodeRelease[]>;
    /**
     *
     */
    getPartEpisodePerIndex(partId: number, index: number): Promise<SimpleEpisode>;
    getPartEpisodePerIndex(partId: number, index: number[]): Promise<SimpleEpisode[]>;
    getMediumEpisodePerIndex(mediumId: number, index: number, ignoreRelease?: boolean): Promise<SimpleEpisode>;
    getMediumEpisodePerIndex(mediumId: number, index: number[], ignoreRelease?: boolean): Promise<SimpleEpisode[]>;
    /**
     * Deletes an episode from the storage irreversibly.
     */
    deleteEpisode(id: number): Promise<boolean>;
    addRelease(releases: EpisodeRelease): Promise<EpisodeRelease>;
    addRelease(releases: EpisodeRelease[]): Promise<EpisodeRelease[]>;
    updateRelease(releases: MultiSingle<EpisodeRelease>): Promise<void>;
    getSourcedReleases(sourceType: string, mediumId: number): Promise<Array<{
        sourceType: string;
        url: string;
        title: string;
        mediumId: number;
    }>>;
    deleteRelease(release: EpisodeRelease): Promise<void>;
    getEpisodeLinks(episodeIds: number[]): Promise<SimpleRelease[]>;
    getEpisodeContent(chapterLink: string): Promise<EpisodeContentData>;
    /**
     *
     */
    setProgress(uuid: string, progressResult: ProgressResult | ProgressResult[]): Promise<void>;
    /**
     * Add progress of an user in regard to an episode to the storage.
     */
    addProgress(uuid: string, episodeId: number | number[], progress: number, readDate: Date | null): Promise<boolean>;
    /**
     * Removes progress of an user in regard to an episode.
     */
    removeProgress(uuid: string, episodeId: number): Promise<boolean>;
    /**
     * Get the progress of an user in regard to an episode.
     */
    getProgress(uuid: string, episodeId: number): Promise<number>;
    /**
     * Updates the progress of an user in regard to an episode.
     */
    updateProgress(uuid: string, mediumId: number, progress: number, readDate: Date | null): Promise<boolean>;
    /**
     * Marks these news as read for the given user.
     */
    markEpisodeRead(uuid: string, result: Result): Promise<void>;
}
