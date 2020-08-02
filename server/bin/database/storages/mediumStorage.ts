import {
    FullMediumToc,
    LikeMedium,
    LikeMediumQuery,
    Medium,
    MediumToc,
    SimpleMedium,
    Synonyms,
    TocSearchMedium,
    UpdateMedium
} from "../../types";
import {ContextCallback, queryContextProvider} from "./storageTools";
import {storageInContext} from "./storage";
import {MediumContext} from "../contexts/mediumContext";
import {Query} from "mysql";


function inContext<T>(callback: ContextCallback<T, MediumContext>, transaction = true) {
    return storageInContext(callback, transaction, (con) => queryContextProvider(con).mediumContext);
}

export class MediumStorage {
    public removeToc(tocLink: string): Promise<void> {
        return inContext((context) => context.removeToc(tocLink));
    }

    /**
     * Adds a medium to the storage.
     *
     * @return {Promise<SimpleMedium>}
     */
    public addMedium(medium: SimpleMedium, uuid?: string): Promise<SimpleMedium> {
        return inContext((context) => context.addMedium(medium, uuid));
    }

    /**
     * Gets one or multiple media from the storage.
     */
    public getMedium(id: number | number[], uuid: string): Promise<Medium | Medium[]> {
        // @ts-ignore
        return inContext((context) => context.getMedium(id, uuid));
    }

    public getAllFull(): Promise<Query> {
        return inContext((context) => context.getAllMediaFull());
    }

    /**
     * Gets one or multiple media from the storage.
     */
    public getAllMedia(): Promise<number[]> {
        return inContext((context) => context.getAllMedia());
    }

    public getLikeMedium(likeMedia: LikeMediumQuery): Promise<LikeMedium>;
    public getLikeMedium(likeMedia: LikeMediumQuery[]): Promise<LikeMedium[]>;
    /**
     * Gets one or multiple media from the storage, which are like the input.
     */
    public getLikeMedium(likeMedia: LikeMediumQuery | LikeMediumQuery[]): Promise<LikeMedium | LikeMedium[]> {
        // @ts-ignore
        return inContext((context) => context.getLikeMedium(likeMedia));
    }

    /**
     * Updates a medium from the storage.
     */
    public updateMedium(medium: UpdateMedium): Promise<boolean> {
        return inContext((context) => context.updateMedium(medium));
    }

    /**
     * Updates a mediumToc from the storage.
     */
    public updateMediumToc(medium: FullMediumToc): Promise<boolean> {
        return inContext((context) => context.updateMediumToc(medium));
    }

    /**
     */
    public addSynonyms(synonyms: Synonyms | Synonyms[]): Promise<boolean> {
        return inContext((context) => context.addSynonyms(synonyms));
    }

    /**
     */
    public addToc(mediumId: number, link: string): Promise<void> {
        return inContext((context) => context.addToc(mediumId, link));
    }

    /**
     */
    public getTocs(mediumId: number): Promise<string[]> {
        return inContext((context) => context.getToc(mediumId));
    }

    /**
     */
    public getMediumTocs(mediumId: number[]): Promise<FullMediumToc[]> {
        return inContext((context) => context.getMediumTocs(mediumId));
    }

    /**
     */
    public removeMediumToc(mediumId: number, link: string): Promise<boolean> {
        return inContext((context) => context.removeMediumToc(mediumId, link));
    }

    /**
     */
    public getAllMediaTocs(): Promise<Array<{ link?: string, id: number }>> {
        return inContext((context) => context.getAllMediaTocs());
    }

    /**
     */
    public getAllTocs(): Promise<Array<{ link: string, id: number }>> {
        return inContext((context) => context.getAllTocs());
    }

    public getTocSearchMedia(): Promise<TocSearchMedium[]> {
        return inContext((context) => context.getTocSearchMedia());
    }

    public getTocSearchMedium(id: number): Promise<TocSearchMedium> {
        return inContext((context) => context.getTocSearchMedium(id));
    }

    /**
     *
     */
    public removeSynonyms(synonyms: Synonyms | Synonyms[]): Promise<boolean> {
        return inContext((context) => context.removeSynonyms(synonyms));
    }

    /**
     *
     */
    public getSynonyms(mediumId: number | number[]): Promise<Synonyms[]> {
        return inContext((context) => context.getSynonyms(mediumId));
    }


    public getSimpleMedium(id: number | number[]): Promise<SimpleMedium | SimpleMedium[]> {
        return inContext((context) => context.getSimpleMedium(id));
    }

    public async mergeMedia(sourceMediumId: number, destMedium: number): Promise<boolean> {
        return inContext((context) => context.mergeMedia(sourceMediumId, destMedium));
    }

    public async splitMedium(sourceMediumId: number, destMedium: SimpleMedium, toc: string): Promise<number> {
        return inContext((context) => context.splitMedium(sourceMediumId, destMedium, toc));
    }

    public async transferToc(sourceMediumId: number, destMediumId: number, toc: string): Promise<boolean> {
        return inContext((context) => context.transferToc(sourceMediumId, destMediumId, toc));
    }
}
