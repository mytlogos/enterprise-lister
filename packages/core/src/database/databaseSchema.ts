import { sql } from "slonik";
import { DataBaseBuilder } from "./databaseBuilder";
import { Migrations } from "./migrations";

const dataBaseBuilder = new DataBaseBuilder(1);

dataBaseBuilder.setAutoUpdatedAt(true);
dataBaseBuilder.addProcedure(sql`
CREATE OR REPLACE FUNCTION trigger_set_update_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`);

dataBaseBuilder
  .addTable(
    sql`
CREATE TABLE IF NOT EXISTS app_events (
	id bigserial NOT NULL,
	"program" varchar(200) NOT NULL,
	"date" timestamptz NOT NULL,
	"type" varchar(200) NOT NULL,
	PRIMARY KEY (id)
);
`,
  )
  .addTable(
    sql`
CREATE TABLE IF NOT EXISTS custom_hook (
	id bigserial NOT NULL,
	"name" varchar(200) NOT NULL,
	state jsonb NOT NULL,
	enabled bool NOT NULL,
	"comment" text NOT NULL,
	updated_at timestamptz NOT NULL DEFAULT NOW(),
	PRIMARY KEY (id),
	UNIQUE("name")
);
`,
  )
  .addTable(
    sql`
CREATE TABLE IF NOT EXISTS enterprise_database_info (
	"version" int8 NOT NULL,
	migrating bool NOT NULL DEFAULT false
);
`,
  )
  .addTable(
    sql`
CREATE TABLE IF NOT EXISTS "user" (
	"name" varchar(200) NOT NULL,
	uuid bpchar(36) NOT NULL,
	salt varchar(200) NULL DEFAULT NULL::character varying,
	"password" varchar(200) NOT NULL,
	alg varchar(100) NOT NULL,
	PRIMARY KEY (uuid),
	UNIQUE(name)
);
`,
  )
  .addTable(
    sql`
CREATE TABLE IF NOT EXISTS medium (
	id bigserial NOT NULL,
	title varchar(200) NOT NULL,
	medium int4 NOT NULL,
	country_of_origin varchar(200) NULL DEFAULT NULL::character varying,
	language_of_origin varchar(200) NULL DEFAULT NULL::character varying,
	author varchar(200) NULL DEFAULT NULL::character varying,
	artist varchar(200) NULL DEFAULT NULL::character varying,
	lang varchar(200) NULL DEFAULT NULL::character varying,
	state_origin int8 NULL,
	state_tl int8 NULL,
	series varchar(200) NULL DEFAULT NULL::character varying,
	universe varchar(200) NULL DEFAULT NULL::character varying,
	updated_at timestamptz NOT NULL DEFAULT NOW(),
	PRIMARY KEY (id),
	UNIQUE(title, medium)
);
`,
  )
  .addTable(
    sql`
CREATE TABLE IF NOT EXISTS medium_toc (
	id bigserial NOT NULL,
	medium_id int8 NOT NULL,
	link varchar(767) NOT NULL,
	title varchar(200) NOT NULL,
	medium int8 NOT NULL,
	country_of_origin varchar(200) NULL DEFAULT NULL::character varying,
	language_of_origin varchar(200) NULL DEFAULT NULL::character varying,
	author varchar(200) NULL DEFAULT NULL::character varying,
	artist varchar(200) NULL DEFAULT NULL::character varying,
	lang varchar(200) NULL DEFAULT NULL::character varying,
	state_origin int8 NULL,
	state_tl int8 NULL,
	series varchar(200) NULL DEFAULT NULL::character varying,
	universe varchar(200) NULL DEFAULT NULL::character varying,
	updated_at timestamptz NOT NULL DEFAULT NOW(),
	PRIMARY KEY (id),
	UNIQUE(link, medium_id)
);
`,
    { indices: [["medium_id"]] },
  )
  .addTable(
    sql`
CREATE TABLE IF NOT EXISTS part (
	id bigserial NOT NULL,
	medium_id int8 NOT NULL,
	title varchar(200) NULL DEFAULT NULL::character varying,
	combi_index float8 NOT NULL,
	total_index int8 NOT NULL,
	partial_index int8 NULL,
	updated_at timestamptz NOT NULL DEFAULT NOW(),
	PRIMARY KEY (id),
	FOREIGN KEY (medium_id) REFERENCES medium(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
	UNIQUE(medium_id, combi_index)
);
`,
  )
  .addTable(
    sql`
CREATE TABLE IF NOT EXISTS episode (
	id bigserial NOT NULL,
	part_id int8 NOT NULL,
	total_index int8 NOT NULL,
	partial_index int8 NULL,
	combi_index float8 NOT NULL,
	updated_at timestamptz NOT NULL DEFAULT NOW(),
	PRIMARY KEY (id),
	FOREIGN KEY (part_id) REFERENCES part(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
	UNIQUE(part_id, combi_index)
);
`,
  )
  .addTable(
    sql`
CREATE TABLE IF NOT EXISTS episode_release (
	id bigserial NOT NULL,
	episode_id int8 NOT NULL,
	url varchar(767) NOT NULL,
	title text NOT NULL,
	source_type varchar(200) NULL DEFAULT NULL::character varying,
	release_date timestamptz NULL,
	"locked" bool NOT NULL DEFAULT false,
	toc_id int8 NULL,
	updated_at timestamptz NOT NULL DEFAULT NOW(),
	PRIMARY KEY (id),
	FOREIGN KEY (episode_id) REFERENCES episode(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
	FOREIGN KEY (toc_id) REFERENCES medium_toc(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
	UNIQUE(episode_id, url)
);
`,
  )
  .addTable(
    sql`
CREATE TABLE IF NOT EXISTS external_user (
	identifier varchar(200) NOT NULL,
	uuid bpchar(36) NOT NULL,
	local_uuid bpchar(36) NOT NULL,
	"type" int8 NOT NULL,
	cookies text NULL,
	last_scrape timestamptz NULL,
	updated_at timestamptz NOT NULL DEFAULT NOW(),
	PRIMARY KEY (uuid),
	FOREIGN KEY (local_uuid) REFERENCES "user"(uuid) ON DELETE RESTRICT ON UPDATE RESTRICT
);
`,
    { indices: [["local_uuid"]] },
  )
  .addTable(
    sql`
CREATE TABLE IF NOT EXISTS external_reading_list (
	id bigserial NOT NULL,
	"name" varchar(200) NOT NULL,
	user_uuid bpchar(36) NOT NULL,
	medium int8 NOT NULL,
	url varchar(200) NOT NULL,
	updated_at timestamptz NOT NULL DEFAULT NOW(),
	PRIMARY KEY (id),
	FOREIGN KEY (user_uuid) REFERENCES external_user(uuid) ON DELETE RESTRICT ON UPDATE RESTRICT
);
`,
    { indices: [["user_uuid"]] },
  )
  .addTable(
    sql`
CREATE TABLE IF NOT EXISTS external_list_medium (
	list_id int8 NOT NULL,
	medium_id int8 NOT NULL,
	PRIMARY KEY (list_id, medium_id),
	FOREIGN KEY (list_id) REFERENCES external_reading_list(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
	FOREIGN KEY (medium_id) REFERENCES medium(id) ON DELETE RESTRICT ON UPDATE RESTRICT
);
`,
    { indices: [["medium_id"], ["list_id"]] },
  )
  .addTable(
    sql`
CREATE TABLE IF NOT EXISTS job_history (
	id int8 NOT NULL,
	"type" varchar(200) NOT NULL,
	"name" varchar(200) NOT NULL,
	"start" timestamptz NOT NULL,
	"end" timestamptz NOT NULL,
	arguments text NULL,
	"result" varchar(100) NOT NULL,
	message text NOT NULL,
	context text NOT NULL,
	scheduled_at timestamptz NOT NULL,
	created int8 NOT NULL DEFAULT '0'::bigint,
	updated int8 NOT NULL DEFAULT '0'::bigint,
	deleted int8 NOT NULL DEFAULT '0'::bigint,
	queries int8 NOT NULL DEFAULT '0'::bigint,
	network_queries int8 NOT NULL DEFAULT '0'::bigint,
	network_received int8 NOT NULL DEFAULT '0'::bigint,
	network_send int8 NOT NULL DEFAULT '0'::bigint,
	lagging int8 GENERATED ALWAYS AS (extract(epoch from "start" - "scheduled_at")) STORED,
	duration int8 GENERATED ALWAYS AS (extract(epoch from "end" - "start")) STORED,
	PRIMARY KEY (id, start)
);
`,
    { indices: [["end"], ["name"], ["result"], ["start"]] },
  )
  .addTable(
    sql`
CREATE TABLE IF NOT EXISTS job_stat_summary (
	"name" varchar(200) NOT NULL,
	"type" varchar(200) NOT NULL,
	count int8 NOT NULL,
	failed int8 NOT NULL,
	succeeded int8 NOT NULL,
	network_requests int8 NOT NULL,
	min_network_requests int8 NOT NULL,
	max_network_requests int8 NOT NULL,
	network_send int8 NOT NULL,
	min_network_send int8 NOT NULL,
	max_network_send int8 NOT NULL,
	network_received int8 NOT NULL,
	min_network_received int8 NOT NULL,
	max_network_received int8 NOT NULL,
	duration int8 NOT NULL,
	min_duration int8 NOT NULL,
	max_duration int8 NOT NULL,
	lagging int8 NOT NULL,
	min_lagging int8 NOT NULL,
	max_lagging int8 NOT NULL,
	updated int8 NOT NULL,
	min_updated int8 NOT NULL,
	max_updated int8 NOT NULL,
	created int8 NOT NULL,
	min_created int8 NOT NULL,
	max_created int8 NOT NULL,
	deleted int8 NOT NULL,
	min_deleted int8 NOT NULL,
	max_deleted int8 NOT NULL,
	sql_queries int8 NOT NULL,
	min_sql_queries int8 NOT NULL,
	max_sql_queries int8 NOT NULL,
	PRIMARY KEY (name)
);
`,
  )
  .addTable(
    sql`
CREATE TABLE IF NOT EXISTS jobs (
	id bigserial NOT NULL,
	"type" varchar(200) NOT NULL,
	"name" varchar(200) NOT NULL,
	state varchar(200) NOT NULL,
	"interval" int8 NOT NULL,
	delete_after_run bool NOT NULL,
	running_since timestamptz NULL,
	run_after int8 NULL,
	last_run timestamptz NULL,
	next_run timestamptz NULL,
	arguments text NULL,
	enabled bool NOT NULL,
	PRIMARY KEY (id),
	UNIQUE(name)
);
`,
  )
  .addTable(
    sql`
CREATE TABLE IF NOT EXISTS medium_in_wait (
	title varchar(180) NOT NULL,
	medium int4 NOT NULL,
	link varchar(767) NOT NULL,
	updated_at timestamptz NOT NULL DEFAULT NOW(),
	PRIMARY KEY (title, medium, link)
);
`,
  )
  .addTable(
    sql`
CREATE TABLE IF NOT EXISTS medium_synonyms (
	medium_id int8 NOT NULL,
	synonym varchar(200) NOT NULL,
	PRIMARY KEY (medium_id, synonym),
	FOREIGN KEY (medium_id) REFERENCES medium(id) ON DELETE RESTRICT ON UPDATE RESTRICT
);
`,
  )
  .addTable(
    sql`
CREATE TABLE IF NOT EXISTS news_board (
	id bigserial NOT NULL,
	title text NOT NULL,
	link varchar(700) NOT NULL,
	"date" timestamptz NULL,
	updated_at timestamptz NOT NULL DEFAULT NOW(),
	PRIMARY KEY (id),
	UNIQUE(link)
);
`,
  )
  .addTable(
    sql`
CREATE TABLE IF NOT EXISTS news_medium (
	news_id int8 NOT NULL,
	medium_id int8 NOT NULL,
	PRIMARY KEY (news_id, medium_id),
	FOREIGN KEY (medium_id) REFERENCES medium(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
	FOREIGN KEY (news_id) REFERENCES news_board(id) ON DELETE RESTRICT ON UPDATE RESTRICT
);
`,
    { indices: [["medium_id"]] },
  )
  .addTable(
    sql`
CREATE TABLE IF NOT EXISTS news_user (
	news_id int8 NOT NULL,
	user_id bpchar(36) NOT NULL,
	PRIMARY KEY (news_id, user_id),
	FOREIGN KEY (user_id) REFERENCES "user"(uuid) ON DELETE RESTRICT ON UPDATE RESTRICT,
	FOREIGN KEY (news_id) REFERENCES news_board(id) ON DELETE RESTRICT ON UPDATE RESTRICT
);
`,
    { indices: [["user_id"]] },
  )
  .addTable(
    sql`
CREATE TABLE IF NOT EXISTS notifications (
	id bigserial NOT NULL,
	title varchar(200) NOT NULL,
	"content" varchar(500) NOT NULL,
	"date" timestamptz NOT NULL,
	"type" varchar(200) NOT NULL,
	"key" varchar(200) NOT NULL,
	PRIMARY KEY (id)
);
`,
  )
  .addTable(
    sql`
CREATE TABLE IF NOT EXISTS notifications_read (
	id int8 NOT NULL,
	uuid bpchar(36) NOT NULL,
	PRIMARY KEY (id, uuid),
	FOREIGN KEY (id) REFERENCES notifications(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
	FOREIGN KEY (uuid) REFERENCES "user"(uuid) ON DELETE RESTRICT ON UPDATE RESTRICT
);
`,
    { indices: [["uuid"]] },
  )
  .addTable(
    sql`
CREATE TABLE IF NOT EXISTS page_info (
	link varchar(767) NOT NULL,
	key_string varchar(200) NOT NULL,
	value text NOT NULL
);
`,
  )
  .addTable(
    sql`
CREATE TABLE IF NOT EXISTS part (
	id bigserial NOT NULL,
	medium_id int8 NOT NULL,
	title varchar(200) NULL DEFAULT NULL::character varying,
	combi_index float8 NOT NULL,
	total_index int8 NOT NULL,
	partial_index int8 NULL,
	updated_at timestamptz NOT NULL DEFAULT NOW(),
	PRIMARY KEY (id),
	FOREIGN KEY (medium_id) REFERENCES medium(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
	UNIQUE(medium_id, combi_index)
);
`,
  )
  .addTable(
    sql`
CREATE TABLE IF NOT EXISTS reading_list (
	id bigserial NOT NULL,
	"name" varchar(200) NOT NULL,
	user_uuid bpchar(36) NULL DEFAULT NULL::bpchar,
	medium int8 NOT NULL,
	updated_at timestamptz NOT NULL DEFAULT NOW(),
	PRIMARY KEY (id),
	FOREIGN KEY (user_uuid) REFERENCES "user"(uuid) ON DELETE RESTRICT ON UPDATE RESTRICT
);
`,
    { indices: [["user_uuid"]] },
  )
  .addTable(
    sql`
CREATE TABLE IF NOT EXISTS list_medium (
	list_id int8 NOT NULL,
	medium_id int8 NOT NULL,
	PRIMARY KEY (list_id, medium_id),
	FOREIGN KEY (list_id) REFERENCES reading_list(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
	FOREIGN KEY (medium_id) REFERENCES medium(id) ON DELETE RESTRICT ON UPDATE RESTRICT
);
`,
    { indices: [["medium_id"]] },
  )
  .addTable(
    sql`
CREATE TABLE IF NOT EXISTS scraper_hook (
	id bigserial NOT NULL,
	"name" varchar(200) NOT NULL,
	state varchar(200) NOT NULL,
	message varchar(200) NOT NULL,
	PRIMARY KEY (id),
	UNIQUE(name)
);
`,
  )
  .addTable(
    sql`
CREATE TABLE IF NOT EXISTS user_episode (
	id bigserial NOT NULL,
	user_uuid bpchar(36) NOT NULL,
	episode_id int8 NOT NULL,
	progress float8 NOT NULL,
	read_date timestamptz NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY (user_uuid) REFERENCES "user"(uuid) ON DELETE RESTRICT ON UPDATE RESTRICT,
	FOREIGN KEY (episode_id) REFERENCES episode(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
	UNIQUE(episode_id, user_uuid)
);
`,
    {
      indices: [
        ["episode_id"],
        ["episode_id", "user_uuid", "progress"],
        ["episode_id", "progress"],
        ["progress"],
        ["user_uuid", "progress"],
      ],
    },
  )
  .addTable(
    sql`
CREATE TABLE IF NOT EXISTS user_log (
	user_uuid bpchar(36) NULL DEFAULT NULL::bpchar,
	ip varchar(255) NULL DEFAULT NULL::character varying,
	session_key varchar(255) NOT NULL,
	acquisition_date varchar(40) NULL DEFAULT NULL::character varying,
	PRIMARY KEY (session_key),
	FOREIGN KEY (user_uuid) REFERENCES "user"(uuid) ON DELETE RESTRICT ON UPDATE RESTRICT
);
`,
    { indices: [["user_uuid"]] },
  );

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
    .parseMeta("FOREIGN KEY(uuid) REFERENCES user(uuid)"); */

export const databaseSchema = dataBaseBuilder.build();
