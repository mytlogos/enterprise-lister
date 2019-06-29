import {Hook, TextEpisodeContent} from "../types";
import {EpisodeRelease, LikeMedium, MultiSingle, News, Part, SimpleEpisode} from "../../types";
import logger, {logError} from "../../logger";
import {queueCheerioRequest} from "../queueManager";
import emojiStrip from "emoji-strip";
import {Storage} from "../../database/database";
import {max, MediaType} from "../../tools";

export const sourceType = "qidian_underground";

async function scrapeNews(): Promise<News[]> {
    const uri = "https://toc.qidianunderground.org/";

    const $ = await queueCheerioRequest(uri);
    const tocRows = $(".content p + ul");

    const chapterReg = /(\d+)(\s*-\s*(\d+))?/;

    const potentialMediaNews: Array<Promise<void>> = [];
    const now = new Date();

    for (let tocRowIndex = 0; tocRowIndex < tocRows.length; tocRowIndex++) {
        const tocRow = tocRows.eq(tocRowIndex);
        const mediumElement = tocRow.prev();
        const mediumTitle = mediumElement.contents().first().text().trim();

        if (!mediumTitle) {
            logger.warn("changed format on qidianUnderground");
            return [];
        }

        const timeStampElement = mediumElement.find(".timeago").first();
        const date = new Date(timeStampElement.attr("title"));

        if (date > now) {
            // due to summer time the zone of germany is utc+2,
            // but normally qidianUnderground thinks we have utc+1, also winter time all around?
            date.setHours(date.getHours() - 1);
            if (date > now) {
                logger.warn("changed time format on qidianUnderground");
                continue;
            }
        }

        const children = tocRow.find("a");

        const potentialNews: News[] = [];

        for (let j = 0; j < children.length; j++) {
            const titleElement = children.length > 1 ? children.eq(j) : children;
            const link = titleElement.attr("href");

            if (!link) {
                logger.warn(`missing href attribute for '${mediumTitle}' on qidianUnderground`);
                continue;
            }
            const exec = chapterReg.exec(titleElement.text());

            if (!exec) {
                logger.warn("changed format on qidianUnderground");
                continue;
            }

            const startChapterIndex = Number(exec[1]);
            const endChapterIndex = Number(exec[3]);

            if (!Number.isNaN(endChapterIndex)) {
                for (let chapterIndex = startChapterIndex; chapterIndex <= endChapterIndex; chapterIndex++) {
                    const title = emojiStrip(`${mediumTitle} - ${chapterIndex}`);
                    potentialNews.push({title, link, date});
                }
            } else {
                const title = emojiStrip(`${mediumTitle} - ${startChapterIndex}`);
                potentialNews.push({title, link, date});
            }
        }
        if (potentialNews.length) {
            potentialMediaNews.push(processMediumNews(mediumTitle, potentialNews));
        }
    }
    await Promise.all(potentialMediaNews);
    return [];
}
// TODO: 25.06.2019 use caching for likeMedium?
async function processMediumNews(mediumTitle: string, potentialNews: News[]): Promise<void> {
    const likeMedia: MultiSingle<LikeMedium> = await Storage.getLikeMedium({
        title: mediumTitle,
        link: "",
        type: MediaType.TEXT
    });

    if (!likeMedia || Array.isArray(likeMedia) || !likeMedia.medium || likeMedia.medium.id == null) {
        return;
    }
    const latestReleases: SimpleEpisode[] = await Storage.getLatestReleases(likeMedia.medium.id);

    const latestRelease = max(latestReleases, (previous, current) => {
        const maxPreviousRelease = max(previous.releases, "releaseDate");
        const maxCurrentRelease = max(current.releases, "releaseDate");

        return ((maxPreviousRelease && maxPreviousRelease.releaseDate.getTime()) || 0)
            - ((maxCurrentRelease && maxCurrentRelease.releaseDate.getTime()) || 0);
    });

    const chapIndexReg = /(\d+)\s*$/;
    const parts = await Storage.getMediumParts(likeMedia.medium.id);
    let part: Part;

    if (!parts.length) {
        part = await Storage.createStandardPart(likeMedia.medium.id);
    } else if (parts.length !== 1) {
        throw Error("qidian novel does not have exactly one part!");
    } else {
        part = parts[0];
    }

    if (part.totalIndex !== -1) {
        throw Error("qidian novels don't have volumes");
    }

    let news: News[];

    if (latestRelease) {
        const oldReleases: News[] = [];

        news = potentialNews.filter((value) => {
            const exec = chapIndexReg.exec(value.title);

            if (!exec) {
                logger.warn("news title does not end chapter index on qidianUnderground");
                return;
            }
            if (Number(exec[1]) > latestRelease.totalIndex) {
                return true;
            } else {
                oldReleases.push(value);
                return false;
            }
        });

        const sourcedReleases = await Storage.getSourcedReleases(sourceType, likeMedia.medium.id);
        const toUpdateReleases = oldReleases.map((value): EpisodeRelease => {
            return {
                title: value.title,
                url: value.link,
                releaseDate: value.date,
                sourceType,
                episodeId: 0,
            };
        }).filter((value) => {
            const foundRelease = sourcedReleases.find((release) => release.title === value.title);

            if (!foundRelease) {
                logger.warn("wanted to update an unavailable release");
                return false;
            }
            return foundRelease.url !== value.url;
        });
        if (toUpdateReleases.length) {
            Storage
                .updateRelease(part.id, sourceType, toUpdateReleases)
                .catch(logError);
        }
    } else {
        news = potentialNews;
    }

    const newEpisodes = news.map((value): SimpleEpisode => {
        const exec = chapIndexReg.exec(value.title);
        if (!exec) {
            throw Error(`'${value.title}' does not end with chapter number`);
        }
        const totalIndex = Number(exec[1]);
        return {
            totalIndex,
            releases: [
                {
                    episodeId: 0,
                    sourceType,
                    releaseDate: value.date,
                    url: value.link,
                    title: value.title
                }
            ],
            id: 0,
            partId: 0
        };
    });

    if (newEpisodes.length) {
        await Storage.addEpisode(part.id, newEpisodes);
    }
}

async function scrapeContent(urlString: string): Promise<TextEpisodeContent[]> {
    const $ = await queueCheerioRequest(urlString);

    const contents = $(".center-block .well");

    const episodes: TextEpisodeContent[] = [];

    for (let i = 0; i < contents.length; i++) {
        const contentElement = contents.eq(i);

        const contentChildren = contentElement.children();

        const episodeTitle = contentChildren.find("h2").first().remove().text().trim();
        const content = contentChildren.html();

        if (!episodeTitle) {
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
        if (index != null && Number.isNaN(index)) {
            index = undefined;
        }
        const textEpisodeContent: TextEpisodeContent = {
            contentType: MediaType.TEXT,
            content,
            episodeTitle,
            // the pages themselves dont have any novel titles
            mediumTitle: "",
            index
        };
        episodes.push(textEpisodeContent);
    }

    return episodes;
}

scrapeNews.link = "https://toc.qidianunderground.org/";

export function getHook(): Hook {
    return {
        domainReg: /^https:\/\/toc\.qidianunderground\.org/,
        newsAdapter: scrapeNews,
        contentDownloadAdapter: scrapeContent
    };
}
