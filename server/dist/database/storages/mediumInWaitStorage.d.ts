import { MediumInWait } from "../databaseTypes";
import { Medium, MultiSingle } from "../../types";
export declare class MediumInWaitStorage {
    getMediaInWait(): Promise<MediumInWait[]>;
    createFromMediaInWait(createMedium: MediumInWait, tocsMedia?: MediumInWait[], listId?: number): Promise<Medium>;
    consumeMediaInWait(mediumId: number, tocsMedia: MediumInWait[]): Promise<boolean>;
    deleteMediaInWait(mediaInWait: MultiSingle<MediumInWait>): Promise<void>;
    addMediumInWait(mediaInWait: MultiSingle<MediumInWait>): Promise<void>;
}
