import { LikeMedium, LikeMediumQuery, Medium, SimpleMedium, Synonyms, TocSearchMedium } from "../../types";
import { Query } from "mysql";
export declare class MediumStorage {
    /**
     * Adds a medium to the storage.
     *
     * @return {Promise<SimpleMedium>}
     */
    addMedium(medium: SimpleMedium, uuid?: string): Promise<SimpleMedium>;
    /**
     * Gets one or multiple media from the storage.
     */
    getMedium(id: number | number[], uuid: string): Promise<Medium | Medium[]>;
    getAllFull(): Promise<Query>;
    /**
     * Gets one or multiple media from the storage.
     */
    getAllMedia(): Promise<number[]>;
    getLikeMedium(likeMedia: LikeMediumQuery): Promise<LikeMedium>;
    getLikeMedium(likeMedia: LikeMediumQuery[]): Promise<LikeMedium[]>;
    /**
     * Updates a medium from the storage.
     */
    updateMedium(medium: SimpleMedium): Promise<boolean>;
    /**
     */
    addSynonyms(synonyms: Synonyms | Synonyms[]): Promise<boolean>;
    /**
     */
    addToc(mediumId: number, link: string): Promise<void>;
    /**
     */
    getTocs(mediumId: number): Promise<string[]>;
    /**
     */
    getAllMediaTocs(): Promise<Array<{
        link?: string;
        id: number;
    }>>;
    /**
     */
    getAllTocs(): Promise<Array<{
        link: string;
        id: number;
    }>>;
    getTocSearchMedia(): Promise<TocSearchMedium[]>;
    getTocSearchMedium(id: number): Promise<TocSearchMedium>;
    /**
     *
     */
    removeSynonyms(synonyms: Synonyms | Synonyms[]): Promise<boolean>;
    /**
     *
     */
    getSynonyms(mediumId: number | number[]): Promise<Synonyms[]>;
    getSimpleMedium(id: number | number[]): Promise<SimpleMedium | SimpleMedium[]>;
}
