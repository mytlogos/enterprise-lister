import { SubContext } from "./subContext";
import { LikeMedium, LikeMediumQuery, Medium, SimpleMedium, Synonyms, TocSearchMedium } from "../../types";
export declare class MediumContext extends SubContext {
    /**
     * Adds a medium to the storage.
     */
    addMedium(medium: SimpleMedium, uuid?: string): Promise<SimpleMedium>;
    getSimpleMedium(id: number | number[]): Promise<SimpleMedium | SimpleMedium[]>;
    getTocSearchMedia(): Promise<TocSearchMedium[]>;
    getTocSearchMedium(id: number): Promise<TocSearchMedium>;
    getMedium(id: number, uuid: string): Promise<Medium>;
    getMedium(id: number[], uuid: string): Promise<Medium[]>;
    getAllMedia(): Promise<number[]>;
    getLikeMedium(likeMedia: LikeMediumQuery): Promise<LikeMedium>;
    getLikeMedium(likeMedia: LikeMediumQuery[]): Promise<LikeMedium[]>;
    /**
     * Updates a medium from the storage.
     */
    updateMedium(medium: SimpleMedium): Promise<boolean>;
    getSynonyms(mediumId: number | number[]): Promise<Synonyms[]>;
    removeSynonyms(synonyms: Synonyms | Synonyms[]): Promise<boolean>;
    addSynonyms(synonyms: Synonyms | Synonyms[]): Promise<boolean>;
    addToc(mediumId: number, link: string): Promise<void>;
    getToc(mediumId: number): Promise<string[]>;
    getAllMediaTocs(): Promise<Array<{
        link?: string;
        id: number;
    }>>;
    getAllTocs(): Promise<Array<{
        link: string;
        id: number;
    }>>;
}
