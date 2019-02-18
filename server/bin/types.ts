export interface Medium {
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
    parts?: Part[];

    [key: string]: any;
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

export interface List {
    id: number;
    name: string;
    medium: number;
    items: number[];
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

}

export interface ExternalUser {
    uuid: string;
    identifier: string;
    type: number;
    lists: ExternalList[];
    lastScrape?: Date;
    cookies?: string | null;
}

export interface News {
    title: string;
    link: string;
    date: Date;
    id?: number;
}

export interface ScrapeItem {
    link: string;
    lastDate?: Date;
    type?: number;
    userId?: number;
    mediumId?: number;
}

export interface LikeMedium {
    medium: Medium;
    title: string;
    link: string;
}

export interface MetaResult {
    novel: string;
    volume?: string;
    volIndex?: string;
    chapter?: string;
    chapIndex?: string;
    type: string;
    seeAble: boolean;
}

export interface Result {
    result: MetaResult | MetaResult[];
    preliminary?: boolean;
    accept?: boolean;
    url: string;
}

export interface Synonyms {
    mediumId: number;
    synonym: string | string[];
}
