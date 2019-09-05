import {MediumInWait} from "../databaseTypes";
import {storageInContext} from "./storage";
import {Medium, MultiSingle} from "../../types";
import {ContextCallback, queryContextProvider} from "./storageTools";
import {MediumInWaitContext} from "../contexts/mediumInWaitContext";


function inContext<T>(callback: ContextCallback<T, MediumInWaitContext>, transaction = true) {
    return storageInContext(callback, transaction, (con) => queryContextProvider(con).mediumInWaitContext);
}

export class MediumInWaitStorage {
    public getMediaInWait(): Promise<MediumInWait[]> {
        return inContext((context) => context.getMediaInWait());
    }

    public createFromMediaInWait(createMedium: MediumInWait, tocsMedia?: MediumInWait[], listId?: number): Promise<Medium> {
        return inContext((context) => context.createFromMediaInWait(createMedium, tocsMedia, listId));
    }

    public consumeMediaInWait(mediumId: number, tocsMedia: MediumInWait[]): Promise<boolean> {
        return inContext((context) => context.consumeMediaInWait(mediumId, tocsMedia));
    }

    public deleteMediaInWait(mediaInWait: MultiSingle<MediumInWait>): Promise<void> {
        return inContext((context) => context.deleteMediaInWait(mediaInWait));
    }

    public addMediumInWait(mediaInWait: MultiSingle<MediumInWait>): Promise<void> {
        return inContext((context) => context.addMediumInWait(mediaInWait));
    }
}
