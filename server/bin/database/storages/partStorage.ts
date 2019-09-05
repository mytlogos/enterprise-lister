import {MultiSingle, Part, ShallowPart} from "../../types";
import {storageInContext} from "./storage";
import {ContextCallback, queryContextProvider} from "./storageTools";
import {PartContext} from "../contexts/partContext";

function inContext<T>(callback: ContextCallback<T, PartContext>, transaction = true) {
    return storageInContext(callback, transaction, (con) => queryContextProvider(con).partContext);
}

export class PartStorage {
    /**
     * Returns all parts of an medium with their episodes.
     */
    public getMediumParts(mediumId: number, uuid?: string): Promise<Part[]> {
        return inContext((context) => context.getMediumParts(mediumId, uuid));
    }

    /**
     * Returns all parts of an medium with their episodes.
     */
    public getMediumPartIds(mediumId: number): Promise<number[]> {
        return inContext((context) => context.getMediumPartIds(mediumId));
    }

    public getStandardPart(mediumId: number): Promise<ShallowPart | undefined> {
        return inContext((context) => context.getStandardPart(mediumId));
    }

    public getStandardPartId(mediumId: number): Promise<number | undefined> {
        return inContext((context) => context.getStandardPartId(mediumId));
    }

    /**
     * Returns parts of an medium with specific totalIndex.
     * If there is no such part, it returns an object with only the totalIndex as property.
     */
    public getMediumPartsPerIndex(mediumId: number, index: MultiSingle<number>, uuid?: string): Promise<Part[]> {
        return inContext((context) => context.getMediumPartsPerIndex(mediumId, index, uuid));
    }

    /**
     * Returns one or multiple parts with their episode.
     */
    public getParts(partsId: number | number[], uuid: string): Promise<Part[] | Part> {
        // @ts-ignore
        return inContext((context) => context.getParts(partsId, uuid));
    }

    /**
     * Adds a part of an medium to the storage.
     */
    public addPart(part: Part): Promise<Part> {
        return inContext((context) => context.addPart(part));
    }

    /**
     * Updates a part.
     */
    public updatePart(part: Part): Promise<boolean> {
        return inContext((context) => context.updatePart(part));
    }

    /**
     * Creates the Standard Part for all non part-indexed episodes for the given mediumId.
     */
    public createStandardPart(mediumId: number): Promise<ShallowPart> {
        return inContext((context) => context.createStandardPart(mediumId));
    }

    /**
     * Deletes a part from the storage.
     */
    public deletePart(id: number): Promise<boolean> {
        return inContext((context) => context.deletePart(id));
    }


    public getOverLappingParts(standardId: number, nonStandardPartIds: number[]): Promise<number[]> {
        return inContext((context) => context.getOverLappingParts(standardId, nonStandardPartIds));
    }
}
