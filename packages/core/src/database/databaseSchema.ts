import { DataBaseBuilder } from "./databaseBuilder";
import { Migrations } from "./migrations";

const dataBaseBuilder = new DataBaseBuilder(14);

dataBaseBuilder
  .getTableBuilder()
  .setName("user")
  .setMain()
  .parseColumn("name VARCHAR(200) NOT NULL UNIQUE")
  .parseColumn("uuid CHAR(36) NOT NULL")
  .parseColumn("salt VARCHAR(200)")
  .parseColumn("password VARCHAR(200) NOT NULL")
  .parseColumn("alg VARCHAR(100) NOT NULL")
  .parseMeta("PRIMARY KEY(uuid)")
  .build();

dataBaseBuilder
  .getTableBuilder()
  .setName("external_user")
  .parseColumn("name VARCHAR(200) NOT NULL")
  .parseColumn("uuid CHAR(36) NOT NULL")
  .parseColumn("local_uuid CHAR(36) NOT NULL")
  .parseColumn("service INT NOT NULL")
  .parseColumn("cookies TEXT")
  .parseColumn("last_scrape DATETIME")
  .parseColumn("updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
  .parseMeta("PRIMARY KEY(uuid)")
  .parseMeta("FOREIGN KEY(local_uuid) REFERENCES user(uuid)")
  .build();

dataBaseBuilder
  .getTableBuilder()
  .setName("user_log")
  .parseColumn("user_uuid CHAR(36) NOT NULL")
  .parseColumn("ip VARCHAR(100)")
  .parseColumn("session_key CHAR(36)")
  .parseColumn("acquisition_date VARCHAR(40)")
  .parseMeta("PRIMARY KEY(session_key)")
  .parseMeta("FOREIGN KEY(user_uuid) REFERENCES user(uuid)")
  .build();

dataBaseBuilder
  .getTableBuilder()
  .setName("reading_list")
  .parseColumn("id INT UNSIGNED NOT NULL AUTO_INCREMENT")
  .parseColumn("name VARCHAR(200) NOT NULL")
  .parseColumn("user_uuid CHAR(36) NOT NULL")
  .parseColumn("medium INT NOT NULL")
  .parseColumn("updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
  .parseMeta("PRIMARY KEY(id)")
  .parseMeta("FOREIGN KEY(user_uuid) REFERENCES user(uuid)")
  .build();

dataBaseBuilder
  .getTableBuilder()
  .setName("external_reading_list")
  .parseColumn("id INT UNSIGNED NOT NULL AUTO_INCREMENT")
  .parseColumn("name VARCHAR(200) NOT NULL")
  .parseColumn("user_uuid CHAR(36) NOT NULL")
  .parseColumn("medium INT NOT NULL")
  .parseColumn("url VARCHAR(200) NOT NULL")
  .parseColumn("updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
  .parseMeta("PRIMARY KEY(id)")
  .parseMeta("FOREIGN KEY(user_uuid) REFERENCES external_user(uuid)")
  .build();

dataBaseBuilder
  .getTableBuilder()
  .setName("medium")
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
  .parseColumn("updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
  .parseMeta("PRIMARY KEY(id)")
  .parseMeta("UNIQUE(title, medium)")
  .build();

dataBaseBuilder
  .getTableBuilder()
  .setName("medium_synonyms")
  .parseColumn("medium_id INT UNSIGNED")
  .parseColumn("synonym VARCHAR(200) NOT NULL")
  .parseMeta("PRIMARY KEY(medium_id, synonym)")
  .parseMeta("FOREIGN KEY(medium_id) REFERENCES medium(id)")
  .build();

dataBaseBuilder
  .getTableBuilder()
  .setName("medium_toc")
  .parseColumn("medium_id INT UNSIGNED")
  .parseColumn("link VARCHAR(767) NOT NULL")
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
  .parseColumn("updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
  .parseMeta("PRIMARY KEY(id)")
  .parseMeta("UNIQUE(medium_id, link)")
  .parseMeta("FOREIGN KEY(medium_id) REFERENCES medium(id)")
  .build();

dataBaseBuilder
  .getTableBuilder()
  .setName("medium_in_wait")
  .parseColumn("title VARCHAR(180) NOT NULL")
  .parseColumn("medium INT NOT NULL")
  .parseColumn("link VARCHAR(767) NOT NULL")
  .parseColumn("updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
  .parseMeta("PRIMARY KEY(title, medium, link(500))")
  .build();

dataBaseBuilder
  .getTableBuilder()
  .setName("list_medium")
  .parseColumn("list_id INT UNSIGNED NOT NULL")
  .parseColumn("medium_id INT UNSIGNED NOT NULL")
  .parseMeta("PRIMARY KEY(list_id, medium_id)")
  .parseMeta("FOREIGN KEY(list_id) REFERENCES reading_list(id)")
  .parseMeta("FOREIGN KEY(medium_id) REFERENCES medium(id)")
  .build();

dataBaseBuilder
  .getTableBuilder()
  .setName("external_list_medium")
  .parseColumn("list_id INT UNSIGNED NOT NULL")
  .parseColumn("medium_id INT UNSIGNED NOT NULL")
  .parseMeta("PRIMARY KEY(list_id, medium_id)")
  .parseMeta("FOREIGN KEY(list_id) REFERENCES external_reading_list(id)")
  .parseMeta("FOREIGN KEY(medium_id) REFERENCES medium(id)")
  .build();

dataBaseBuilder
  .getTableBuilder()
  .setName("part")
  .parseColumn("id INT UNSIGNED NOT NULL AUTO_INCREMENT")
  .parseColumn("medium_id INT UNSIGNED NOT NULL")
  .parseColumn("title VARCHAR(200)")
  .parseColumn("totalIndex INT NOT NULL")
  .parseColumn("partialIndex INT")
  // TODO: change default to coalesce(totalindex, 0) ...
  .parseColumn("combiIndex DOUBLE NOT NULL DEFAULT 0")
  .parseColumn("updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
  .parseMeta("PRIMARY KEY(id)")
  .parseMeta("FOREIGN KEY(medium_id) REFERENCES medium(id)")
  .parseMeta("UNIQUE(medium_id, combiIndex)")
  .build();

dataBaseBuilder
  .getTableBuilder()
  .setName("episode")
  .parseColumn("id INT UNSIGNED NOT NULL AUTO_INCREMENT")
  .parseColumn("part_id INT UNSIGNED NOT NULL")
  .parseColumn("totalIndex INT NOT NULL")
  .parseColumn("partialIndex INT")
  // TODO: change default to coalesce(totalindex, 0) ...
  .parseColumn("combiIndex DOUBLE NOT NULL DEFAULT 0")
  .parseColumn("updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
  .parseMeta("PRIMARY KEY(id)")
  .parseMeta("FOREIGN KEY(part_id) REFERENCES part(id)")
  .parseMeta("UNIQUE(part_id, combiIndex)")
  .build();

dataBaseBuilder
  .getTableBuilder()
  .setName("episode_release")
  .parseColumn("episode_id INT UNSIGNED NOT NULL")
  // TODO: look through all ~35000 releases without toc_id and set this to "not null" if possible
  .parseColumn("toc_id INT UNSIGNED")
  .parseColumn("title TEXT NOT NULL")
  .parseColumn("url VARCHAR(767) NOT NULL")
  .parseColumn("source_type VARCHAR(200)")
  .parseColumn("releaseDate DATETIME NOT NULL")
  .parseColumn("locked BOOLEAN DEFAULT 0")
  .parseColumn("updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
  .parseMeta("PRIMARY KEY(episode_id, url)")
  .parseMeta("FOREIGN KEY(episode_id) REFERENCES episode(id)")
  .parseMeta("FOREIGN KEY(toc_id) REFERENCES medium_toc(id)")
  .build();

dataBaseBuilder
  .getTableBuilder()
  .setName("user_episode")
  .parseColumn("user_uuid CHAR(36) NOT NULL")
  .parseColumn("episode_id INT UNSIGNED NOT NULL")
  .parseColumn("progress FLOAT UNSIGNED NOT NULL")
  .parseColumn("read_date DATETIME NOT NULL DEFAULT NOW()")
  .parseMeta("PRIMARY KEY(user_uuid, episode_id)")
  .parseMeta("FOREIGN KEY(user_uuid) REFERENCES user(uuid)")
  .parseMeta("FOREIGN KEY(episode_id) REFERENCES episode(id)")
  .build();

dataBaseBuilder
  .getTableBuilder()
  .setName("scrape_board")
  .parseColumn("link VARCHAR(500) NOT NULL")
  .parseColumn("next_scrape DATETIME NOT NULL")
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

dataBaseBuilder
  .getTableBuilder()
  .setName("news_board")
  .parseColumn("id INT UNSIGNED NOT NULL AUTO_INCREMENT")
  .parseColumn("title TEXT NOT NULL")
  .parseColumn("link VARCHAR(700) UNIQUE NOT NULL")
  .parseColumn("date DATETIME NOT NULL")
  .parseColumn("updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
  .parseMeta("PRIMARY KEY (id)")
  .build();

dataBaseBuilder
  .getTableBuilder()
  .setName("news_user")
  .parseColumn("news_id INT UNSIGNED NOT NULL")
  .parseColumn("user_id CHAR(36) NOT NULL")
  .parseMeta("FOREIGN KEY (user_id) REFERENCES user(uuid)")
  .parseMeta("FOREIGN KEY (news_id) REFERENCES news_board(id)")
  .parseMeta("PRIMARY KEY (news_id, user_id)")
  .build();

dataBaseBuilder
  .getTableBuilder()
  .setName("news_medium")
  .parseColumn("news_id INT UNSIGNED NOT NULL")
  .parseColumn("medium_id INT UNSIGNED NOT NULL")
  .parseMeta("FOREIGN KEY(medium_id) REFERENCES medium(id)")
  .parseMeta("FOREIGN KEY (news_id) REFERENCES news_board(id)")
  .parseMeta("PRIMARY KEY(news_id, medium_id)")
  .build();

dataBaseBuilder
  .getTableBuilder()
  .setName("meta_corrections")
  .parseColumn("link VARCHAR(767) NOT NULL")
  .parseColumn("replaced TEXT NOT NULL")
  .parseColumn("startIndex INT UNSIGNED NOT NULL")
  .parseColumn("endIndex INT UNSIGNED NOT NULL")
  .parseColumn("fieldKey INT UNSIGNED NOT NULL")
  .parseMeta("PRIMARY KEY (link(367), replaced(367), startIndex, endIndex)")
  .build();

dataBaseBuilder
  .getTableBuilder()
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

dataBaseBuilder
  .getTableBuilder()
  .setName("page_info")
  .parseColumn("link VARCHAR(767) NOT NULL")
  .parseColumn("keyString VARCHAR(200) NOT NULL")
  .parseColumn("value TEXT NOT NULL")
  .build();

dataBaseBuilder
  .getTableBuilder()
  .setName("enterprise_database_info")
  .parseColumn("version INT UNSIGNED NOT NULL")
  .parseColumn("migrating BOOLEAN NOT NULL DEFAULT 0")
  .build();

dataBaseBuilder
  .getTableBuilder()
  .setName("jobs")
  .parseColumn("id INT UNSIGNED NOT NULL AUTO_INCREMENT")
  .parseColumn("type VARCHAR(200) NOT NULL")
  .parseColumn("name VARCHAR(200) UNIQUE")
  .parseColumn("state VARCHAR(200) NOT NULL")
  .parseColumn("job_state VARCHAR(200) NOT NULL")
  .parseColumn("interval INT NOT NULL")
  .parseColumn("deleteAfterRun INT NOT NULL")
  .parseColumn("runAfter INT")
  .parseColumn("runningSince DATETIME")
  .parseColumn("lastRun DATETIME")
  .parseColumn("nextRun DATETIME")
  .parseColumn("arguments TEXT")
  .parseMeta("PRIMARY KEY(id)")
  .build();

dataBaseBuilder
  .getTableBuilder()
  .setName("job_history")
  .parseColumn("id INT UNSIGNED NOT NULL")
  .parseColumn("type VARCHAR(200) NOT NULL")
  .parseColumn("name VARCHAR(200) NOT NULL")
  .parseColumn("deleteAfterRun BOOLEAN NOT NULL")
  .parseColumn("runAfter INT")
  .parseColumn("scheduled_at DATETIME NOT NULL DEFAULT start")
  .parseColumn("start DATETIME NOT NULL")
  .parseColumn("end DATETIME NOT NULL")
  .parseColumn("result VARCHAR(100) NOT NULL")
  .parseColumn("message VARCHAR(200) NOT NULL")
  .parseColumn("context TEXT NOT NULL")
  .parseColumn("created INT NOT NULL DEFAULT 0")
  .parseColumn("updated INT NOT NULL DEFAULT 0")
  .parseColumn("deleted INT NOT NULL DEFAULT 0")
  .parseColumn("queries INT NOT NULL DEFAULT 0")
  .parseColumn("network_queries INT NOT NULL DEFAULT 0")
  .parseColumn("network_received INT NOT NULL DEFAULT 0")
  .parseColumn("network_send INT NOT NULL DEFAULT 0")
  // .parseColumn("duration INT NOT NULL AS (end - start) PERSISTENT") // currently not supported in parseColumn
  // .parseColumn("lagging INT NOT NULL AS (start - scheduled_at) PERSISTENT") // currently not supported in parseColumn
  .parseColumn("arguments TEXT")
  .parseMeta("PRIMARY KEY(id, start)")
  .build();

dataBaseBuilder
  .getTableBuilder()
  .setName("scraper_hook")
  .parseColumn("id INT UNSIGNED NOT NULL AUTO_INCREMENT")
  .parseColumn("name VARCHAR(200) NOT NULL UNIQUE")
  .parseColumn("state VARCHAR(200) NOT NULL")
  .parseColumn("message VARCHAR(200) NOT NULL")
  .parseMeta("PRIMARY KEY(id)")
  .build();

dataBaseBuilder
  .getTableBuilder()
  .setName("app_events")
  .parseColumn("id INT UNSIGNED NOT NULL AUTO_INCREMENT")
  .parseColumn("program VARCHAR(200) NOT NULL")
  .parseColumn("date DATETIME NOT NULL")
  .parseColumn("type VARCHAR(200) NOT NULL")
  .parseMeta("PRIMARY KEY(id)")
  .build();

dataBaseBuilder
  .getTableBuilder()
  .setName("job_stat_summary")
  .parseColumn("name VARCHAR(200) NOT NULL")
  .parseColumn("type VARCHAR(200) NOT NULL")
  .parseColumn("count INT NOT NULL")
  .parseColumn("failed INT NOT NULL")
  .parseColumn("succeeded INT NOT NULL")
  .parseColumn("network_requests INT NOT NULL")
  .parseColumn("min_network_requests INT NOT NULL")
  .parseColumn("max_network_requests INT NOT NULL")
  .parseColumn("network_send INT NOT NULL")
  .parseColumn("min_network_send INT NOT NULL")
  .parseColumn("max_network_send INT NOT NULL")
  .parseColumn("network_received INT NOT NULL")
  .parseColumn("min_network_received INT NOT NULL")
  .parseColumn("max_network_received INT NOT NULL")
  .parseColumn("duration INT NOT NULL")
  .parseColumn("min_duration INT NOT NULL")
  .parseColumn("max_duration INT NOT NULL")
  .parseColumn("lagging INT NOT NULL")
  .parseColumn("min_lagging INT NOT NULL")
  .parseColumn("max_lagging INT NOT NULL")
  .parseColumn("updated INT NOT NULL")
  .parseColumn("min_updated INT NOT NULL")
  .parseColumn("max_updated INT NOT NULL")
  .parseColumn("created INT NOT NULL")
  .parseColumn("min_created INT NOT NULL")
  .parseColumn("max_created INT NOT NULL")
  .parseColumn("deleted INT NOT NULL")
  .parseColumn("min_deleted INT NOT NULL")
  .parseColumn("max_deleted INT NOT NULL")
  .parseColumn("sql_queries INT NOT NULL")
  .parseColumn("min_sql_queries INT NOT NULL")
  .parseColumn("max_sql_queries INT NOT NULL")
  .parseMeta("PRIMARY KEY(name)")
  .build();

dataBaseBuilder.addMigrations(...Migrations);

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

dataBaseBuilder
  .getTableBuilder()
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
      "episode_id, list_id, external_list_id, external_uuid)",
  )
  .build();

export const databaseSchema = dataBaseBuilder.build();
