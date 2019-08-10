import {Migration} from "./databaseTypes";
import {QueryContext} from "./queryContext";

export const Migrations: Migration[] = [
    {
        fromVersion: 0,
        toVersion: 1,
        async migrate(context: QueryContext): Promise<void> {
            await context.addColumn(
                "episode",
                "combiIndex double DEFAULT 0"
            );
            await context.query(
                "UPDATE episode SET combiIndex=(concat(`totalIndex`, '.', coalesce(`partialIndex`, 0)) + 0)"
            );
            await context.addColumn(
                "scrape_board",
                "info TEXT"
            );
            await context.addColumn(
                "scrape_board",
                "external_uuid TEXT"
            );
            await context.addColumn(
                "part",
                "combiIndex double DEFAULT 0"
            );
            await context.query(
                "UPDATE part SET combiIndex=(concat(`totalIndex`, '.', coalesce(`partialIndex`, 0)) + 0)"
            );
            await context.alterColumn(
                "external_user",
                "uuid char(36)"
            );
            await context.alterColumn(
                "external_user",
                "link varchar(500)"
            );
            await context.alterColumn(
                "user_data_invalidation",
                "external_uuid char(36)"
            );

            await context.dropIndex("episode", "part_id");
            await context.addUnique("episode", "UNIQUE_EPISODE", "part_id", "combiIndex");

            await context.addUnique("medium", "UNIQUE", "title", "medium");

            await context.dropIndex("news_board", "link");
            await context.addUnique("news_board", "link_UNIQUE", "link");

            await context.dropForeignKey("news_user", "news_user_ibfk_2");
            await context.addForeignKey("news_user", "news_user_ibfk_1", "user_id", "user", "uuid");
            await context.addForeignKey("news_user", "news_user_ibfk_2", "news_id", "news_board", "id");

            await context.dropIndex("part", "medium_id");
            await context.addUnique("part", "UNIQUE_PART", "medium_id", "combiIndex");

            await context.dropPrimaryKey("scrape_board");
            await context.addPrimaryKey("scrape_board", "link", "type");

            await context.addForeignKey("scrape_board", "scrape_board_ibfk_1", "external_uuid", "external_user", "uuid");
            await context.addForeignKey("scrape_board", "scrape_board_ibfk_3", "uuid", "user", "uuid");

            await context.clearInvalidationTable();
            await context.dropPrimaryKey("user_data_invalidation");
            await context.addUnique("user_data_invalidation", "UNIQUE_NEWS", "news_id", "uuid");
            await context.addUnique("user_data_invalidation", "UNIQUE_MEDIUM", "medium_id", "uuid");
            await context.addUnique("user_data_invalidation", "UNIQUE_PART", "part_id", "uuid");
            await context.addUnique("user_data_invalidation", "UNIQUE_EPISODE", "episode_id", "uuid");
            await context.addUnique("user_data_invalidation", "UNIQUE_LIST", "list_id", "uuid");
            await context.addUnique("user_data_invalidation", "UNIQUE_EXTERNAL_LIST", "external_list_id", "uuid");
            await context.addUnique("user_data_invalidation", "UNIQUE_EXTERNAL_USER", "external_uuid", "uuid");
            await context.addUnique("user_data_invalidation", "UNIQUE_USER", "user_uuid", "uuid");
        }
    }
];
