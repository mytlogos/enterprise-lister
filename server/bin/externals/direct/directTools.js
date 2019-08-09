import logger from "../../logger";
import { MediaType } from "../../tools";
export function getTextContent(novelTitle, episodeTitle, urlString, content) {
    if (!novelTitle || !episodeTitle) {
        logger.warn("episode link with no novel or episode title: " + urlString);
        return [];
    }
    if (!content) {
        logger.warn("episode link with no content: " + urlString);
        return [];
    }
    const chapterGroups = /^\s*Chapter\s*(\d+(\.\d+)?)/.exec(episodeTitle);
    let index;
    if (chapterGroups) {
        index = Number(chapterGroups[1]);
    }
    if (index == null || Number.isNaN(index)) {
        index = undefined;
    }
    const textEpisodeContent = {
        contentType: MediaType.TEXT,
        content,
        episodeTitle,
        mediumTitle: novelTitle,
        index
    };
    return [textEpisodeContent];
}
//# sourceMappingURL=directTools.js.map