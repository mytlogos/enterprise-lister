import { SubContext } from "./subContext";
import { Episode, EpisodeContentData, EpisodeRelease, MultiSingle, ProgressResult, ReadEpisode, Result, SimpleEpisode, SimpleRelease } from "../../types";
import { Query } from "mysql";
export declare class EpisodeContext extends SubContext {
    getAll(uuid: any): Promise<Query>;
    getAllReleases(): Promise<Query>;
    getAssociatedEpisode(url: string): Promise<number>;
    /**
     *
     */
    getLatestReleases(mediumId: number): Promise<SimpleEpisode[]>;
    getReleases(episodeId: number | number[]): Promise<EpisodeRelease[]>;
    getReleasesByHost(episodeId: number | number[], host: string): Promise<EpisodeRelease[]>;
    getPartsEpisodeIndices(partId: number | number[]): Promise<Array<{
        partId: number;
        episodes: number[];
    }>>;
    /**
     * Add progress of an user in regard to an episode to the storage.
     */
    addProgress(uuid: string, episodeId: number | number[], progress: number, readDate: Date | null): Promise<boolean>;
    /**
     * Removes progress of an user in regard to an episode.
     */
    removeProgress(uuid: string, episodeId: number): Promise<boolean>;
    /**
     * Sets the progress of an user in regard to an episode with one or multiple progressResult objects.
     */
    setProgress(uuid: string, progressResult: ProgressResult | ProgressResult[]): Promise<void>;
    /**
     * Get the progress of an user in regard to an episode.
     */
    getProgress(uuid: string, episodeId: number): Promise<number>;
    /**
     * Updates the progress of an user in regard to an episode.
     */
    updateProgress(uuid: string, episodeId: number, progress: number, readDate: Date | null): Promise<boolean>;
    /**
     * Marks an Episode as read and adds it into Storage if the episode does not exist yet.
     */
    markEpisodeRead(uuid: string, result: Result): Promise<void>;
    addRelease(releases: EpisodeRelease): Promise<EpisodeRelease>;
    addRelease(releases: EpisodeRelease[]): Promise<EpisodeRelease[]>;
    getEpisodeLinks(episodeIds: number[]): Promise<SimpleRelease[]>;
    getEpisodeLinksByMedium(mediumId: number): Promise<SimpleRelease[]>;
    getSourcedReleases(sourceType: string, mediumId: number): Promise<Array<{
        sourceType: string;
        url: string;
        title: string;
        mediumId: number;
    }>>;
    updateRelease(releases: MultiSingle<EpisodeRelease>): Promise<void>;
    deleteRelease(release: EpisodeRelease): Promise<void>;
    getEpisodeContentData(chapterLink: string): Promise<EpisodeContentData>;
    addEpisode(episode: SimpleEpisode): Promise<Episode>;
    addEpisode(episode: SimpleEpisode[]): Promise<Episode[]>;
    getEpisode(id: number, uuid: string): Promise<Episode>;
    getEpisode(id: number[], uuid: string): Promise<Episode[]>;
    getPartMinimalEpisodes(partId: number): Promise<Array<{
        id: number;
        combiIndex: number;
    }>>;
    getPartEpisodePerIndex(partId: number, index: number): Promise<SimpleEpisode>;
    getPartEpisodePerIndex(partId: number, index: number[]): Promise<SimpleEpisode[]>;
    getMediumEpisodePerIndex(mediumId: number, index: MultiSingle<number>, ignoreRelease: boolean): Promise<MultiSingle<SimpleEpisode>>;
    /**
     * Updates an episode from the storage.
     */
    updateEpisode(episode: SimpleEpisode): Promise<boolean>;
    /**
     * Updates an episode from the storage.
     */
    moveEpisodeToPart(oldPartId: number, newPartId: number): Promise<boolean>;
    /**
     * Deletes an episode from the storage irreversibly.
     */
    deleteEpisode(id: number): Promise<boolean>;
    getChapterIndices(mediumId: number): Promise<number[]>;
    getAllChapterLinks(mediumId: number): Promise<string[]>;
    getUnreadChapter(uuid: string): Promise<number[]>;
    getReadToday(uuid: string): Promise<ReadEpisode[]>;
    markLowerIndicesRead(uuid: string, id: number, partInd?: number, episodeInd?: number): Promise<void>;
}
