import { SubContext } from "./subContext";
import { MediumInWait } from "../databaseTypes";
import { Medium, MultiSingle } from "../../types";
export declare class MediumInWaitContext extends SubContext {
    createFromMediaInWait(medium: MediumInWait, same?: MediumInWait[], listId?: number): Promise<Medium>;
    consumeMediaInWait(mediumId: number, same: MediumInWait[]): Promise<boolean>;
    getMediaInWait(): Promise<MediumInWait[]>;
    deleteMediaInWait(mediaInWait: MultiSingle<MediumInWait>): Promise<void>;
    addMediumInWait(mediaInWait: MultiSingle<MediumInWait>): Promise<void>;
}
