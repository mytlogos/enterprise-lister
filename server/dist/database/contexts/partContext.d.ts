import { SubContext } from "./subContext";
import { MinPart, MultiSingle, Part, ShallowPart } from "../../types";
export declare class PartContext extends SubContext {
    getStandardPartId(mediumId: number): Promise<number | undefined>;
    getStandardPart(mediumId: number): Promise<ShallowPart | undefined>;
    getMediumPartIds(mediumId: number): Promise<number[]>;
    /**
     * Returns all parts of an medium.
     */
    getMediumParts(mediumId: number, uuid?: string): Promise<Part[]>;
    /**
     * Returns all parts of an medium with specific totalIndex.
     * If there is no such part, it returns an object with only the totalIndex as property.
     */
    getMediumPartsPerIndex(mediumId: number, index: MultiSingle<number>): Promise<MinPart[]>;
    getParts(partId: number, uuid: string): Promise<Part>;
    getParts(partId: number[], uuid: string): Promise<Part[]>;
    /**
     * Returns all parts of an medium.
     */
    getPartItems(partIds: number[]): Promise<{
        [key: number]: number[];
    }>;
    /**
     * Returns all parts of an medium.
     */
    getPartReleases(partIds: number[]): Promise<{
        [key: number]: Array<{
            id: number;
            url: string;
        }>;
    }>;
    getOverLappingParts(standardId: number, nonStandardPartIds: number[]): Promise<number[]>;
    /**
     * Adds a part of an medium to the storage.
     */
    addPart(part: Part): Promise<Part>;
    /**
     * Updates a part.
     */
    updatePart(part: Part): Promise<boolean>;
    /**
     * Deletes a part from the storage.
     */
    deletePart(id: number): Promise<boolean>;
    createStandardPart(mediumId: number): Promise<ShallowPart>;
}
