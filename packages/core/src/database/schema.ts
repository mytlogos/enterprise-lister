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
} & {
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

userTable.update({
  uuid: "",
  alg: "",
  name: "",
  password: "",
});
