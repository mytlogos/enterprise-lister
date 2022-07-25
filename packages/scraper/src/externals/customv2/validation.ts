import { ValidationResult } from "json-schema";
import { Schema, Validator } from "jsonschema";
export { ValidationError } from "jsonschema";

type RequireField<T, K extends keyof T> = T & Required<Pick<T, K>>;

interface SchemaFunc {
  <T extends RequireField<Schema, "id" | "type">>(value: T): T;
  string(schema?: Omit<Schema, "type">): { type: "string" };
  link(schema?: Omit<Schema, "type" | "format" | "pattern">): Schema;
}

const schema = function schema<T extends RequireField<Schema, "id" | "type">>(value: T): T {
  value.$schema = "http://json-schema.org/draft-07/schema#";

  // by default forbid any additionally defined properties
  if (value.type === "object" && value.additionalProperties == null) {
    value.additionalProperties = false;
  }
  return value;
} as SchemaFunc;

schema.string = function string(value: Schema = {}) {
  return { ...value, type: "string" };
};

schema.link = function link(value: Schema = {}) {
  return {
    ...value,
    type: "string",
    format: "uri",
    pattern: "^https?://.+",
  };
};

const jsonRegexSchema = schema({
  id: "/JsonRegex",
  type: "object",
  properties: {
    pattern: schema.string({ format: "regex" }),
    flags: schema.string(),
  },
  required: ["pattern", "flags"],
});

const jsonRegexMapSchema = schema({
  id: "/JsonRegexRecord",
  type: "object",
  additionalProperties: jsonRegexSchema,
});

const requestConfigSchema = schema({
  id: "/RequestConfig",
  type: "object",
  properties: {
    regexUrl: jsonRegexSchema,
    transformUrl: schema.string(),
    templateUrl: schema.string(),
    options: {
      type: "object",
      properties: {
        headers: {
          type: "object",
          properties: {
            "Content-Type": schema.string(),
          },
          required: ["Content-Type"],
        },
        method: schema.string(),
      },
    },
    jsonResponse: {
      type: "boolean",
    },
    templateBody: schema.string(),
  },
});

const newsNestedSchema = schema({
  id: "/NewsNested",
  type: "object",
  properties: {
    _request: requestConfigSchema,
    type: schema.string(),
    _$: schema.string(),
    mediumTitle: schema.string(),
    mediumTocLink: schema.string(),
    releases: {
      type: "object",
      properties: {
        _$: schema.string(),
        episodeTotalIndex: schema.string(),
        episodePartialIndex: schema.string(),
        episodeIndex: schema.string(),
        episodeTitle: schema.string(),
        link: schema.string(),
        date: schema.string(),
      },
      required: ["_$", "episodeTotalIndex", "episodePartialIndex", "episodeIndex", "episodeTitle", "link", "date"],
    },
  },
  required: ["type", "_$", "mediumTitle", "mediumTocLink", "releases"],
});

const newsSingleSchema = schema({
  id: "/NewsSingle",
  type: "object",
  properties: {
    type: schema.string(),
    _request: requestConfigSchema,
    _$: schema.string(),
    mediumTitle: schema.string(),
    mediumTocLink: schema.string(),
    episodeTotalIndex: schema.string(),
    episodePartialIndex: schema.string(),
    episodeIndex: schema.string(),
    episodeTitle: schema.string(),
    link: schema.string(),
    date: schema.string(),
  },
  required: ["type", "_$", "mediumTitle", "mediumTocLink", "episodeTotalIndex", "episodeIndex", "episodeTitle", "link"],
});

const newsConfigSchema = schema({
  id: "/NewsConfig",
  type: "object",
  properties: {
    newsUrl: schema.link(),
    regexes: jsonRegexMapSchema,
    data: {
      type: "array",
      items: {
        oneOf: [newsNestedSchema, newsSingleSchema],
      },
    },
  },
  required: ["newsUrl", "data", "regexes"],
});
const tocConfigSchema = schema({
  id: "/TocConfig",
  type: "object",
  properties: {
    regexes: jsonRegexMapSchema,
    data: {
      type: "array",
      items: {
        type: "object",
        properties: {
          _$: schema.string(),
          _request: requestConfigSchema,
          title: schema.string(),
          statusTl: schema.string(),
          content: {
            type: "object",
            properties: {
              _$: schema.string(),
              title: schema.string(),
              url: schema.string(),
              combiIndex: schema.string(),
              totalIndex: schema.string(),
              partialIndex: schema.string(),
              releaseDate: schema.string(),
            },
            required: ["_$", "title", "url", "combiIndex", "totalIndex", "releaseDate"],
          },
        },
        required: ["_$"],
      },
    },
  },
  required: ["data", "regexes"],
});
const searchConfigSchema = schema({
  id: "/SearchConfig",
  type: "object",
  properties: {
    searchUrl: schema.link(),
    regexes: jsonRegexMapSchema,
    data: {
      type: "array",
      items: {
        type: "object",
        properties: {
          _request: requestConfigSchema,
          _$: schema.string(),
          link: schema.string(),
          title: schema.string(),
          coverUrl: schema.string(),
          author: schema.string(),
        },
        required: ["_request", "_$", "link", "title"],
      },
    },
  },
  required: ["searchUrl", "data", "regexes"],
});
const downloadConfigSchema = schema({
  id: "/DownloadConfig",
  type: "object",
  properties: {
    regexes: jsonRegexMapSchema,
    data: {
      type: "array",
      items: {
        type: "object",
        id: "/DownloadSingle",
        properties: {
          _$: schema.string(),
          _request: requestConfigSchema,
          mediumTitle: schema.string(),
          episodeTitle: schema.string(),
          index: schema.string(),
          content: schema.string(),
        },
        required: ["_$", "mediumTitle", "episodeTitle", "content"],
      },
    },
  },
  required: ["regexes", "data"],
});

const hookConfigSchema = schema({
  id: "/HookConfig",
  title: "Generated schema for HookConfig",
  type: "object",
  properties: {
    base: schema.link(),
    medium: {
      type: "integer",
      enum: [1, 2, 4, 8],
    },
    name: schema.string({ minLength: 2 }),
    news: newsConfigSchema,
    toc: tocConfigSchema,
    download: downloadConfigSchema,
    search: searchConfigSchema,
  },
  additionalProperties: false,
  required: ["base", "medium", "name"],
});

export function validateHookConfig(value: any): ValidationResult {
  const v = new Validator();
  return v.validate(value, hookConfigSchema);
}
