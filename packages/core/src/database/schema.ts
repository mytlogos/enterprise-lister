import { PropertyNames } from "../types";

type SqlPrimitive = StringPrimitive | NumberPrimitive | BooleanPrimitive | DatePrimitive;

interface BasicColumn<Type extends SqlPrimitive> {
  type: Type;
  nullable?: true;
  default?: string | PrimitiveType<Type>;
  check?: string;
  unique?: boolean;
  primaryKey?: boolean;
  index?: boolean;
  foreignKey?: BasicColumn<Type>;
  keyLength?: number;
  onupdate?: string;
}

interface VariableBasicColumn<Type extends SqlPrimitive> extends BasicColumn<Type> {
  keyLength: number;
}

type Column = Readonly<
  VarCharColumn | IntColumn | BoolColumn | CharColumn | TextColumn | DatetimeColumn | TimeStampColumn
>;

type VarCharColumn = VariableBasicColumn<"varchar">;
type CharColumn = VariableBasicColumn<"char">;
type TextColumn = BasicColumn<"text">;
type DatetimeColumn = BasicColumn<"datetime">;
type TimeStampColumn = BasicColumn<"timestamp">;

interface IntColumn extends BasicColumn<"int"> {
  type: "int";
  autoIncrement?: boolean;
}

interface BoolColumn extends BasicColumn<"bool"> {
  type: "bool";
}

interface Table<Props extends Record<string, Column>> {
  name: string;
  columns: Props;
  primaryKeys?: Record<PropertyNames<Props, BasicColumn<SqlPrimitive>>, number>;
  uniqueKeys?: Array<
    Record<
      PropertyNames<Props, BasicColumn<SqlPrimitive> | Array<PropertyNames<Props, BasicColumn<SqlPrimitive>>>>,
      number
    >
  >;
}

type StringPrimitive = "varchar" | "char" | "text" | "mediumtext" | "longtext";
type NumberPrimitive = "int" | "real";
type BooleanPrimitive = "bool";
type DatePrimitive = "datetime" | "timestamp";

type PrimitiveType<U extends SqlPrimitive> = U extends StringPrimitive
  ? string
  : U extends NumberPrimitive
  ? number
  : U extends BooleanPrimitive
  ? boolean
  : never;

type NullableColumn<T extends TableEntity<any>> = {
  [K in keyof T["columns"]]: T["columns"][K]["nullable"] extends true ? K : never;
}[keyof T];

type NonNullableColumn<T extends TableEntity<any>> = {
  [K in keyof T["columns"]]: T["columns"][K]["nullable"] extends false ? K : never;
}[keyof T];

/**
 * The object type for the table.
 * Nullable Columns are optional.
 */
type Entity<T extends TableEntity<any>> = {
  [U in NullableColumn<T>]?: PrimitiveType<T["columns"][U]["type"]>;
} &
  {
    [U in NonNullableColumn<T>]: PrimitiveType<T["columns"][U]["type"]>;
  };

interface TableEntity<Props extends Record<string, Column>> extends Table<Props> {
  update(entity: Entity<TableEntity<Props>>): Promise<void>;
  createTable(): Promise<void>;
}

function defineTable<Props extends Record<string, Column>>(table: Table<Props>): TableEntity<Props> {
  return table as TableEntity<Props>;
}

type ColumnType<U extends SqlPrimitive> = U extends "varchar"
  ? VarCharColumn
  : U extends "bool"
  ? BoolColumn
  : BasicColumn<U>;

function defineColumn<U extends SqlPrimitive>(type: U): ColumnType<U> {
  return {
    type,
  } as ColumnType<U>;
}

const userTable = defineTable({
  columns: {
    uuid: {
      type: "char",
      keyLength: 36,
      primaryKey: true,
    },
    name: {
      type: "varchar",
      keyLength: 200,
      unique: true,
    },
    salt: {
      type: "varchar",
      keyLength: 200,
      nullable: true,
    },
    alg: {
      type: "varchar",
      keyLength: 100,
    },
    password: {
      type: "varchar",
      keyLength: 200,
    },
  },
  name: "user",
});

const externalUserTable = defineTable({
  columns: {
    uuid: {
      type: "char",
      keyLength: 36,
      primaryKey: true,
    },
    local_uuid: {
      type: "char",
      keyLength: 36,
      foreignKey: userTable.columns.uuid,
    },
    name: {
      type: "varchar",
      keyLength: 200,
    },
    service: {
      type: "int",
    },
    cookies: {
      type: "text",
      nullable: true,
    },
    last_scrape: {
      type: "datetime",
      nullable: true,
    },
    updated_at: {
      type: "timestamp",
      default: "CURRENT_TIMESTAMP",
      nullable: true,
    },
  },
  name: "external_user",
});

externalUserTable.update({
  name: "",
  service: "",
});

const dataBaseBuilder: any = {};

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
  .parseColumn("start DATETIME NOT NULL")
  .parseColumn("end DATETIME NOT NULL")
  .parseColumn("result VARCHAR(100) NOT NULL")
  .parseColumn("message VARCHAR(200) NOT NULL")
  .parseColumn("context TEXT NOT NULL")
  .parseColumn("arguments TEXT")
  .parseMeta("PRIMARY KEY(id, start)")
  .build();

userTable.update({
  uuid: "",
  alg: "",
  name: "",
  password: "",
});

type TestTable = Entity<typeof userTable>;
