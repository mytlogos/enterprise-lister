"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const databaseTypes_1 = require("./databaseTypes");
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
            }, [databaseTypes_1.MySqlErrorNo.ER_DUP_FIELDNAME]);
            await ignoreError(() => context.addColumn("scrape_board", "info TEXT"), [databaseTypes_1.MySqlErrorNo.ER_DUP_FIELDNAME]);
            await ignoreError(() => context.addColumn("scrape_board", "external_uuid char(36)"), [databaseTypes_1.MySqlErrorNo.ER_DUP_FIELDNAME]);
            await ignoreError(async () => {
                await context.addColumn("part", "combiIndex double DEFAULT 0");
                await context.query("UPDATE part SET combiIndex=(concat(`totalIndex`, '.', coalesce(`partialIndex`, 0)) + 0)");
            }, [databaseTypes_1.MySqlErrorNo.ER_DUP_FIELDNAME]);
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
            // tslint:disable-next-line
            await context.addForeignKey("scrape_board", "scrape_board_ibfk_1", "external_uuid", "external_user", "uuid");
            await context.addForeignKey("scrape_board", "scrape_board_ibfk_3", "uuid", "user", "uuid");
            await context.parentContext.clearInvalidationTable();
            await ignoreError(() => context.dropPrimaryKey("user_data_invalidation"), [databaseTypes_1.MySqlErrorNo.ER_CANT_DROP_FIELD_OR_KEY]);
            await context.addUnique("user_data_invalidation", "UNIQUE_NEWS", "news_id", "uuid");
            await context.addUnique("user_data_invalidation", "UNIQUE_MEDIUM", "medium_id", "uuid");
            await context.addUnique("user_data_invalidation", "UNIQUE_PART", "part_id", "uuid");
            await context.addUnique("user_data_invalidation", "UNIQUE_EPISODE", "episode_id", "uuid");
            await context.addUnique("user_data_invalidation", "UNIQUE_LIST", "list_id", "uuid");
            await context.addUnique("user_data_invalidation", "UNIQUE_EXTERNAL_LIST", "external_list_id", "uuid");
            await context.addUnique("user_data_invalidation", "UNIQUE_EXTERNAL_USER", "external_uuid", "uuid");
            await context.addUnique("user_data_invalidation", "UNIQUE_USER", "user_uuid", "uuid");
        }
    },
    {
        fromVersion: 1,
        toVersion: 2,
        async migrate(context) {
            await ignoreError(() => context.addColumn("episode_release", "locked BOOLEAN DEFAULT 0"), [databaseTypes_1.MySqlErrorNo.ER_DUP_FIELDNAME]);
        }
    },
    {
        fromVersion: 2,
        toVersion: 3,
        async migrate(context) {
            await ignoreError(() => context.changeColumn("scrape_board", "last_date", "next_scrape", "datetime"), [databaseTypes_1.MySqlErrorNo.ER_BAD_FIELD_ERROR]);
        }
    },
    {
        fromVersion: 3,
        toVersion: 4,
        async migrate(context) {
            await context.alterColumn("episode_release", "url varchar(767) not null");
            await context.alterColumn("meta_corrections", "link VARCHAR(767) NOT NULL");
            await context.alterColumn("page_info", "link VARCHAR(767) NOT NULL");
            await context.alterColumn("medium_toc", "link VARCHAR(767) NOT NULL");
            await context.alterColumn("medium_in_wait", "link VARCHAR(767) NOT NULL");
        }
    },
    {
        fromVersion: 4,
        toVersion: 5,
        async migrate(context) {
            // empty migration as it adds trigger only
        }
    },
    {
        fromVersion: 5,
        toVersion: 6,
        async migrate(context) {
            await context.addColumn("jobs", "runningSince DATETIME");
        }
    },
    {
        fromVersion: 6,
        toVersion: 7,
        async migrate(context) {
            // implicit drop of all triggers which insert rows in user_data_invalidation table
            await Promise.all([
                "reading_list",
                "external_reading_list",
                "medium",
                "part",
                "episode",
                "episode_release",
                "news_board",
                "medium_in_wait",
            ].map((value) => ignoreError(() => context.addColumn(value, "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"), [databaseTypes_1.MySqlErrorNo.ER_DUP_FIELDNAME])));
            await ignoreError(() => context.addColumn("external_user", "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"), [databaseTypes_1.MySqlErrorNo.ER_DUP_FIELDNAME]);
        }
    },
    {
        fromVersion: 7,
        toVersion: 8,
        async migrate(context) {
            await ignoreError(() => context.addColumn("medium_toc", "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"), [databaseTypes_1.MySqlErrorNo.ER_DUP_FIELDNAME]);
        }
    }
];
//# sourceMappingURL=migrations.js.map