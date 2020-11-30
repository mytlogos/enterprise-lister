import { SubContext } from "./subContext";
import { MediumInWait } from "../databaseTypes";
import { Medium, SimpleMedium, MultiSingleValue, EmptyPromise } from "../../types";
import { equalsIgnore, ignore, promiseMultiSingle, sanitizeString, multiSingle } from "../../tools";
import { storeModifications } from "../sqlTools";

export class MediumInWaitContext extends SubContext {
    public async createFromMediaInWait(medium: MediumInWait, same?: MediumInWait[], listId?: number): Promise<Medium> {
        const title = sanitizeString(medium.title);
        const newMedium: SimpleMedium | Medium = await this.parentContext.mediumContext.addMedium({
            title,
            medium: medium.medium
        });

        const id = newMedium.id;
        if (!id) {
            throw Error("no medium id available");
        }
        const toDeleteMediaInWaits = [medium];

        if (same && Array.isArray(same)) {
            await Promise.all(same.filter((value) => value && value.medium === medium.medium)
                .map((value) => this.parentContext.mediumContext.addToc(id, value.link)));

            const synonyms: string[] = same.map((value) => sanitizeString(value.title))
                .filter((value) => !equalsIgnore(value, medium.title));

            if (synonyms.length) {
                await this.parentContext.mediumContext.addSynonyms({ mediumId: id, synonym: synonyms });
            }
            toDeleteMediaInWaits.push(...same);
        }
        if (listId) {
            await this.parentContext.internalListContext.addItemToList({ id, listId });
        }
        if (medium.link) {
            await this.parentContext.mediumContext.addToc(id, medium.link);
        }

        await this.deleteMediaInWait(toDeleteMediaInWaits);
        const parts = await this.parentContext.partContext.getMediumParts(id);
        newMedium.parts = parts.map((value) => value.id);
        newMedium.latestReleased = [];
        newMedium.currentRead = 0;
        newMedium.unreadEpisodes = [];
        return newMedium as Medium;
    }

    public async consumeMediaInWait(mediumId: number, same: MediumInWait[]): Promise<boolean> {
        if (!same || !same.length) {
            return false;
        }
        await Promise.all(same
            .filter((value) => value)
            .map((value) => this.parentContext.mediumContext.addToc(mediumId, value.link))
        );

        const synonyms: string[] = same.map((value) => sanitizeString(value.title));

        await this.parentContext.mediumContext.addSynonyms({ mediumId, synonym: synonyms });
        await this.deleteMediaInWait(same);
        return true;
    }

    public getMediaInWait(): Promise<MediumInWait[]> {
        return this.query("SELECT * FROM medium_in_wait");
    }

    public async deleteMediaInWait(mediaInWait: MultiSingleValue<MediumInWait>): EmptyPromise {
        if (!mediaInWait) {
            return;
        }
        return promiseMultiSingle(mediaInWait, async (value: MediumInWait) => {
            const result = await this.delete(
                "medium_in_wait",
                {
                    column: "title", value: value.title
                },
                {
                    column: "medium", value: value.medium
                },
                {
                    column: "link", value: value.link
                },
            );
            storeModifications("medium_in_wait", "delete", result);
            return result.affectedRows > 0;
        }).then(ignore);
    }

    public async addMediumInWait(mediaInWait: MultiSingleValue<MediumInWait>): EmptyPromise {
        const results = await this.multiInsert(
            "INSERT IGNORE INTO medium_in_wait (title, medium, link) VALUES ",
            mediaInWait,
            (value: any) => [value.title, value.medium, value.link]
        );
        multiSingle(results, (result) => storeModifications("medium_in_wait", "insert", result));
    }
}
