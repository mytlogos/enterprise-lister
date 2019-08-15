"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function ignoreError(func, ignoreErrno) {
    return func().catch((reason) => {
        if (reason && Number.isInteger(reason.errno) && !ignoreErrno.includes(reason.errno)) {
            throw reason;
        }
    });
}
exports.Migrations = [
    {
        fromVersion: 0,
        toVersion: 1,
        async migrate(context) {
            await ignoreError(async () => {
                await context.addColumn("episode", "combiIndex double DEFAULT 0");
                await context.query("UPDATE episode SET combiIndex=(concat(`totalIndex`, '.', coalesce(`partialIndex`, 0)) + 0)");
            }, [1060]);
            await ignoreError(() => context.addColumn("scrape_board", "info TEXT"), [1060]);
            await ignoreError(() => context.addColumn("scrape_board", "external_uuid char(36)"), [1060]);
            await ignoreError(() => context
                .addColumn("part", "combiIndex double DEFAULT 0")
                .then(() => context.query("UPDATE part SET combiIndex=(concat(`totalIndex`, '.', coalesce(`partialIndex`, 0)) + 0)")), [1060]);
            await context.alterColumn("external_user", "uuid char(36)");
            await context.alterColumn("scrape_board", "link varchar(500)");
            await context.alterColumn("user_data_invalidation", "external_uuid char(36)");
            await context.addUnique("episode", "UNIQUE_EPISODE", "part_id", "combiIndex");
            await context.addUnique("medium", "UNIQUE", "title", "medium");
            await context.dropIndex("news_board", "link");
            await context.addUnique("news_board", "link_UNIQUE", "link");
            await context.dropForeignKey("news_user", "news_user_ibfk_2");
            await context.addForeignKey("news_user", "news_user_ibfk_1", "user_id", "user", "uuid");
            await context.addForeignKey("news_user", "news_user_ibfk_2", "news_id", "news_board", "id");
            await context.addUnique("part", "UNIQUE_PART", "medium_id", "combiIndex");
            await context.dropPrimaryKey("scrape_board");
            await context.addPrimaryKey("scrape_board", "link", "type");
            await context.addForeignKey("scrape_board", "scrape_board_ibfk_1", "external_uuid", "external_user", "uuid");
            await context.addForeignKey("scrape_board", "scrape_board_ibfk_3", "uuid", "user", "uuid");
            await context.clearInvalidationTable();
            await ignoreError(() => context.dropPrimaryKey("user_data_invalidation"), [1091]);
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
//# sourceMappingURL=migrations.js.map