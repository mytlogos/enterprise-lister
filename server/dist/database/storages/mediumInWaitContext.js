"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const subContext_1 = require("./subContext");
const tools_1 = require("../../tools");
class MediumInWaitContext extends subContext_1.SubContext {
    async createFromMediaInWait(medium, same, listId) {
        const title = tools_1.sanitizeString(medium.title);
        const newMedium = await this.addMedium({ title, medium: medium.medium });
        const id = newMedium.id;
        if (!id) {
            throw Error("no medium id available");
        }
        const toDeleteMediaInWaits = [medium];
        if (same && Array.isArray(same)) {
            await Promise.all(same.filter((value) => value && value.medium === medium.medium)
                .map((value) => this.addToc(id, value.link)));
            const synonyms = same.map((value) => tools_1.sanitizeString(value.title))
                .filter((value) => !tools_1.equalsIgnore(value, medium.title));
            if (synonyms.length) {
                await this.addSynonyms({ mediumId: id, synonym: synonyms });
            }
            toDeleteMediaInWaits.push(...same);
        }
        if (listId) {
            await this.addItemToList(false, { id, listId });
        }
        if (medium.link) {
            this.addToc(id, medium.link);
        }
        await this.deleteMediaInWait(toDeleteMediaInWaits);
        const parts = await this.getMediumParts(id);
        newMedium.parts = parts.map((value) => value.id);
        newMedium.latestReleased = [];
        newMedium.currentRead = 0;
        newMedium.unreadEpisodes = [];
        return newMedium;
    }
    async consumeMediaInWait(mediumId, same) {
        if (!same || !same.length) {
            return false;
        }
        await Promise.all(same.filter((value) => value).map((value) => this.addToc(mediumId, value.link)));
        const synonyms = same.map((value) => tools_1.sanitizeString(value.title));
        await this.addSynonyms({ mediumId, synonym: synonyms });
        await this.deleteMediaInWait(same);
        return true;
    }
    getMediaInWait() {
        return this.query("SELECT * FROM medium_in_wait");
    }
    async deleteMediaInWait(mediaInWait) {
        if (!mediaInWait) {
            return;
        }
        // @ts-ignore
        return tools_1.promiseMultiSingle(mediaInWait, (value) => this.delete("medium_in_wait", {
            column: "title", value: value.title
        }, {
            column: "medium", value: value.medium
        }, {
            column: "link", value: value.link
        })).then(tools_1.ignore);
    }
    async addMediumInWait(mediaInWait) {
        await this.multiInsert("INSERT IGNORE INTO medium_in_wait (title, medium, link) VALUES ", mediaInWait, (value) => [value.title, value.medium, value.link]);
    }
}
exports.MediumInWaitContext = MediumInWaitContext;
//# sourceMappingURL=mediumInWaitContext.js.map