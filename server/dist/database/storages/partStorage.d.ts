import { MultiSingle, Part, ShallowPart } from "../../types";
export declare class PartStorage {
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
    getMediumPartsPerIndex(mediumId: number, index: MultiSingle<number>, uuid?: string): Promise<Part[]>;
    /**
     * Returns one or multiple parts with their episode.
     */
    getParts(partsId: number | number[], uuid: string): Promise<Part[] | Part>;
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
