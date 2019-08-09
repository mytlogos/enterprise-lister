import {DataBaseBuilder} from "./databaseBuilder";
import {InvalidationType} from "./databaseTypes";
import {TriggerEvent, TriggerTiming} from "./trigger";
import {Migrations} from "./migrations";

const dataBaseBuilder = new DataBaseBuilder("enterprise", 1);

dataBaseBuilder.getTableBuilder()
    .setName("user")
    .setMain()
    .addInvalidation(InvalidationType.UPDATE)
    .addInvalidation(InvalidationType.INSERT_OR_DELETE, "reading_list")
    .addInvalidation(InvalidationType.INSERT_OR_DELETE, "external_user")
    .parseColumn("name VARCHAR(200) NOT NULL UNIQUE")
    .parseColumn("uuid CHAR(36) NOT NULL")
    .parseColumn("salt VARCHAR(200)")
    .parseColumn("password VARCHAR(200) NOT NULL")
    .parseColumn("alg VARCHAR(100) NOT NULL")
    .parseMeta("PRIMARY KEY(uuid)")
    .build();

dataBaseBuilder.getTableBuilder()
    .setName("external_user")
    .addInvalidation(InvalidationType.UPDATE)
    .addInvalidation(InvalidationType.INSERT_OR_DELETE, "external_reading_list")
    .parseColumn("name VARCHAR(200) NOT NULL")
    .parseColumn("uuid CHAR(36) NOT NULL")
    .parseColumn("local_uuid CHAR(36) NOT NULL")
    .parseColumn("service INT NOT NULL")
    .parseColumn("cookies TEXT")
    .parseColumn("last_scrape DATETIME")
    .parseMeta("PRIMARY KEY(uuid)")
    .parseMeta("FOREIGN KEY(local_uuid) REFERENCES user(uuid)")
    .build();

dataBaseBuilder.getTableBuilder()
    .setName("user_log")
    .parseColumn("user_uuid CHAR(36) NOT NULL")
    .parseColumn("ip VARCHAR(100)")
    .parseColumn("session_key CHAR(36)")
    .parseColumn("acquisition_date VARCHAR(40)")
    .parseMeta("PRIMARY KEY(session_key)")
    .parseMeta("FOREIGN KEY(user_uuid) REFERENCES user(uuid)")
    .build();

dataBaseBuilder.getTableBuilder()
    .setName("reading_list")
    .addInvalidation(InvalidationType.UPDATE)
    .addInvalidation(InvalidationType.ANY, "list_medium")
    .parseColumn("id INT UNSIGNED NOT NULL AUTO_INCREMENT")
    .parseColumn("name VARCHAR(200) NOT NULL")
    .parseColumn("user_uuid CHAR(36) NOT NULL")
    .parseColumn("medium INT NOT NULL")
    .parseMeta("PRIMARY KEY(id)")
    .parseMeta("FOREIGN KEY(user_uuid) REFERENCES user(uuid)")
    .build();

dataBaseBuilder.getTableBuilder()
    .setName("external_reading_list")
    .addInvalidation(InvalidationType.UPDATE)
    .addInvalidation(InvalidationType.ANY, "external_list_medium")
    .parseColumn("id INT UNSIGNED NOT NULL AUTO_INCREMENT")
    .parseColumn("name VARCHAR(200) NOT NULL")
    .parseColumn("user_uuid CHAR(36) NOT NULL")
    .parseColumn("medium INT NOT NULL")
    .parseColumn("url VARCHAR(200) NOT NULL")
    .parseMeta("PRIMARY KEY(id)")
    .parseMeta("FOREIGN KEY(user_uuid) REFERENCES external_user(uuid)")
    .build();

dataBaseBuilder.getTableBuilder()
    .setName("medium")
    .addInvalidation(InvalidationType.UPDATE)
    .addInvalidation(InvalidationType.INSERT_OR_DELETE, "medium_synonyms")
    .addInvalidation(InvalidationType.INSERT_OR_DELETE, "part")
    .parseColumn("id INT UNSIGNED NOT NULL AUTO_INCREMENT")
    .parseColumn("countryOfOrigin VARCHAR(200)")
    .parseColumn("languageOfOrigin VARCHAR(200)")
    .parseColumn("author VARCHAR(200)")
    .parseColumn("artist VARCHAR(200)")
    .parseColumn("title VARCHAR(200) NOT NULL")
    .parseColumn("medium INT NOT NULL")
    .parseColumn("lang VARCHAR(200)")
    .parseColumn("stateOrigin INT")
    .parseColumn("stateTL INT")
    .parseColumn("series VARCHAR(200)")
    .parseColumn("universe VARCHAR(200)")
    .parseMeta("PRIMARY KEY(id)")
    .parseMeta("UNIQUE(title, medium)")
    .build();


dataBaseBuilder.getTableBuilder()
    .setName("medium_synonyms")
    .parseColumn("medium_id INT UNSIGNED")
    .parseColumn("synonym VARCHAR(200) NOT NULL")
    .parseMeta("PRIMARY KEY(medium_id, synonym)")
    .parseMeta("FOREIGN KEY(medium_id) REFERENCES medium(id)")
    .build();

dataBaseBuilder.getTableBuilder()
    .setName("medium_toc")
    .parseColumn("medium_id INT UNSIGNED")
    .parseColumn("link TEXT NOT NULL")
    .parseMeta("PRIMARY KEY(medium_id, link(767))")
    .parseMeta("FOREIGN KEY(medium_id) REFERENCES medium(id)")
    .build();

dataBaseBuilder.getTableBuilder()
    .setName("medium_in_wait")
    .parseColumn("title VARCHAR(180) NOT NULL")
    .parseColumn("medium INT NOT NULL")
    .parseColumn("link TEXT NOT NULL")
    .parseMeta("PRIMARY KEY(title, medium, link(500))")
    .build();

dataBaseBuilder.getTableBuilder()
    .setName("list_medium")
    .parseColumn("list_id INT UNSIGNED NOT NULL")
    .parseColumn("medium_id INT UNSIGNED NOT NULL")
    .parseMeta("PRIMARY KEY(list_id, medium_id)")
    .parseMeta("FOREIGN KEY(list_id) REFERENCES reading_list(id)")
    .parseMeta("FOREIGN KEY(medium_id) REFERENCES medium(id)")
    .build();

dataBaseBuilder.getTableBuilder()
    .setName("external_list_medium")
    .parseColumn("list_id INT UNSIGNED NOT NULL")
    .parseColumn("medium_id INT UNSIGNED NOT NULL")
    .parseMeta("PRIMARY KEY(list_id, medium_id)")
    .parseMeta("FOREIGN KEY(list_id) REFERENCES external_reading_list(id)")
    .parseMeta("FOREIGN KEY(medium_id) REFERENCES medium(id)")
    .build();

dataBaseBuilder.getTableBuilder()
    .setName("part")
    .addInvalidation(InvalidationType.UPDATE)
    .addInvalidation(InvalidationType.INSERT_OR_DELETE, "episode")
    .parseColumn("id INT UNSIGNED NOT NULL AUTO_INCREMENT")
    .parseColumn("medium_id INT UNSIGNED NOT NULL")
    .parseColumn("title VARCHAR(200)")
    .parseColumn("totalIndex INT NOT NULL")
    .parseColumn("partialIndex INT")
    .parseColumn("combiIndex DOUBLE NOT NULL DEFAULT (concat(`totalIndex`,_utf8mb4'.',coalesce(`partialIndex`,0)) + 0)")
    .parseMeta("PRIMARY KEY(id)")
    .parseMeta("FOREIGN KEY(medium_id) REFERENCES medium(id)")
    .parseMeta("UNIQUE(medium_id, combiIndex)")
    .build();

dataBaseBuilder.getTableBuilder()
    .setName("episode")
    .addInvalidation(InvalidationType.UPDATE)
    .addInvalidation(InvalidationType.ANY, "user_episode")
    .addInvalidation(InvalidationType.ANY, "episode_release")
    .parseColumn("id INT UNSIGNED NOT NULL AUTO_INCREMENT")
    .parseColumn("part_id INT UNSIGNED NOT NULL")
    .parseColumn("totalIndex INT NOT NULL")
    .parseColumn("partialIndex INT")
    .parseColumn("combiIndex DOUBLE NOT NULL DEFAULT (concat(`totalIndex`,_utf8mb4'.',coalesce(`partialIndex`,0)) + 0)")
    .parseMeta("PRIMARY KEY(id)")
    .parseMeta("FOREIGN KEY(part_id) REFERENCES part(id)")
    .parseMeta("UNIQUE(part_id, combiIndex)")
    .build();

dataBaseBuilder.getTableBuilder()
    .setName("episode_release")
    .parseColumn("episode_id INT UNSIGNED NOT NULL")
    .parseColumn("title TEXT NOT NULL")
    .parseColumn("url TEXT NOT NULL")
    .parseColumn("source_type VARCHAR(200)")
    .parseColumn("releaseDate DATETIME NOT NULL")
    .parseMeta("PRIMARY KEY(episode_id, url(767))")
    .parseMeta("FOREIGN KEY(episode_id) REFERENCES episode(id)")
    .build();

dataBaseBuilder.getTableBuilder()
    .setName("user_episode")
    .parseColumn("user_uuid CHAR(36) NOT NULL")
    .parseColumn("episode_id INT UNSIGNED NOT NULL")
    .parseColumn("progress FLOAT UNSIGNED NOT NULL")
    .parseColumn("read_date DATETIME NOT NULL DEFAULT NOW()")
    .parseMeta("PRIMARY KEY(user_uuid, episode_id)")
    .parseMeta("FOREIGN KEY(user_uuid) REFERENCES user(uuid)")
    .parseMeta("FOREIGN KEY(episode_id) REFERENCES episode(id)")
    .build();

dataBaseBuilder.getTableBuilder()
    .setName("scrape_board")
    .parseColumn("link VARCHAR(500) NOT NULL")
    .parseColumn("last_date DATETIME NOT NULL")
    .parseColumn("type INT UNSIGNED NOT NULL")
    .parseColumn("uuid CHAR(36)")
    .parseColumn("external_uuid CHAR(36)")
    .parseColumn("info TEXT")
    .parseColumn("medium_id INT UNSIGNED")
    .parseMeta("PRIMARY KEY(link, type)")
    .parseMeta("FOREIGN KEY(uuid) REFERENCES user(uuid)")
    .parseMeta("FOREIGN KEY(external_uuid) REFERENCES external_user(uuid)")
    .parseMeta("FOREIGN KEY(medium_id) REFERENCES medium(id)")
    .build();

dataBaseBuilder.getTableBuilder()
    .setName("news_board")
    .addInvalidation(InvalidationType.INSERT, "news_user")
    .parseColumn("id INT UNSIGNED NOT NULL AUTO_INCREMENT")
    .parseColumn("title TEXT NOT NULL")
    .parseColumn("link VARCHAR(700) UNIQUE NOT NULL")
    .parseColumn("date DATETIME NOT NULL")
    .parseMeta("PRIMARY KEY (id)")
    .build();

dataBaseBuilder.getTableBuilder()
    .setName("news_user")
    .parseColumn("news_id INT UNSIGNED NOT NULL")
    .parseColumn("user_id CHAR(36) NOT NULL")
    .parseMeta("FOREIGN KEY (user_id) REFERENCES user(uuid)")
    .parseMeta("FOREIGN KEY (news_id) REFERENCES news_board(id)")
    .parseMeta("PRIMARY KEY (news_id, user_id)")
    .build();

dataBaseBuilder.getTableBuilder()
    .setName("news_medium")
    .parseColumn("news_id INT UNSIGNED NOT NULL")
    .parseColumn("medium_id INT UNSIGNED NOT NULL")
    .parseMeta("FOREIGN KEY(medium_id) REFERENCES medium(id)")
    .parseMeta("FOREIGN KEY (news_id) REFERENCES news_board(id)")
    .parseMeta("PRIMARY KEY(news_id, medium_id)")
    .build();

dataBaseBuilder.getTableBuilder()
    .setName("meta_corrections")
    .parseColumn("link TEXT NOT NULL")
    .parseColumn("replaced TEXT NOT NULL")
    .parseColumn("startIndex INT UNSIGNED NOT NULL")
    .parseColumn("endIndex INT UNSIGNED NOT NULL")
    .parseColumn("fieldKey INT UNSIGNED NOT NULL")
    .parseMeta("PRIMARY KEY (link(367), replaced(367), startIndex, endIndex)")
    .build();

dataBaseBuilder.getTableBuilder()
    .setName("result_episode")
    .parseColumn("novel VARCHAR(300) NOT NULL")
    .parseColumn("chapter VARCHAR(300)")
    .parseColumn("chapIndex INT UNSIGNED")
    .parseColumn("volIndex INT UNSIGNED")
    .parseColumn("volume VARCHAR(300)")
    .parseColumn("episode_id INT UNSIGNED NOT NULL")
    .parseMeta("FOREIGN KEY(episode_id) REFERENCES episode(id)")
    .parseMeta("PRIMARY KEY(novel, chapter, chapIndex)")
    .build();

dataBaseBuilder.getTableBuilder()
    .setName("page_info")
    .parseColumn("link TEXT NOT NULL")
    .parseColumn("keyString VARCHAR(200) NOT NULL")
    .parseColumn("value TEXT NOT NULL")
    .build();

dataBaseBuilder.getTableBuilder()
    .setName("page_info")
    .parseColumn("link TEXT NOT NULL")
    .parseColumn("keyString VARCHAR(200) NOT NULL")
    .parseColumn("value TEXT NOT NULL")
    .build();

dataBaseBuilder.getTableBuilder()
    .setName("enterprise_database_info")
    .parseColumn("version INT NOT NULL UNSIGNED")
    .build();

dataBaseBuilder.getTriggerBuilder()
    .setName("episode_AFTER_INSERT")
    .setTiming(TriggerTiming.AFTER)
    .setEvent(TriggerEvent.INSERT)
    .setTable("episode")
    .setBody("INSERT IGNORE INTO user_data_invalidation (uuid, part_id) SELECT uuid, NEW.part_id FROM user;")
    .build();

dataBaseBuilder.getTriggerBuilder()
    .setName("episode_AFTER_UPDATE")
    .setTiming(TriggerTiming.AFTER)
    .setEvent(TriggerEvent.UPDATE)
    .setTable("episode")
    .setBody("INSERT IGNORE INTO user_data_invalidation (uuid, episode_id) SELECT uuid, NEW.id FROM user;")
    .build();

dataBaseBuilder.getTriggerBuilder()
    .setName("episode_release_AFTER_INSERT")
    .setTiming(TriggerTiming.AFTER)
    .setEvent(TriggerEvent.INSERT)
    .setTable("episode_release")
    .setBody("INSERT IGNORE INTO user_data_invalidation (uuid, episode_id) SELECT uuid, NEW.episode_id FROM user;")
    .build();

dataBaseBuilder.getTriggerBuilder()
    .setName("episode_release_AFTER_UPDATE")
    .setTiming(TriggerTiming.AFTER)
    .setEvent(TriggerEvent.UPDATE)
    .setTable("episode_release")
    .setBody("INSERT IGNORE INTO user_data_invalidation (uuid, episode_id) SELECT uuid, NEW.episode_id FROM user;")
    .build();

dataBaseBuilder.getTriggerBuilder()
    .setName("external_list_medium_AFTER_INSERT")
    .setTiming(TriggerTiming.AFTER)
    .setEvent(TriggerEvent.INSERT)
    .setTable("external_list_medium")
    .setBody("INSERT IGNORE INTO user_data_invalidation (uuid, external_list_id) SELECT local_uuid, NEW.list_id FROM user inner join external_reading_list on external_reading_list.id=list_id inner join external_user on user_uuid=uuid;")
    .build();

dataBaseBuilder.getTriggerBuilder()
    .setName("external_reading_list_AFTER_INSERT")
    .setTiming(TriggerTiming.AFTER)
    .setEvent(TriggerEvent.INSERT)
    .setTable("external_reading_list")
    .setBody("INSERT IGNORE INTO user_data_invalidation (uuid, external_uuid) VALUES ((SELECT local_uuid FROM external_user WHERE uuid=NEW.user_uuid LIMIT 1), NEW.user_uuid);")
    .build();

dataBaseBuilder.getTriggerBuilder()
    .setName("external_reading_list_AFTER_UPDATE")
    .setTiming(TriggerTiming.AFTER)
    .setEvent(TriggerEvent.UPDATE)
    .setTable("external_reading_list")
    .setBody("INSERT IGNORE INTO user_data_invalidation (uuid, external_list_id) VALUES ((SELECT local_uuid FROM external_user WHERE uuid=NEW.user_uuid LIMIT 1), NEW.id);")
    .build();

dataBaseBuilder.getTriggerBuilder()
    .setName("external_user_AFTER_INSERT")
    .setTiming(TriggerTiming.AFTER)
    .setEvent(TriggerEvent.INSERT)
    .setTable("external_user")
    .setBody("INSERT IGNORE INTO user_data_invalidation (uuid, uuid) VALUES(NEW.local_uuid, 1);")
    .build();

dataBaseBuilder.getTriggerBuilder()
    .setName("external_user_AFTER_UPDATE")
    .setTiming(TriggerTiming.AFTER)
    .setEvent(TriggerEvent.UPDATE)
    .setTable("external_user")
    .setBody("INSERT IGNORE INTO user_data_invalidation (uuid, external_user) VALUES(NEW.local_uuid, NEW.uuid);")
    .build();

dataBaseBuilder.getTriggerBuilder()
    .setName("list_medium_AFTER_INSERT")
    .setTiming(TriggerTiming.AFTER)
    .setEvent(TriggerEvent.INSERT)
    .setTable("list_medium")
    .setBody("INSERT IGNORE INTO user_data_invalidation (uuid, list_id) SELECT user_uuid, NEW.list_id FROM user inner join reading_list on reading_list.id=NEW.list_id;")
    .build();

dataBaseBuilder.getTriggerBuilder()
    .setName("medium_AFTER_UPDATE")
    .setTiming(TriggerTiming.AFTER)
    .setEvent(TriggerEvent.UPDATE)
    .setTable("medium")
    .setBody("INSERT IGNORE INTO user_data_invalidation (uuid, medium_id) SELECT uuid, NEW.id FROM user;")
    .build();

dataBaseBuilder.getTriggerBuilder()
    .setName("medium_synonyms_AFTER_INSERT")
    .setTiming(TriggerTiming.AFTER)
    .setEvent(TriggerEvent.INSERT)
    .setTable("medium_synonyms")
    .setBody("INSERT IGNORE INTO user_data_invalidation (uuid, medium_id) SELECT uuid, NEW.medium_id FROM user;")
    .build();

dataBaseBuilder.getTriggerBuilder()
    .setName("medium_toc_AFTER_INSERT")
    .setTiming(TriggerTiming.AFTER)
    .setEvent(TriggerEvent.INSERT)
    .setTable("medium_toc")
    .setBody("INSERT IGNORE INTO user_data_invalidation (uuid, medium_id) SELECT uuid, NEW.medium_id FROM user;")
    .build();

dataBaseBuilder.getTriggerBuilder()
    .setName("news_board_AFTER_INSERT")
    .setTiming(TriggerTiming.AFTER)
    .setEvent(TriggerEvent.INSERT)
    .setTable("news_board")
    .setBody("INSERT IGNORE INTO user_data_invalidation (uuid, news_id) SELECT uuid, NEW.id FROM user;")
    .build();

dataBaseBuilder.getTriggerBuilder()
    .setName("news_user_AFTER_INSERT")
    .setTiming(TriggerTiming.AFTER)
    .setEvent(TriggerEvent.INSERT)
    .setTable("news_user")
    .setBody("INSERT IGNORE INTO user_data_invalidation (uuid, news_id) VALUES (NEW.user_id, NEW.news_id);")
    .build();

dataBaseBuilder.getTriggerBuilder()
    .setName("part_AFTER_INSERT")
    .setTiming(TriggerTiming.AFTER)
    .setEvent(TriggerEvent.INSERT)
    .setTable("part")
    .setBody("INSERT IGNORE INTO user_data_invalidation (uuid, medium_id) SELECT uuid, NEW.medium_id FROM user;")
    .build();

dataBaseBuilder.getTriggerBuilder()
    .setName("part_AFTER_UPDATE")
    .setTiming(TriggerTiming.AFTER)
    .setEvent(TriggerEvent.UPDATE)
    .setTable("part")
    .setBody("INSERT IGNORE INTO user_data_invalidation (uuid, part_id) SELECT uuid, NEW.id FROM user;")
    .build();

dataBaseBuilder.getTriggerBuilder()
    .setName("reading_list_AFTER_INSERT")
    .setTiming(TriggerTiming.AFTER)
    .setEvent(TriggerEvent.INSERT)
    .setTable("reading_list")
    .setBody("INSERT IGNORE INTO user_data_invalidation (uuid, user_uuid) VALUES (NEW.user_uuid, 1);")
    .build();

dataBaseBuilder.getTriggerBuilder()
    .setName("reading_list_AFTER_UPDATE")
    .setTiming(TriggerTiming.AFTER)
    .setEvent(TriggerEvent.UPDATE)
    .setTable("reading_list")
    .setBody("INSERT IGNORE INTO user_data_invalidation (uuid, list_id) VALUES (NEW.user_uuid, NEW.id);")
    .build();

dataBaseBuilder.getTriggerBuilder()
    .setName("user_AFTER_UPDATE")
    .setTiming(TriggerTiming.AFTER)
    .setEvent(TriggerEvent.UPDATE)
    .setTable("user")
    .setBody("INSERT IGNORE INTO user_data_invalidation (uuid, user_uud) VALUES (NEW.uuid,1);")
    .build();

dataBaseBuilder.getTriggerBuilder()
    .setName("user_episode_AFTER_INSERT")
    .setTiming(TriggerTiming.AFTER)
    .setEvent(TriggerEvent.INSERT)
    .setTable("user_episode")
    .setBody("INSERT IGNORE INTO user_data_invalidation (uuid, episode_id) VALUES (NEW.user_uuid, NEW.episode_id);")
    .build();

dataBaseBuilder.getTriggerBuilder()
    .setName("user_episode_AFTER_UPDATE")
    .setTiming(TriggerTiming.AFTER)
    .setEvent(TriggerEvent.UPDATE)
    .setTable("user_episode")
    .setBody("INSERT IGNORE INTO user_data_invalidation (uuid, episode_id) VALUES (NEW.user_uuid, NEW.episode_id);")
    .build();

dataBaseBuilder.addMigrations(...Migrations);

// todo user defined function, create it automatically at startup
// "CREATE DEFINER=`root`@`localhost` FUNCTION `combineFloat`(whole INT, afterDecimal INT) RETURNS float\n" +
// "    DETERMINISTIC\n" +
// "BEGIN\n" +
// "RETURN concat(whole,'.', Coalesce(afterDecimal,0))+0;\n" +
// "END"

/*
dataBaseBuilder.getTableBuilder()
    .setName("list_settings")
    .parseColumn("uuid CHAR(36) NOT NULL")
    .parseColumn("list_id INT UNSIGNED NOT NULL")
    .parseColumn("stringified_settings TEXT")
    .parseMeta("FOREIGN KEY(uuid) REFERENCES user(uuid)")
    .parseMeta("PRIMARY KEY(uuid, list_id)");


dataBaseBuilder.getTableBuilder()
    .setName("external_list_settings")
    .parseColumn("uuid CHAR(36) NOT NULL")
    .parseColumn("list_id INT UNSIGNED NOT NULL")
    .parseColumn("stringified_settings TEXT")
    .parseMeta("FOREIGN KEY(uuid) REFERENCES user(uuid)")
    .parseMeta("PRIMARY KEY(uuid, list_id)");


dataBaseBuilder.getTableBuilder()
    .setName("medium_settings")
    .parseColumn("uuid CHAR(36) NOT NULL")
    .parseColumn("medium_id INT UNSIGNED NOT NULL")
    .parseColumn("stringified_settings TEXT")
    .parseMeta("FOREIGN KEY(uuid) REFERENCES user(uuid)")
    .parseMeta("PRIMARY KEY(uuid, medium_id)");

dataBaseBuilder.getTableBuilder()
    .setName("app_settings")
    .parseColumn("uuid CHAR(36) NOT NULL UNIQUE")
    .parseColumn("stringified_settings TEXT")
    .parseMeta("FOREIGN KEY(uuid) REFERENCES user(uuid)");

dataBaseBuilder.getTableBuilder()
    .setName("service_settings")
    .parseColumn("uuid CHAR(36) NOT NULL UNIQUE")
    .parseColumn("stringified_settings TEXT")
    .parseMeta("FOREIGN KEY(uuid) REFERENCES user(uuid)");*/

dataBaseBuilder.getTableBuilder()
    .setName("user_data_invalidation")
    .setInvalidationTable()
    .parseColumn("uuid CHAR(36) NOT NULL")
    .parseColumn("user_uuid BOOLEAN")
    .parseColumn("news_id INT UNSIGNED ")
    .parseColumn("medium_id INT UNSIGNED ")
    .parseColumn("part_id INT UNSIGNED ")
    .parseColumn("episode_id INT UNSIGNED ")
    .parseColumn("list_id INT UNSIGNED ")
    .parseColumn("external_list_id INT UNSIGNED ")
    .parseColumn("external_uuid CHAR(36)")
    .parseMeta("FOREIGN KEY(uuid) REFERENCES user(uuid)")
    .parseMeta("FOREIGN KEY(news_id) REFERENCES news_board(id)")
    .parseMeta("FOREIGN KEY(medium_id) REFERENCES medium(id)")
    .parseMeta("FOREIGN KEY(part_id) REFERENCES part(id)")
    .parseMeta("FOREIGN KEY(episode_id) REFERENCES episode(id)")
    .parseMeta("FOREIGN KEY(list_id) REFERENCES reading_list(id)")
    .parseMeta("FOREIGN KEY(external_list_id) REFERENCES external_reading_list(id)")
    .parseMeta("FOREIGN KEY(external_uuid) REFERENCES external_user(uuid)")
    .parseMeta(
        "PRIMARY KEY(uuid, user_uuid, news_id, medium_id, part_id," +
        "episode_id, list_id, external_list_id, external_uuid)")
    .build();

export const databaseSchema = dataBaseBuilder.build();

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


export const Tables: Tables = {
    user:
        "name VARCHAR(200) NOT NULL UNIQUE," +
        "uuid CHAR(36) NOT NULL," +
        "salt VARCHAR(200)," +
        "password VARCHAR(200) NOT NULL," +
        "alg VARCHAR(100) NOT NULL," +
        "PRIMARY KEY(uuid)",
    external_user:
        "name VARCHAR(200) NOT NULL," +
        "uuid CHAR(36) NOT NULL," +
        "local_uuid CHAR(36) NOT NULL," +
        "service INT NOT NULL," +
        "cookies TEXT," +
        "last_scrape DATETIME," +
        "PRIMARY KEY(uuid)," +
        "FOREIGN KEY(local_uuid) REFERENCES user(uuid)",
    user_log:
        "user_uuid VARCHAR(255) NOT NULL," +
        "ip VARCHAR(255)," +
        "session_key VARCHAR(255)," +
        "acquisition_date VARCHAR(40)," +
        "PRIMARY KEY(session_key)," +
        "FOREIGN KEY(user_uuid) REFERENCES user(uuid)",
    reading_list:
        "id INT UNSIGNED NOT NULL AUTO_INCREMENT," +
        "name VARCHAR(200) NOT NULL," +
        "user_uuid CHAR(36) NOT NULL," +
        "medium INT NOT NULL," +
        "PRIMARY KEY(id)," +
        "FOREIGN KEY(user_uuid) REFERENCES user(uuid)",
    external_reading_list:
        "id INT UNSIGNED NOT NULL AUTO_INCREMENT, " +
        "name VARCHAR(200) NOT NULL," +
        "user_uuid CHAR(36) NOT NULL," +
        "medium INT NOT NULL," +
        "url VARCHAR(200) NOT NULL," +
        "PRIMARY KEY(id)," +
        "FOREIGN KEY(user_uuid) REFERENCES external_user(uuid)",
    medium:
        "id INT UNSIGNED NOT NULL AUTO_INCREMENT, " +
        "countryOfOrigin VARCHAR(200)," +
        "languageOfOrigin VARCHAR(200)," +
        "author VARCHAR(200)," +
        "artist VARCHAR(200)," +
        "title VARCHAR(200) NOT NULL," +
        "medium INT NOT NULL," +
        "lang VARCHAR(200)," +
        "stateOrigin INT," +
        "stateTL INT," +
        "series VARCHAR(200)," +
        "universe VARCHAR(200)," +
        "PRIMARY KEY(id)",
    medium_synonyms:
        "medium_id INT UNSIGNED, " +
        "synonym VARCHAR(200) NOT NULL, " +
        "PRIMARY KEY(medium_id, synonym), " +
        "FOREIGN KEY(medium_id) REFERENCES medium(id)",
    list_medium:
        "list_id INT UNSIGNED NOT NULL," +
        "medium_id INT UNSIGNED NOT NULL," +
        "PRIMARY KEY(list_id, medium_id)," +
        "FOREIGN KEY(list_id) REFERENCES reading_list(id)," +
        "FOREIGN KEY(medium_id) REFERENCES medium(id)",
    external_list_medium:
        "list_id INT UNSIGNED NOT NULL," +
        "medium_id INT UNSIGNED NOT NULL," +
        "PRIMARY KEY(list_id, medium_id)," +
        "FOREIGN KEY(list_id) REFERENCES external_reading_list(id)," +
        "FOREIGN KEY(medium_id) REFERENCES medium(id)",
    part:
        "id INT UNSIGNED NOT NULL AUTO_INCREMENT, " +
        "medium_id INT UNSIGNED NOT NULL, " +
        "title VARCHAR(200)," +
        "totalIndex INT NOT NULL," +
        "partialIndex INT," +
        "combiIndex DOUBLE NOT NULL DEFAULT (concat(`totalIndex`,_utf8mb4'.',coalesce(`partialIndex`,0)) + 0)," +
        "PRIMARY KEY(id)," +
        "FOREIGN KEY(medium_id) REFERENCES medium(id), " +
        "UNIQUE(medium_id, combiIndex)",
    episode:
        "id INT UNSIGNED NOT NULL AUTO_INCREMENT," +
        "part_id INT UNSIGNED NOT NULL," +
        "totalIndex INT NOT NULL," +
        "partialIndex INT," +
        "combiIndex DOUBLE NOT NULL DEFAULT (concat(`totalIndex`,_utf8mb4'.',coalesce(`partialIndex`,0)) + 0)," +
        "PRIMARY KEY(id)," +
        "FOREIGN KEY(part_id) REFERENCES part(id)," +
        "UNIQUE(part_id, combiIndex)",
    user_episode:
        "user_uuid CHAR(36) NOT NULL," +
        "episode_id INT UNSIGNED NOT NULL," +
        "progress FLOAT UNSIGNED NOT NULL," +
        "read_date DATETIME NOT NULL DEFAULT NOW()," +
        "PRIMARY KEY(user_uuid, episode_id)," +
        "FOREIGN KEY(user_uuid) REFERENCES user(uuid)," +
        "FOREIGN KEY(episode_id) REFERENCES episode(id)",
    scrape_board:
        "link TEXT NOT NULL," +
        "last_date DATETIME NOT NULL," +
        "type INT UNSIGNED NOT NULL," +
        "uuid CHAR(36)," +
        "medium_id INT UNSIGNED," +
        "PRIMARY KEY(link(767))," +
        "FOREIGN KEY(uuid) REFERENCES external_user(uuid)," +
        "FOREIGN KEY(medium_id) REFERENCES medium(id)",
    news_board:
        "id INT UNSIGNED NOT NULL AUTO_INCREMENT," +
        "title TEXT NOT NULL," +
        "link VARCHAR(700) UNIQUE NOT NULL," +
        "date DATETIME NOT NULL," +
        "PRIMARY KEY (id)",
    news_user:
        "news_id INT UNSIGNED NOT NULL, " +
        "user_id CHAR(36) NOT NULL, " +
        "FOREIGN KEY (user_id) REFERENCES user(uuid), " +
        "FOREIGN KEY (news_id) REFERENCES news_board(id), " +
        "PRIMARY KEY (news_id, user_id)",
    news_medium:
        "news_id INT UNSIGNED NOT NULL, " +
        "medium_id INT UNSIGNED NOT NULL, " +
        "FOREIGN KEY(medium_id) REFERENCES medium(id)," +
        "FOREIGN KEY(news_id) REFERENCES news_board(id)," +
        "PRIMARY KEY(news_id, medium_id)",
    meta_corrections:
        "link TEXT NOT NULL," +
        "replaced TEXT NOT NULL," +
        "startIndex INT UNSIGNED NOT NULL," +
        "endIndex INT UNSIGNED NOT NULL," +
        "fieldKey INT UNSIGNED NOT NULL," +
        "PRIMARY KEY (link(367), replaced(367), startIndex, endIndex)",
    result_episode:
        "novel VARCHAR(300) NOT NULL," +
        "chapter VARCHAR(300)," +
        "chapIndex INT UNSIGNED," +
        "volume VARCHAR(300)," +
        "volIndex INT UNSIGNED," +
        "episode_id INT UNSIGNED NOT NULL," +
        "FOREIGN KEY(episode_id) REFERENCES episode(id)," +
        "PRIMARY KEY(novel, chapter, chapIndex)",
    user_data_invalidation:
        "uuid CHAR(36) NOT NULL," +
        "user_uuid BOOLEAN," +
        "news_id INT UNSIGNED ," +
        "medium_id INT UNSIGNED ," +
        "part_id INT UNSIGNED ," +
        "episode_id INT UNSIGNED ," +
        "list_id INT UNSIGNED ," +
        "external_list_id INT UNSIGNED ," +
        "external_uuid CHAR(36)," +
        "FOREIGN KEY(uuid) REFERENCES user(uuid)," +
        "FOREIGN KEY(news_id) REFERENCES news_board(id)," +
        "FOREIGN KEY(medium_id) REFERENCES medium(id)," +
        "FOREIGN KEY(part_id) REFERENCES part(id)," +
        "FOREIGN KEY(episode_id) REFERENCES episode(id)," +
        "FOREIGN KEY(list_id) REFERENCES reading_list(id)," +
        "FOREIGN KEY(external_list_id) REFERENCES external_reading_list(id)," +
        "FOREIGN KEY(external_uuid) REFERENCES external_user(uuid)," +
        "PRIMARY KEY(uuid, user_uuid, news_id, medium_id, part_id, " +
        "episode_id, list_id, external_list_id, external_uuid)"
};
