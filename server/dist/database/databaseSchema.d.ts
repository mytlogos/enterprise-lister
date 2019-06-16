export declare const databaseSchema: import("./databaseTypes").DatabaseSchema;
export interface Tables {
    user: string;
    external_user: string;
    user_log: string;
    reading_list: string;
    external_reading_list: string;
    medium: string;
    medium_synonyms: string;
    list_medium: string;
    external_list_medium: string;
    part: string;
    episode: string;
    user_episode: string;
    scrape_board: string;
    news_board: string;
    news_user: string;
    news_medium: string;
    meta_corrections: string;
    result_episode: string;
    user_data_invalidation: string;
    [key: string]: string;
}
export declare const Tables: Tables;
