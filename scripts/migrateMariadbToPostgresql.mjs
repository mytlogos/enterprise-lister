import { QueryContext } from "../packages/core/dist/database/contexts/queryContext.js";
import { startStorage, waitStorage, storageInContext } from "../packages/core/dist/database/storages/storage.js";
import { gracefulShutdown } from "../packages/core/dist/exit.js";
import { createConnection } from "promise-mysql";
import { sql } from "slonik";


function insert(query) {
  console.log(new Date(), "inserting into", query.sql.match(/insert into "?(\w+)"?/i)[1]);
  return storageInContext((context) => context.con.query(query), (con) => new QueryContext({ connection: con, subClass: new Map() }));
}

const connection = await createConnection(
  {
    host: process.env.SOURCE_DB_HOST,
    user: process.env.SOURCE_DB_USER,
    port: process.env.SOURCE_DB_PORT,
    password: process.env.SOURCE_DB_PASSWORD,
    database: "enterprise",
  }
);

// check connection of source
await connection.ping()

// start pool to target
startStorage();
// wait for for target initialization
await waitStorage();

let results;
let values;

results = await connection.query("SELECT id, name, state, updated_at, hookState, comment FROM custom_hook;");
values = results.map((value) => [value.id, value.name, value.hookState === "enabled", value.updated_at.toISOString(), value.state, value.comment]);
await insert(sql`INSERT INTO custom_hook (id, name, enabled, updated_at, state, comment) SELECT * FROM ${sql.unnest(values, ["int8", "text", "bool", "timestamptz", "jsonb", "text"])} ON CONFLICT DO NOTHING;`);

results = await connection.query("SELECT name, uuid, salt, password, alg FROM `user`;");
values = results.map((value) => [value.name, value.uuid, value.salt, value.password, value.alg]);
await insert(sql`INSERT INTO "user" ("name", uuid, salt, "password", alg) SELECT * FROM ${sql.unnest(values, ["text", "text", "text", "text", "text"])} ON CONFLICT DO NOTHING;`);

results = await connection.query("SELECT `id`,`countryOfOrigin`,`languageOfOrigin`,`author`,`artist`,`title`,`medium`,`lang`,`stateOrigin`,`stateTL`,`series`,`universe`,`updated_at` FROM medium;");
values = results.map((value) => [value.id,value.title,value.medium,value.countryOfOrigin,value.languageOfOrigin,value.author,value.artist,value.lang,value.stateOrigin,value.stateTL,value.series,value.universe,value.updated_at.toISOString()]);
await insert(sql`INSERT INTO medium (id,title,medium,country_of_origin,language_of_origin,author,artist,lang,state_origin,state_tl,series,universe,updated_at) SELECT * FROM ${sql.unnest(values, ["int8","text","int4","text","text","text","text","text","int8","int8","text","text", "timestamptz"])} ON CONFLICT DO NOTHING;`);

results = await connection.query("SELECT `id`, medium_id, link,`countryOfOrigin`,`languageOfOrigin`,`author`,`artist`,`title`,`medium`,`lang`,`stateOrigin`,`stateTL`,`series`,`universe`,`updated_at` FROM medium_toc;");
values = results.map((value) => [value.id,value.medium_id,value.link,value.title,value.medium,value.countryOfOrigin,value.languageOfOrigin,value.author,value.artist,value.lang,value.stateOrigin,value.stateTL,value.series,value.universe,value.updated_at.toISOString()]);
await insert(sql`INSERT INTO medium_toc (id,medium_id, link,title,medium,country_of_origin,language_of_origin,author,artist,lang,state_origin,state_tl,series,universe,updated_at) SELECT * FROM ${sql.unnest(values, ["int8", "int8", "text","text","int4","text","text","text","text","text","int8","int8","text","text", "timestamptz"])} ON CONFLICT DO NOTHING;`);

results = await connection.query("SELECT `id`,`medium_id`,`title`,`totalIndex`,`partialIndex`,`combiIndex`,`updated_at` FROM part;");
values = results.map((value) => [value.id,value.medium_id,value.title,value.combiIndex,value.totalIndex,value.partialIndex,value.updated_at.toISOString()]);
await insert(sql`INSERT INTO part ("id","medium_id","title","combi_index","total_index","partial_index","updated_at") SELECT * FROM ${sql.unnest(values, ["int8", "int8", "text","float8","int8","int8","timestamptz"])} ON CONFLICT DO NOTHING;`);

results = await connection.query("SELECT `id`,`part_id`,`totalIndex`,`partialIndex`,`combiIndex`,`updated_at` FROM episode;");
values = results.map((value) => [value.id,value.part_id,value.combiIndex,value.totalIndex,value.partialIndex,value.updated_at.toISOString()]);
await insert(sql`INSERT INTO episode ("id","part_id","combi_index","total_index","partial_index","updated_at") SELECT * FROM ${sql.unnest(values, ["int8", "int8","float8","int8","int8","timestamptz"])} ON CONFLICT DO NOTHING;`);

results = await connection.query("SELECT `episode_id`,`title`,`url`,`source_type`,`releaseDate`,`locked`,`updated_at`,`toc_id`,`id` FROM episode_release;");
values = results.map((value) => [value.id,value.episode_id,value.url,value.title,value.source_type,value.releaseDate.toISOString(),!!value.locked,value.toc_id,value.updated_at.toISOString()]);
await insert(sql`INSERT INTO episode_release ("id","episode_id","url","title","source_type","release_date","locked","toc_id","updated_at") SELECT * FROM ${sql.unnest(values, ["int8", "int8", "text", "text", "text", "timestamptz", "bool","int8","timestamptz"])} ON CONFLICT DO NOTHING;`);

results = await connection.query("SELECT `name`,`uuid`,`local_uuid`,`service`,`cookies`,`last_scrape`,`updated_at` FROM external_user;");
values = results.map((value) => [value.name,value.uuid,value.local_uuid,value.service,value.cookies,value.last_scrape.toISOString(),value.updated_at.toISOString()]);
await insert(sql`INSERT INTO external_user ("identifier","uuid","local_uuid","type","cookies","last_scrape","updated_at") SELECT * FROM ${sql.unnest(values, ["text","text","text","int8","text","timestamptz","timestamptz"])} ON CONFLICT DO NOTHING;`);

results = await connection.query("SELECT `id`,`name`,`user_uuid`,`medium`,`url`,`updated_at` FROM external_reading_list;");
values = results.map((value) => [value.id,value.name,value.user_uuid,value.medium,value.url,value.updated_at.toISOString()]);
await insert(sql`INSERT INTO external_reading_list ("id","name","user_uuid","medium","url","updated_at") SELECT * FROM ${sql.unnest(values, ["int8","text","text","int4","text","timestamptz"])} ON CONFLICT DO NOTHING;`);

results = await connection.query("SELECT list_id,medium_id FROM external_list_medium;");
values = results.map((value) => [value.list_id,value.medium_id]);
await insert(sql`INSERT INTO external_list_medium (list_id,medium_id) SELECT * FROM ${sql.unnest(values, ["int8", "int8"])} ON CONFLICT DO NOTHING;`);

results = await connection.query("SELECT `id`,`type`,`name`,`start`,`end`,`arguments`,`result`,`message`,`context`,`scheduled_at`,`created`,`updated`,`deleted`,`queries`,`network_queries`,`network_received`,`network_send` FROM job_history ORDER BY id LIMIT 10000;");

// batch the biggest table "job_history" in 100000 steps, ordered by id
while (results.length) {
  values = results.map((value) => [value.id,value.type,value.name,value.start.toISOString(),value.end.toISOString(),value.arguments,value.result,value.message,value.context,value.scheduled_at.toISOString(),value.created,value.updated,value.deleted,value.queries,value.network_queries,value.network_received,value.network_send]);
  await insert(sql`INSERT INTO job_history ("id","type","name","start","end","arguments","result","message","context","scheduled_at","created","updated","deleted","queries","network_queries","network_received","network_send") SELECT * FROM ${sql.unnest(values, ["int8","text","text","timestamptz","timestamptz","text","text","text","text","timestamptz","int8","int8","int8","int8","int8","int8","int8"])} ON CONFLICT DO NOTHING;`);
  results = await connection.query("SELECT `id`,`type`,`name`,`start`,`end`,`arguments`,`result`,`message`,`context`,`scheduled_at`,`created`,`updated`,`deleted`,`queries`,`network_queries`,`network_received`,`network_send` FROM job_history WHERE id > ? ORDER BY id LIMIT 10000;", results[results.length - 1].id);
}

results = await connection.query("SELECT `name`,`type`,`count`,`failed`,`succeeded`,`network_requests`,`min_network_requests`,`max_network_requests`,`network_send`,`min_network_send`,`max_network_send`,`network_received`,`min_network_received`,`max_network_received`,`duration`,`min_duration`,`max_duration`,`lagging`,`min_lagging`,`max_lagging`,`updated`,`min_updated`,`max_updated`,`created`,`min_created`,`max_created`,`deleted`,`min_deleted`,`max_deleted`,`sql_queries`,`min_sql_queries`,`max_sql_queries` FROM job_stat_summary;");
values = results.map((value) => [value.name,value.type,value.count,value.failed,value.succeeded,value.network_requests,value.min_network_requests,value.max_network_requests,value.network_send,value.min_network_send,value.max_network_send,value.network_received,value.min_network_received,value.max_network_received,value.duration,value.min_duration,value.max_duration,value.lagging,value.min_lagging,value.max_lagging,value.updated,value.min_updated,value.max_updated,value.created,value.min_created,value.max_created,value.deleted,value.min_deleted,value.max_deleted,value.sql_queries,value.min_sql_queries,value.max_sql_queries]);
await insert(sql`INSERT INTO job_stat_summary ("name","type","count","failed","succeeded","network_requests","min_network_requests","max_network_requests","network_send","min_network_send","max_network_send","network_received","min_network_received","max_network_received","duration","min_duration","max_duration","lagging","min_lagging","max_lagging","updated","min_updated","max_updated","created","min_created","max_created","deleted","min_deleted","max_deleted","sql_queries","min_sql_queries","max_sql_queries") SELECT * FROM ${sql.unnest(values, ["text","text","int8","int8","int8","int8","int8","int8","int8","int8","int8","int8","int8","int8","int8","int8","int8","int8","int8","int8","int8","int8","int8","int8","int8","int8","int8","int8","int8","int8","int8","int8"])} ON CONFLICT DO NOTHING;`);

results = await connection.query("SELECT `id`,`type`,`name`,`state`,`interval`,`deleteAfterRun`,`runningSince`,`runAfter`,`lastRun`,`nextRun`,`arguments`,`job_state` FROM jobs;");
values = results.map((value) => [value.id,value.type,value.name,value.state,value.interval,value.deleteAfterRun,value.runningSince.toISOString(),value.runAfter,value.lastRun.toISOString(),value.nextRun.toISOString(),value.arguments,value.job_state === "enabled"]);
await insert(sql`INSERT INTO jobs ("id","type","name","state","interval","delete_after_run","running_since","run_after","last_run","next_run","arguments","enabled") SELECT * FROM ${sql.unnest(values, ["int8","text","text","text","int8","bool","timestamptz","int8","timestamptz","timestamptz","text","bool"])} ON CONFLICT DO NOTHING;`);

results = await connection.query("SELECT `title`,`medium`,`link`,`updated_at` FROM medium_in_wait;");
values = results.map((value) => [value.title,value.medium,value.link,value.updated_at.toISOString()]);
await insert(sql`INSERT INTO medium_in_wait ("title","medium","link","updated_at") SELECT * FROM ${sql.unnest(values, ["text","int4","text","timestamptz"])} ON CONFLICT DO NOTHING;`);

results = await connection.query("SELECT medium_id,synonym FROM medium_synonyms;");
values = results.map((value) => [value.medium_id,value.synonym]);
await insert(sql`INSERT INTO medium_synonyms (medium_id,synonym) SELECT * FROM ${sql.unnest(values, ["int8","text"])} ON CONFLICT DO NOTHING;`);

results = await connection.query("SELECT `id`,`title`,`link`,`date`,`updated_at` FROM news_board;");
values = results.map((value) => [value.id,value.title,value.link,value.date.toISOString(),value.updated_at.toISOString()]);
await insert(sql`INSERT INTO news_board ("id","title","link","date","updated_at") SELECT * FROM ${sql.unnest(values, ["int8","text","text","timestamptz","timestamptz"])} ON CONFLICT DO NOTHING;`);

results = await connection.query("SELECT news_id,medium_id FROM news_medium;");
values = results.map((value) => [value.news_id,value.medium_id]);
await insert(sql`INSERT INTO news_medium (news_id,medium_id) SELECT * FROM ${sql.unnest(values, ["int8","int8"])} ON CONFLICT DO NOTHING;`);

results = await connection.query("SELECT news_id,user_id FROM news_user;");
values = results.map((value) => [value.news_id,value.user_id]);
await insert(sql`INSERT INTO news_user (news_id,user_id) SELECT * FROM ${sql.unnest(values, ["int8","text"])} ON CONFLICT DO NOTHING;`);

results = await connection.query("SELECT `id`,`title`,`content`,`date`,`type`,`key` FROM notifications;");
values = results.map((value) => [value.id,value.title,value.content,value.date.toISOString(),value.type,value.key]);
await insert(sql`INSERT INTO notifications ("id","title","content","date","type","key") SELECT * FROM ${sql.unnest(values, ["int8","text","text","timestamptz","text","text"])} ON CONFLICT DO NOTHING;`);

results = await connection.query("SELECT id,uuid FROM notifications_read;");
values = results.map((value) => [value.id,value.uuid]);
await insert(sql`INSERT INTO notifications_read (id,uuid) SELECT * FROM ${sql.unnest(values, ["int8","text"])} ON CONFLICT DO NOTHING;`);

results = await connection.query("SELECT link, keyString, value FROM page_info;");
values = results.map((value) => [value.link,value.keyString, value.value]);
await insert(sql`INSERT INTO page_info (link,key_string,value) SELECT * FROM ${sql.unnest(values, ["text", "text","text"])} ON CONFLICT DO NOTHING;`);

results = await connection.query("SELECT `id`,`name`,`user_uuid`,`medium`,`updated_at` FROM reading_list;");
values = results.map((value) => [value.id,value.name,value.user_uuid,value.medium,value.updated_at.toISOString()]);
await insert(sql`INSERT INTO reading_list ("id","name","user_uuid","medium","updated_at") SELECT * FROM ${sql.unnest(values, ["int8","text","text","int4","timestamptz"])} ON CONFLICT DO NOTHING;`);

results = await connection.query("SELECT list_id,medium_id FROM list_medium;");
values = results.map((value) => [value.list_id,value.medium_id]);
await insert(sql`INSERT INTO list_medium (list_id,medium_id) SELECT * FROM ${sql.unnest(values, ["int8", "int8"])} ON CONFLICT DO NOTHING;`);

results = await connection.query("SELECT `id`,`name`,`state`,`message` FROM scraper_hook;");
values = results.map((value) => [value.id,value.name,value.state === "enabled",value.message]);
await insert(sql`INSERT INTO scraper_hook ("id","name","enabled","message") SELECT * FROM ${sql.unnest(values, ["int8","text","bool","text"])} ON CONFLICT DO NOTHING;`);

results = await connection.query("SELECT `user_uuid`,`episode_id`,`progress`,`read_date`,`id` FROM user_episode;");
values = results.map((value) => [value.id,value.user_uuid,value.episode_id,value.progress,value.read_date.toISOString()]);
await insert(sql`INSERT INTO user_episode ("id","user_uuid","episode_id","progress","read_date") SELECT * FROM ${sql.unnest(values, ["int8","text","int8","float8","timestamptz"])} ON CONFLICT DO NOTHING;`);

results = await connection.query("SELECT `user_uuid`,`ip`,`session_key`,`acquisition_date` FROM user_log;");
values = results.map((value) => [value.user_uuid,value.ip,value.session_key,value.acquisition_date]);
await insert(sql`INSERT INTO user_log ("user_uuid","ip","session_key","acquisition_date") SELECT * FROM ${sql.unnest(values, ["text","text","text","text"])} ON CONFLICT DO NOTHING;`);

gracefulShutdown();