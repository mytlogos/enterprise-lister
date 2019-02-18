export interface ExternalUser {
    uuid: string;
    readonly lists: ExternalList[];
}

export interface ExternalList {
    name: ExternalList;
    uuid: string;
    items: any;
    id: any;
    external: boolean;
    show: boolean;
}

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
    name: ExternalList | undefined;
    external: any;
}

export interface List {
    name: ExternalList;
    id: number;
    external: boolean;
    show: boolean;
    items: number[];
}

export interface News {
    id: any;
    date: Date;
}


export interface User {
    lists: any;
    externalUser: any;
    session: string;
    uuid: string;
    name: string;
}
