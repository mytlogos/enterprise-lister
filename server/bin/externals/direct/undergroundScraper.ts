import {EpisodeContent, Hook} from "../types";
import {EpisodeNews, EpisodeRelease, LikeMedium, MultiSingle, News, SimpleEpisode} from "../../types";
import logger from "../../logger";
import {queueCheerioRequest} from "../queueManager";
import {max, MediaType, sanitizeString} from "../../tools";
import {episodeStorage, mediumStorage, partStorage} from "../../database/storages/storage";

export const sourceType = "qidian_underground";

async function scrapeNews(): Promise<{ news?: News[], episodes?: EpisodeNews[] } | undefined> {
    const uri = "https://toc.qidianunderground.org/";

    const $ = await queueCheerioRequest(uri);
    const tocRows = $(".content p + ul");

    const chapterReg = /(\d+)(\s*-\s*(\d+))?/;

    const potentialMediaNews: Array<Promise<void>> = [];
    const now = new Date();

    for (let tocRowIndex = 0; tocRowIndex < tocRows.length; tocRowIndex++) {
        const tocRow = tocRows.eq(tocRowIndex);
        const mediumElement = tocRow.prev();
        const mediumTitle = sanitizeString(mediumElement.contents().first().text().trim());

        if (!mediumTitle) {
            logger.warn("changed format on qidianUnderground");
            return;
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
            const link = titleElement.attr("href") as string;

            if (!link) {
                logger.warn(`missing href attribute for '${mediumTitle}' on qidianUnderground`);
                continue;
            }
            const exec = chapterReg.exec(sanitizeString(titleElement.text()));

            if (!exec) {
                logger.warn("changed format on qidianUnderground");
                continue;
            }

            const startChapterIndex = Number(exec[1]);
            const endChapterIndex = Number(exec[3]);

            if (!Number.isNaN(endChapterIndex)) {
                for (let chapterIndex = startChapterIndex; chapterIndex <= endChapterIndex; chapterIndex++) {
                    const title = sanitizeString(`${mediumTitle} - ${chapterIndex}`);
                    potentialNews.push({title, link, date});
                }
            } else {
                const title = sanitizeString(`${mediumTitle} - ${startChapterIndex}`);
                potentialNews.push({title, link, date});
            }
        }
        if (potentialNews.length) {
            potentialMediaNews.push(processMediumNews(mediumTitle, potentialNews));
        }
    }
    await Promise.all(potentialMediaNews);
}

// TODO: 25.06.2019 use caching for likeMedium?
async function processMediumNews(mediumTitle: string, potentialNews: News[]): Promise<void> {
    const likeMedia: MultiSingle<LikeMedium> = await mediumStorage.getLikeMedium({
        title: mediumTitle,
        link: "",
        type: MediaType.TEXT
    });

    if (!likeMedia || Array.isArray(likeMedia) || !likeMedia.medium || !likeMedia.medium.id) {
        return;
    }
    const mediumId = likeMedia.medium.id;
    const latestReleases: SimpleEpisode[] = await episodeStorage.getLatestReleases(mediumId);

    const latestRelease = max(latestReleases, (previous, current) => {
        const maxPreviousRelease = max(previous.releases, "releaseDate");
        const maxCurrentRelease = max(current.releases, "releaseDate");

        return ((maxPreviousRelease && maxPreviousRelease.releaseDate.getTime()) || 0)
            - ((maxCurrentRelease && maxCurrentRelease.releaseDate.getTime()) || 0);
    });

    const chapIndexReg = /(\d+)\s*$/;
    let standardPart = await partStorage.getStandardPart(mediumId);

    if (!standardPart) {
        standardPart = await partStorage.createStandardPart(mediumId);
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

        const sourcedReleases = await episodeStorage.getSourcedReleases(sourceType, mediumId);
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
            episodeStorage.updateRelease(toUpdateReleases).catch(logger.error);
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
            // @ts-ignore
            partId: standardPart.id
        };
    });

    if (newEpisodes.length) {
        await episodeStorage.addEpisode(newEpisodes);
    }
}

async function scrapeContent(urlString: string): Promise<EpisodeContent[]> {
    const $ = await queueCheerioRequest(urlString);

    const contents = $(".center-block .well");

    const episodes: EpisodeContent[] = [];

    for (let i = 0; i < contents.length; i++) {
        const contentElement = contents.eq(i);

        const contentChildren = contentElement.children();

        const episodeTitle = sanitizeString(contentChildren.find("h2").first().remove().text().trim());
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
        const episodeContent: EpisodeContent = {
            content: [content],
            episodeTitle,
            // the pages themselves dont have any novel titles
            mediumTitle: "",
            index
        };
        episodes.push(episodeContent);
    }

    return episodes;
}

scrapeNews.link = "https://toc.qidianunderground.org/";

export function getHook(): Hook {
    return {
        name: "qidianunderground",
        medium: MediaType.TEXT,
        domainReg: /^https:\/\/toc\.qidianunderground\.org/,
        newsAdapter: scrapeNews,
        contentDownloadAdapter: scrapeContent
    };
}
