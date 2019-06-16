"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const databaseBuilder_1 = require("./databaseBuilder");
const databaseTypes_1 = require("./databaseTypes");
const dataBaseBuilder = new databaseBuilder_1.DataBaseBuilder();
dataBaseBuilder.setName("enterprise");
dataBaseBuilder.getTableBuilder()
    .setName("user")
    .setMain()
    .addInvalidation(databaseTypes_1.InvalidationType.UPDATE)
    .addInvalidation(databaseTypes_1.InvalidationType.INSERT_OR_DELETE, "reading_list")
    .addInvalidation(databaseTypes_1.InvalidationType.INSERT_OR_DELETE, "external_user")
    .parseColumn("name VARCHAR(200) NOT NULL UNIQUE")
    .parseColumn("uuid VARCHAR(200) NOT NULL")
    .parseColumn("salt VARCHAR(200)")
    .parseColumn("password VARCHAR(200) NOT NULL")
    .parseColumn("alg VARCHAR(100) NOT NULL")
    .parseMeta("PRIMARY KEY(uuid)")
    .build();
dataBaseBuilder.getTableBuilder()
    .setName("external_user")
    .addInvalidation(databaseTypes_1.InvalidationType.UPDATE)
    .addInvalidation(databaseTypes_1.InvalidationType.INSERT_OR_DELETE, "external_reading_list")
    .parseColumn("name VARCHAR(200) NOT NULL")
    .parseColumn("uuid VARCHAR(200) NOT NULL")
    .parseColumn("local_uuid VARCHAR(200) NOT NULL")
    .parseColumn("service INT NOT NULL")
    .parseColumn("cookies TEXT")
    .parseColumn("last_scrape DATETIME")
    .parseMeta("PRIMARY KEY(uuid)")
    .parseMeta("FOREIGN KEY(local_uuid) REFERENCES user(uuid)")
    .build();
dataBaseBuilder.getTableBuilder()
    .setName("user_log")
    .parseColumn("user_uuid VARCHAR(255) NOT NULL")
    .parseColumn("ip VARCHAR(255)")
    .parseColumn("session_key VARCHAR(255)")
    .parseColumn("acquisition_date VARCHAR(40)")
    .parseMeta("PRIMARY KEY(session_key)")
    .parseMeta("FOREIGN KEY(user_uuid) REFERENCES user(uuid)")
    .build();
dataBaseBuilder.getTableBuilder()
    .setName("reading_list")
    .addInvalidation(databaseTypes_1.InvalidationType.UPDATE)
    .addInvalidation(databaseTypes_1.InvalidationType.ANY, "list_medium")
    .parseColumn("id INT UNSIGNED NOT NULL AUTO_INCREMENT")
    .parseColumn("name VARCHAR(200) NOT NULL")
    .parseColumn("user_uuid VARCHAR(200) NOT NULL")
    .parseColumn("medium INT NOT NULL")
    .parseMeta("PRIMARY KEY(id)")
    .parseMeta("FOREIGN KEY(user_uuid) REFERENCES user(uuid)")
    .build();
dataBaseBuilder.getTableBuilder()
    .setName("external_reading_list")
    .addInvalidation(databaseTypes_1.InvalidationType.UPDATE)
    .addInvalidation(databaseTypes_1.InvalidationType.ANY, "external_list_medium")
    .parseColumn("id INT UNSIGNED NOT NULL AUTO_INCREMENT")
    .parseColumn("name VARCHAR(200) NOT NULL")
    .parseColumn("user_uuid VARCHAR(200) NOT NULL")
    .parseColumn("medium INT NOT NULL")
    .parseColumn("url VARCHAR(200) NOT NULL")
    .parseMeta("PRIMARY KEY(id)")
    .parseMeta("FOREIGN KEY(user_uuid) REFERENCES user(uuid)")
    .build();
dataBaseBuilder.getTableBuilder()
    .setName("medium")
    .addInvalidation(databaseTypes_1.InvalidationType.UPDATE)
    .addInvalidation(databaseTypes_1.InvalidationType.INSERT_OR_DELETE, "medium_synonyms")
    .addInvalidation(databaseTypes_1.InvalidationType.INSERT_OR_DELETE, "part")
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
    .addInvalidation(databaseTypes_1.InvalidationType.UPDATE)
    .addInvalidation(databaseTypes_1.InvalidationType.INSERT_OR_DELETE, "episode")
    .parseColumn("id INT UNSIGNED NOT NULL AUTO_INCREMENT")
    .parseColumn("medium_id INT UNSIGNED NOT NULL")
    .parseColumn("title VARCHAR(200)")
    .parseColumn("totalIndex INT NOT NULL")
    .parseColumn("partialIndex INT")
    .parseMeta("PRIMARY KEY(id)")
    .parseMeta("FOREIGN KEY(medium_id) REFERENCES medium(id)")
    .build();
dataBaseBuilder.getTableBuilder()
    .setName("episode")
    .addInvalidation(databaseTypes_1.InvalidationType.UPDATE)
    .addInvalidation(databaseTypes_1.InvalidationType.ANY, "user_episode")
    .addInvalidation(databaseTypes_1.InvalidationType.ANY, "episode_release")
    .parseColumn("id INT UNSIGNED NOT NULL AUTO_INCREMENT")
    .parseColumn("part_id INT UNSIGNED NOT NULL")
    .parseColumn("totalIndex INT NOT NULL")
    .parseColumn("partialIndex INT")
    .parseMeta("PRIMARY KEY(id)")
    .parseMeta("FOREIGN KEY(part_id) REFERENCES part(id)")
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
    .parseColumn("user_uuid VARCHAR(200) NOT NULL")
    .parseColumn("episode_id INT UNSIGNED NOT NULL")
    .parseColumn("progress FLOAT UNSIGNED NOT NULL")
    .parseColumn("read_date DATETIME NOT NULL DEFAULT NOW()")
    .parseMeta("PRIMARY KEY(user_uuid, episode_id)")
    .parseMeta("FOREIGN KEY(user_uuid) REFERENCES user(uuid)")
    .parseMeta("FOREIGN KEY(episode_id) REFERENCES episode(id)")
    .build();
dataBaseBuilder.getTableBuilder()
    .setName("scrape_board")
    .parseColumn("link TEXT NOT NULL")
    .parseColumn("last_date DATETIME NOT NULL")
    .parseColumn("type INT UNSIGNED NOT NULL")
    .parseColumn("uuid VARCHAR(200)")
    .parseColumn("medium_id INT UNSIGNED")
    .parseMeta("PRIMARY KEY(link(767))")
    .parseMeta("FOREIGN KEY(uuid) REFERENCES external_user(uuid)")
    .parseMeta("FOREIGN KEY(medium_id) REFERENCES medium(id)")
    .build();
dataBaseBuilder.getTableBuilder()
    .setName("news_board")
    .addInvalidation(databaseTypes_1.InvalidationType.INSERT, "news_user")
    .parseColumn("id INT UNSIGNED NOT NULL AUTO_INCREMENT")
    .parseColumn("title TEXT NOT NULL")
    .parseColumn("link VARCHAR(700) UNIQUE NOT NULL")
    .parseColumn("date DATETIME NOT NULL")
    .parseMeta("PRIMARY KEY (id)")
    .build();
dataBaseBuilder.getTableBuilder()
    .setName("news_user")
    .parseColumn("news_id INT UNSIGNED NOT NULL")
    .parseColumn("user_id VARCHAR(200) NOT NULL")
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
/*
dataBaseBuilder.getTableBuilder()
    .setName("list_settings")
    .parseColumn("uuid VARCHAR(200) NOT NULL")
    .parseColumn("list_id INT UNSIGNED NOT NULL")
    .parseColumn("stringified_settings TEXT")
    .parseMeta("FOREIGN KEY(uuid) REFERENCES user(uuid)")
    .parseMeta("PRIMARY KEY(uuid, list_id)");


dataBaseBuilder.getTableBuilder()
    .setName("external_list_settings")
    .parseColumn("uuid VARCHAR(200) NOT NULL")
    .parseColumn("list_id INT UNSIGNED NOT NULL")
    .parseColumn("stringified_settings TEXT")
    .parseMeta("FOREIGN KEY(uuid) REFERENCES user(uuid)")
    .parseMeta("PRIMARY KEY(uuid, list_id)");


dataBaseBuilder.getTableBuilder()
    .setName("medium_settings")
    .parseColumn("uuid VARCHAR(200) NOT NULL")
    .parseColumn("medium_id INT UNSIGNED NOT NULL")
    .parseColumn("stringified_settings TEXT")
    .parseMeta("FOREIGN KEY(uuid) REFERENCES user(uuid)")
    .parseMeta("PRIMARY KEY(uuid, medium_id)");

dataBaseBuilder.getTableBuilder()
    .setName("app_settings")
    .parseColumn("uuid VARCHAR(200) NOT NULL UNIQUE")
    .parseColumn("stringified_settings TEXT")
    .parseMeta("FOREIGN KEY(uuid) REFERENCES user(uuid)");

dataBaseBuilder.getTableBuilder()
    .setName("service_settings")
    .parseColumn("uuid VARCHAR(200) NOT NULL UNIQUE")
    .parseColumn("stringified_settings TEXT")
    .parseMeta("FOREIGN KEY(uuid) REFERENCES user(uuid)");*/
dataBaseBuilder.getTableBuilder()
    .setName("user_data_invalidation")
    .setInvalidationTable()
    .parseColumn("uuid VARCHAR(200) NOT NULL")
    .parseColumn("user_uuid BOOLEAN")
    .parseColumn("news_id INT UNSIGNED ")
    .parseColumn("medium_id INT UNSIGNED ")
    .parseColumn("part_id INT UNSIGNED ")
    .parseColumn("episode_id INT UNSIGNED ")
    .parseColumn("list_id INT UNSIGNED ")
    .parseColumn("external_list_id INT UNSIGNED ")
    .parseColumn("medium_id INT UNSIGNED")
    .parseColumn("external_uuid VARCHAR(200)")
    .parseMeta("FOREIGN KEY(uuid) REFERENCES user(uuid)")
    .parseMeta("FOREIGN KEY(news_id) REFERENCES news_board(id)")
    .parseMeta("FOREIGN KEY(medium_id) REFERENCES medium(id)")
    .parseMeta("FOREIGN KEY(part_id) REFERENCES part(id)")
    .parseMeta("FOREIGN KEY(episode_id) REFERENCES episode(id)")
    .parseMeta("FOREIGN KEY(list_id) REFERENCES reading_list(id)")
    .parseMeta("FOREIGN KEY(external_list_id) REFERENCES external_reading_list(id)")
    .parseMeta("FOREIGN KEY(external_uuid) REFERENCES external_user(uuid)")
    .parseMeta("PRIMARY KEY(uuid, user_uuid, news_id, medium_id, part_id," +
    "episode_id, list_id, external_list_id, external_uuid)")
    .build();
exports.databaseSchema = dataBaseBuilder.build();
exports.Tables = {
    user: "name VARCHAR(200) NOT NULL UNIQUE," +
        "uuid VARCHAR(200) NOT NULL," +
        "salt VARCHAR(200)," +
        "password VARCHAR(200) NOT NULL," +
        "alg VARCHAR(100) NOT NULL," +
        "PRIMARY KEY(uuid)",
    external_user: "name VARCHAR(200) NOT NULL," +
        "uuid VARCHAR(200) NOT NULL," +
        "local_uuid VARCHAR(200) NOT NULL," +
        "service INT NOT NULL," +
        "cookies TEXT," +
        "last_scrape DATETIME," +
        "PRIMARY KEY(uuid)," +
        "FOREIGN KEY(local_uuid) REFERENCES user(uuid)",
    user_log: "user_uuid VARCHAR(255) NOT NULL," +
        "ip VARCHAR(255)," +
        "session_key VARCHAR(255)," +
        "acquisition_date VARCHAR(40)," +
        "PRIMARY KEY(session_key)," +
        "FOREIGN KEY(user_uuid) REFERENCES user(uuid)",
    reading_list: "id INT UNSIGNED NOT NULL AUTO_INCREMENT," +
        "name VARCHAR(200) NOT NULL," +
        "user_uuid VARCHAR(200) NOT NULL," +
        "medium INT NOT NULL," +
        "PRIMARY KEY(id)," +
        "FOREIGN KEY(user_uuid) REFERENCES user(uuid)",
    external_reading_list: "id INT UNSIGNED NOT NULL AUTO_INCREMENT, " +
        "name VARCHAR(200) NOT NULL," +
        "user_uuid VARCHAR(200) NOT NULL," +
        "medium INT NOT NULL," +
        "url VARCHAR(200) NOT NULL," +
        "PRIMARY KEY(id)," +
        "FOREIGN KEY(user_uuid) REFERENCES external_user(uuid)",
    medium: "id INT UNSIGNED NOT NULL AUTO_INCREMENT, " +
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
    medium_synonyms: "medium_id INT UNSIGNED, " +
        "synonym VARCHAR(200) NOT NULL, " +
        "PRIMARY KEY(medium_id, synonym), " +
        "FOREIGN KEY(medium_id) REFERENCES medium(id)",
    list_medium: "list_id INT UNSIGNED NOT NULL," +
        "medium_id INT UNSIGNED NOT NULL," +
        "PRIMARY KEY(list_id, medium_id)," +
        "FOREIGN KEY(list_id) REFERENCES reading_list(id)," +
        "FOREIGN KEY(medium_id) REFERENCES medium(id)",
    external_list_medium: "list_id INT UNSIGNED NOT NULL," +
        "medium_id INT UNSIGNED NOT NULL," +
        "PRIMARY KEY(list_id, medium_id)," +
        "FOREIGN KEY(list_id) REFERENCES external_reading_list(id)," +
        "FOREIGN KEY(medium_id) REFERENCES medium(id)",
    part: "id INT UNSIGNED NOT NULL AUTO_INCREMENT, " +
        "medium_id INT UNSIGNED NOT NULL, " +
        "title VARCHAR(200)," +
        "totalIndex INT NOT NULL," +
        "partialIndex INT," +
        "PRIMARY KEY(id)," +
        "FOREIGN KEY(medium_id) REFERENCES medium(id)",
    episode: "id INT UNSIGNED NOT NULL AUTO_INCREMENT," +
        "part_id INT UNSIGNED NOT NULL," +
        "title VARCHAR(200)," +
        "totalIndex INT NOT NULL," +
        "partialIndex INT," +
        "url TEXT NOT NULL," +
        "releaseDate DATETIME NOT NULL," +
        "PRIMARY KEY(id)," +
        "FOREIGN KEY(part_id) REFERENCES part(id)",
    user_episode: "user_uuid VARCHAR(200) NOT NULL," +
        "episode_id INT UNSIGNED NOT NULL," +
        "progress FLOAT UNSIGNED NOT NULL," +
        "read_date DATETIME NOT NULL DEFAULT NOW()," +
        "PRIMARY KEY(user_uuid, episode_id)," +
        "FOREIGN KEY(user_uuid) REFERENCES user(uuid)," +
        "FOREIGN KEY(episode_id) REFERENCES episode(id)",
    scrape_board: "link TEXT NOT NULL," +
        "last_date DATETIME NOT NULL," +
        "type INT UNSIGNED NOT NULL," +
        "uuid VARCHAR(200)," +
        "medium_id INT UNSIGNED," +
        "PRIMARY KEY(link(767))," +
        "FOREIGN KEY(uuid) REFERENCES external_user(uuid)," +
        "FOREIGN KEY(medium_id) REFERENCES medium(id)",
    news_board: "id INT UNSIGNED NOT NULL AUTO_INCREMENT," +
        "title TEXT NOT NULL," +
        "link VARCHAR(700) UNIQUE NOT NULL," +
        "date DATETIME NOT NULL," +
        "PRIMARY KEY (id)",
    news_user: "news_id INT UNSIGNED NOT NULL, " +
        "user_id VARCHAR(200) NOT NULL, " +
        "FOREIGN KEY (user_id) REFERENCES user(uuid), " +
        "FOREIGN KEY (news_id) REFERENCES news_board(id), " +
        "PRIMARY KEY (news_id, user_id)",
    news_medium: "news_id INT UNSIGNED NOT NULL, " +
        "medium_id INT UNSIGNED NOT NULL, " +
        "FOREIGN KEY(medium_id) REFERENCES medium(id)," +
        "FOREIGN KEY(news_id) REFERENCES news_board(id)," +
        "PRIMARY KEY(news_id, medium_id)",
    meta_corrections: "link TEXT NOT NULL," +
        "replaced TEXT NOT NULL," +
        "startIndex INT UNSIGNED NOT NULL," +
        "endIndex INT UNSIGNED NOT NULL," +
        "fieldKey INT UNSIGNED NOT NULL," +
        "PRIMARY KEY (link(367), replaced(367), startIndex, endIndex)",
    result_episode: "novel VARCHAR(300) NOT NULL," +
        "chapter VARCHAR(300)," +
        "chapIndex INT UNSIGNED," +
        "volume VARCHAR(300)," +
        "volIndex INT UNSIGNED," +
        "episode_id INT UNSIGNED NOT NULL," +
        "FOREIGN KEY(episode_id) REFERENCES episode(id)," +
        "PRIMARY KEY(novel, chapter, chapIndex)",
    user_data_invalidation: "uuid VARCHAR(200) NOT NULL," +
        "user_uuid BOOLEAN," +
        "news_id INT UNSIGNED ," +
        "medium_id INT UNSIGNED ," +
        "part_id INT UNSIGNED ," +
        "episode_id INT UNSIGNED ," +
        "list_id INT UNSIGNED ," +
        "external_list_id INT UNSIGNED ," +
        "external_uuid VARCHAR(200)," +
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
//# sourceMappingURL=databaseSchema.js.map