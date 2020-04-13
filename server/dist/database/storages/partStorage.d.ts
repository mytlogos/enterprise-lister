import { MinPart, MultiSingle, Part, ShallowPart } from "../../types";
import { Query } from "mysql";
export declare class PartStorage {
    getAll(): Promise<Query>;
    /**
     * Returns all parts of an medium with their episodes.
     */
    getMediumParts(mediumId: number, uuid?: string): Promise<Part[]>;
    /**
     * Returns all parts of an medium with their episodes.
     */
    getMediumPartIds(mediumId: number): Promise<number[]>;
    getStandardPart(mediumId: number): Promise<ShallowPart | undefined>;
    getStandardPartId(mediumId: number): Promise<number | undefined>;
    /**
     * Returns parts of an medium with specific totalIndex.
     * If there is no such part, it returns an object with only the totalIndex as property.
     */
    getMediumPartsPerIndex(mediumId: number, index: MultiSingle<number>): Promise<MinPart[]>;
    /**
     * Returns one or multiple parts with their episode.
     */
    getParts(partsId: number | number[], uuid: string): Promise<Part[] | Part>;
    /**
     * Returns a Map of Parts with their corresponding episodeIds.
     */
    getPartItems(partsId: number[]): Promise<{
        [key: number]: number[];
    }>;
    /**
     * Returns a Map of Parts with all of their Releases.
     */
    getPartReleases(partsId: number[]): Promise<{
        [key: number]: Array<{
            id: number;
            url: string;
        }>;
    }>;
    /**
     * Adds a part of an medium to the storage.
     */
    addPart(part: Part): Promise<Part>;
    /**
     * Updates a part.
     */
    updatePart(part: Part): Promise<boolean>;
    /**
     * Creates the Standard Part for all non part-indexed episodes for the given mediumId.
     */
    createStandardPart(mediumId: number): Promise<ShallowPart>;
    /**
     * Deletes a part from the storage.
     */
    deletePart(id: number): Promise<boolean>;
    getOverLappingParts(standardId: number, nonStandardPartIds: number[]): Promise<number[]>;
}
