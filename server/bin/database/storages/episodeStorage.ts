import {
    Episode,
    EpisodeContentData,
    EpisodeRelease,
    MultiSingle,
    ProgressResult,
    Result,
    SimpleEpisode,
    SimpleRelease
} from "../../types";
import {ContextCallback, queryContextProvider} from "./storageTools";
import {storageInContext} from "./storage";
import {EpisodeContext} from "../contexts/episodeContext";


function inContext<T>(callback: ContextCallback<T, EpisodeContext>, transaction = true) {
    return storageInContext(callback, transaction, (con) => queryContextProvider(con).episodeContext);
}

export class EpisodeStorage {
    /**
     * Gets one or multiple media from the storage.
     */
    public getLatestReleases(mediumId: number): Promise<SimpleEpisode[]> {
        return inContext((context) => context.getLatestReleases(mediumId));
    }

    /**
     */
    public getChapterIndices(mediumId: number): Promise<number[]> {
        return inContext((context) => context.getChapterIndices(mediumId));
    }

    public getAllChapterLinks(mediumId: number): Promise<string[]> {
        return inContext((context) => context.getAllChapterLinks(mediumId));
    }

    public getPartsEpisodeIndices(partId: number | number[]): Promise<Array<{ partId: number, episodes: number[] }>> {
        return inContext((context) => context.getPartsEpisodeIndices(partId));
    }

    /**
     * Adds a episode of a part to the storage.
     */
    // @ts-ignore
    public addEpisode(episode: MultiSingle<SimpleEpisode>)
        : Promise<MultiSingle<SimpleEpisode>> {
        // @ts-ignore
        return inContext((context) => context.addEpisode(episode));
    }

    /**
     * Updates an episode from the storage.
     */
    public updateEpisode(episode: SimpleEpisode): Promise<boolean> {
        return inContext((context) => context.updateEpisode(episode));
    }

    public moveEpisodeToPart(oldPartId: number, newPartId: number) {
        return inContext((context) => context.moveEpisodeToPart(oldPartId, newPartId));
    }

    public getEpisode(id: number, uuid: string): Promise<Episode>;
    public getEpisode(id: number[], uuid: string): Promise<Episode[]>;
    /**
     * Gets an episode from the storage.
     */
    public getEpisode(id: number | number[], uuid: string): Promise<Episode | Episode[]> {
        // @ts-ignore
        return inContext((context) => context.getEpisode(id, uuid));
    }

    public getReleases(episodeId: number | number[]): Promise<EpisodeRelease[]> {
        return inContext((context) => context.getReleases(episodeId));
    }

    public getReleasesByHost(episodeId: number | number[], host: string): Promise<EpisodeRelease[]> {
        return inContext((context) => context.getReleasesByHost(episodeId, host));
    }

    /**
     *
     */
    public getPartEpisodePerIndex(partId: number, index: number): Promise<SimpleEpisode>;
    public getPartEpisodePerIndex(partId: number, index: number[]): Promise<SimpleEpisode[]>;

    public getPartEpisodePerIndex(partId: number, index: MultiSingle<number>): Promise<MultiSingle<SimpleEpisode>> {
        // @ts-ignore
        return inContext((context) => context.getPartEpisodePerIndex(partId, index));
    }

    public getMediumEpisodePerIndex(mediumId: number, index: number, ignoreRelease?: boolean): Promise<SimpleEpisode>;
    public getMediumEpisodePerIndex(mediumId: number, index: number[], ignoreRelease?: boolean)
        : Promise<SimpleEpisode[]>;

    public getMediumEpisodePerIndex(mediumId: number, index: MultiSingle<number>, ignoreRelease = false)
        : Promise<MultiSingle<SimpleEpisode>> {

        return inContext((context) => context.getMediumEpisodePerIndex(mediumId, index, ignoreRelease));
    }

    /**
     * Deletes an episode from the storage irreversibly.
     */
    public deleteEpisode(id: number): Promise<boolean> {
        return inContext((context) => context.deleteEpisode(id));
    }

    public addRelease(releases: EpisodeRelease): Promise<EpisodeRelease>;
    public addRelease(releases: EpisodeRelease[]): Promise<EpisodeRelease[]>;

    public addRelease(releases: MultiSingle<EpisodeRelease>): Promise<MultiSingle<EpisodeRelease>> {
        // @ts-ignore
        return inContext((context) => context.addRelease(releases));
    }

    public updateRelease(releases: MultiSingle<EpisodeRelease>): Promise<void> {
        return inContext((context) => context.updateRelease(releases));
    }

    public getSourcedReleases(sourceType: string, mediumId: number):
        Promise<Array<{ sourceType: string, url: string, title: string, mediumId: number }>> {
        return inContext((context) => context.getSourcedReleases(sourceType, mediumId));
    }

    public deleteRelease(release: EpisodeRelease): Promise<void> {
        return inContext((context) => context.deleteRelease(release));
    }


    public getEpisodeLinks(episodeIds: number[]): Promise<SimpleRelease[]> {
        return inContext((context) => context.getEpisodeLinks(episodeIds));
    }

    public getEpisodeContent(chapterLink: string): Promise<EpisodeContentData> {
        return inContext((context) => context.getEpisodeContentData(chapterLink));
    }

    /**
     *
     */
    public setProgress(uuid: string, progressResult: ProgressResult | ProgressResult[]): Promise<void> {
        return inContext((context) => context.setProgress(uuid, progressResult));
    }

    /**
     * Add progress of an user in regard to an episode to the storage.
     */
    public addProgress(uuid: string, episodeId: number | number[], progress: number, readDate: Date | null): Promise<boolean> {
        return inContext((context) => context.addProgress(uuid, episodeId, progress, readDate));
    }

    /**
     * Removes progress of an user in regard to an episode.
     */
    public removeProgress(uuid: string, episodeId: number): Promise<boolean> {
        return inContext((context) => context.removeProgress(uuid, episodeId));
    }

    /**
     * Get the progress of an user in regard to an episode.
     */
    public getProgress(uuid: string, episodeId: number): Promise<number> {
        return inContext((context) => context.getProgress(uuid, episodeId));
    }

    /**
     * Updates the progress of an user in regard to an episode.
     */
    public updateProgress(uuid: string, mediumId: number, progress: number, readDate: Date | null): Promise<boolean> {
        return inContext((context) => context.updateProgress(uuid, mediumId, progress, readDate));
    }

    /**
     * Marks these news as read for the given user.
     */
    public markEpisodeRead(uuid: string, result: Result): Promise<void> {
        return inContext((context) => context.markEpisodeRead(uuid, result));
    }
}
