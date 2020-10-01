import {MediaType} from "../server/bin/tools";

export interface Medium {
    id: number;
}

export interface TransferMedium {
    mediumId: any;
    listId: any;
    external: any;
    id: number;
}

export interface TransferList {
    listId: any;
    id: number;
    name: string | undefined;
    external: any;
}

export interface List {
    name: string;
    id: number;
    external: boolean;
    show: boolean;
    items: number[];
}

export interface SimpleMedium {
    id?: number;
    countryOfOrigin?: string;
    languageOfOrigin?: string;
    author?: string;
    title: string;
    medium: number;
    artist?: string;
    lang?: string;
    stateOrigin?: number;
    stateTL?: number;
    series?: string;
    universe?: string;

    [key: string]: any;
}

export interface Medium extends SimpleMedium {
    parts?: number[];
    latestReleased: number[];
    currentRead: number;
    unreadEpisodes: number[];
}

export interface Part {
    id: number;
    title?: string;
    totalIndex: number;
    partialIndex?: number;
    episodes: Episode[];
}

export interface Episode {
    id: number;
    partId?: number;
    title?: string;
    totalIndex: number;
    partialIndex?: number;
    url: string;
    releaseDate: Date;
}

export interface User {
    uuid: string;
    name: string;
    session: string;
    externalUser: ExternalUser[];
    lists: List[];
}

export interface ExternalList {
    uuid?: string;
    id: number;
    name: string;
    medium: number;
    url: string;
    items: number[];
    external: boolean;
    show: boolean;
}

export interface ExternalUser {
    uuid: string;
    identifier: string;
    type: number;
    readonly lists: ExternalList[];
    lastScrape?: Date;
    cookies?: string | null;
}

export interface News {
    title: string;
    link: string;
    date: Date;
    id?: number;
    read?: boolean;
    mediumId?: number;
}

export interface EpisodeNews {
    mediumType: MediaType;
    mediumTitle: string;
    partTitle?: string;
    partIndex?: number;
    episodeTitle: string;
    episodeIndex: number;
    episodeTotalIndex: number;
    episodePartialIndex?: number;
    locked?: boolean;
    link: string;
    date: Date;
}

export interface Synonyms {
    mediumId: number;
    synonym: string | string[];
}
