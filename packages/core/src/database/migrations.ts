import { Migration } from "./databaseTypes";
import { MysqlServerError } from "./mysqlError";
import { DatabaseContext } from "./contexts/databaseContext";
import { EmptyPromise } from "../types";

function ignoreError(func: () => EmptyPromise, ignoreErrno: number[]): EmptyPromise {
  return func().catch((reason) => {
    if (reason && Number.isInteger(reason.errno) && !ignoreErrno.includes(reason.errno)) {
      throw reason;
    }
  });
}

export const Migrations: Migration[] = [
  {
    fromVersion: 0,
    toVersion: 1,
    async migrate(context: DatabaseContext): EmptyPromise {
      await ignoreError(async () => {
        await context.addColumn("episode", "combiIndex double DEFAULT 0");
        await context.query(
          "UPDATE episode SET combiIndex=(concat(`totalIndex`, '.', coalesce(`partialIndex`, 0)) + 0)",
        );
      }, [MysqlServerError.ER_DUP_FIELDNAME]);
      await ignoreError(() => context.addColumn("scrape_board", "info TEXT"), [MysqlServerError.ER_DUP_FIELDNAME]);
      await ignoreError(
        () => context.addColumn("scrape_board", "external_uuid char(36)"),
        [MysqlServerError.ER_DUP_FIELDNAME],
      );
      await ignoreError(async () => {
        await context.addColumn("part", "combiIndex double DEFAULT 0");
        await context.query("UPDATE part SET combiIndex=(concat(`totalIndex`, '.', coalesce(`partialIndex`, 0)) + 0)");
      }, [MysqlServerError.ER_DUP_FIELDNAME]);
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
      await ignoreError(
        () => context.dropPrimaryKey("user_data_invalidation"),
        [MysqlServerError.ER_CANT_DROP_FIELD_OR_KEY],
      );
      await context.addUnique("user_data_invalidation", "UNIQUE_NEWS", "news_id", "uuid");
      await context.addUnique("user_data_invalidation", "UNIQUE_MEDIUM", "medium_id", "uuid");
      await context.addUnique("user_data_invalidation", "UNIQUE_PART", "part_id", "uuid");
      await context.addUnique("user_data_invalidation", "UNIQUE_EPISODE", "episode_id", "uuid");
      await context.addUnique("user_data_invalidation", "UNIQUE_LIST", "list_id", "uuid");
      await context.addUnique("user_data_invalidation", "UNIQUE_EXTERNAL_LIST", "external_list_id", "uuid");
      await context.addUnique("user_data_invalidation", "UNIQUE_EXTERNAL_USER", "external_uuid", "uuid");
      await context.addUnique("user_data_invalidation", "UNIQUE_USER", "user_uuid", "uuid");
    },
  },
  {
    fromVersion: 1,
    toVersion: 2,
    async migrate(context: DatabaseContext): EmptyPromise {
      await ignoreError(
        () => context.addColumn("episode_release", "locked BOOLEAN DEFAULT 0"),
        [MysqlServerError.ER_DUP_FIELDNAME],
      );
    },
  },
  {
    fromVersion: 2,
    toVersion: 3,
    async migrate(context: DatabaseContext): EmptyPromise {
      await ignoreError(
        () => context.changeColumn("scrape_board", "last_date", "next_scrape", "datetime"),
        [MysqlServerError.ER_BAD_FIELD_ERROR],
      );
    },
  },
  {
    fromVersion: 3,
    toVersion: 4,
    async migrate(context: DatabaseContext): EmptyPromise {
      await context.alterColumn("episode_release", "url varchar(767) not null");
      await context.alterColumn("meta_corrections", "link VARCHAR(767) NOT NULL");
      await context.alterColumn("page_info", "link VARCHAR(767) NOT NULL");
      await context.alterColumn("medium_toc", "link VARCHAR(767) NOT NULL");
      await context.alterColumn("medium_in_wait", "link VARCHAR(767) NOT NULL");
    },
  },
  {
    fromVersion: 4,
    toVersion: 5,
    async migrate(): EmptyPromise {
      // empty migration as it adds trigger only
    },
  },
  {
    fromVersion: 5,
    toVersion: 6,
    async migrate(context: DatabaseContext): EmptyPromise {
      await context.addColumn("jobs", "runningSince DATETIME");
    },
  },
  {
    fromVersion: 6,
    toVersion: 7,
    async migrate(context: DatabaseContext): EmptyPromise {
      // implicit drop of all triggers which insert rows in user_data_invalidation table
      await Promise.all(
        [
          "reading_list",
          "external_reading_list",
          "medium",
          "part",
          "episode",
          "episode_release",
          "news_board",
          "medium_in_wait",
        ].map((value) =>
          ignoreError(
            () =>
              context.addColumn(value, "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
            [MysqlServerError.ER_DUP_FIELDNAME],
          ),
        ),
      );
      await ignoreError(
        () => context.addColumn("external_user", "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"),
        [MysqlServerError.ER_DUP_FIELDNAME],
      );
    },
  },
  {
    fromVersion: 7,
    toVersion: 8,
    async migrate(context: DatabaseContext): EmptyPromise {
      await ignoreError(
        () =>
          context.addColumn("medium_toc", "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
        [MysqlServerError.ER_DUP_FIELDNAME],
      );
    },
  },
  {
    fromVersion: 8,
    toVersion: 9,
    async migrate(context: DatabaseContext): EmptyPromise {
      await ignoreError(
        () => context.dropForeignKey("medium_toc", "medium_toc_ibfk_1"),
        [MysqlServerError.ER_CANT_DROP_FIELD_OR_KEY],
      );
      await ignoreError(() => context.dropPrimaryKey("medium_toc"), [MysqlServerError.ER_CANT_DROP_FIELD_OR_KEY]);
      await Promise.all(
        [
          "id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY",
          "countryOfOrigin VARCHAR(200)",
          "languageOfOrigin VARCHAR(200)",
          "author VARCHAR(200)",
          "artist VARCHAR(200)",
          "title VARCHAR(200) NOT NULL",
          "medium INT NOT NULL",
          "lang VARCHAR(200)",
          "stateOrigin INT",
          "stateTL INT",
          "series VARCHAR(200)",
          "universe VARCHAR(200)",
        ].map((value) =>
          ignoreError(() => context.addColumn("medium_toc", value), [MysqlServerError.ER_DUP_FIELDNAME]),
        ),
      );
      // no error should occur as primary is dropped before if available
      // context.addPrimaryKey("medium_toc", "id");
      // no error should occur as foreign key is dropped before if available
      context.addForeignKey("medium_toc", "medium_toc_ibfk_1", "medium_id", "medium", "id");
      await ignoreError(
        () => context.addUnique("medium_toc", "UNIQUE_TOC", "medium_id", "link"),
        [MysqlServerError.ER_DUP_KEYNAME],
      );

      await ignoreError(
        () => context.addColumn("episode_release", "toc_id INT UNSIGNED"),
        [MysqlServerError.ER_DUP_FIELDNAME],
      );
      await ignoreError(
        () => context.addForeignKey("episode_release", "episode_release_ibfk_2", "toc_id", "medium_toc", "id"),
        [MysqlServerError.ER_DUP_FIELDNAME],
      );
    },
  },
  {
    fromVersion: 9,
    toVersion: 10,
    async migrate(context: DatabaseContext): EmptyPromise {
      // add index to speed up queries on episode_release where releaseDate is a big factor
      await context.addIndex("episode_release", "episode_release_releaseDate_Index", ["releaseDate"]);
    },
  },
  {
    fromVersion: 10,
    toVersion: 11,
    async migrate(context: DatabaseContext): EmptyPromise {
      // TODO: should i ask for user input before?
      // remove all data, because this change is destructive
      // one cannot/should not simulate the data for the new columns
      await context.query("TRUNCATE job_history;");
      // add columns and ignore duplicate column error
      await Promise.all(
        ["result VARCHAR(100) NOT NULL", "message VARCHAR(200) NOT NULL", "context TEXT NOT NULL"].map((value) =>
          ignoreError(() => context.addColumn("job_history", value), [MysqlServerError.ER_DUP_FIELDNAME]),
        ),
      );
      // add not null restraint
      await context.alterColumn("job_history", "start DATETIME NOT NULL");
      // add not null restraint
      await context.alterColumn("job_history", "end DATETIME NOT NULL");
    },
  },
  {
    fromVersion: 11,
    toVersion: 12,
    async migrate(context: DatabaseContext): EmptyPromise {
      // Table 'scraper_hook is automatically added'

      // add columns and ignore duplicate column error
      await Promise.all(
        ["job_state VARCHAR(200) NOT NULL"].map((value) =>
          ignoreError(() => context.addColumn("jobs", value), [MysqlServerError.ER_DUP_FIELDNAME]),
        ),
      );
    },
  },
  {
    fromVersion: 12,
    toVersion: 13,
    async migrate(context: DatabaseContext): EmptyPromise {
      // add columns and ignore duplicate column error
      await Promise.all(
        ["scheduled_at DATETIME NOT NULL DEFAULT start"].map((value) =>
          ignoreError(() => context.addColumn("job_history", value), [MysqlServerError.ER_DUP_FIELDNAME]),
        ),
      );
    },
  },
  {
    fromVersion: 13,
    toVersion: 14,
    async migrate(): EmptyPromise {
      // empty migration as it adds trigger only
    },
  },
];
