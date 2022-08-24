import { Schema, Validator, ValidatorResult } from "jsonschema";
export { ValidationError, Validator, ValidatorResult } from "jsonschema";

type RequireField<T, K extends keyof T> = T & Required<Pick<T, K>>;

interface SchemaFunc {
  <T extends RequireField<Schema, "id" | "type">>(value: T): T;
  string(schema?: Omit<Schema, "type">): { type: "string" };
  integer(schema?: Omit<Schema, "type">): { type: "integer" };
  number(schema?: Omit<Schema, "type">): { type: "number" };
  boolean(schema?: Omit<Schema, "type">): { type: "boolean" };
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

schema.integer = function integer(value: Schema = {}) {
  return { ...value, type: "integer" };
};

schema.number = function number(value: Schema = {}) {
  return { ...value, type: "number" };
};

schema.boolean = function boolean(value: Schema = {}) {
  return { ...value, type: "boolean" };
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

const contextSelectorsSchema = schema({
  id: "/ContextSelectorRecord",
  type: "object",
  additionalProperties: schema.string(),
});

const newsEpisodeSchema = schema({
  id: "/NewsEpisode",
  type: "object",
  properties: {
    mediumTitle: schema.string(),
    mediumTocLink: schema.link(),
    mediumType: schema.integer(),
    episodeTitle: schema.string(),
    episodeIndex: schema.number(),
    episodeTotalIndex: schema.integer(),
    episodePartialIndex: schema.integer(),
    partIndex: schema.number(),
    partTotalIndex: schema.integer(),
    partPartialIndex: schema.integer(),
    link: schema.link(),
    // releaseDate needs a custom schema check for Date objects
    date: schema.string({ format: "date-time" }),
    locked: schema.boolean(),
  },
  required: ["mediumTitle", "mediumType", "episodeTitle", "episodeIndex", "episodeTotalIndex", "link"],
});

const tocEpisodeSchema = schema({
  id: "/TocEpisode",
  type: "object",
  properties: {
    title: schema.string(),
    combiIndex: schema.number(),
    totalIndex: schema.integer(),
    partialIndex: schema.integer(),
    url: schema.link(),
    // releaseDate needs a custom schema check for Date objects
    releaseDate: schema.string({ format: "date-time" }),
    noTime: schema.boolean(),
    locked: schema.boolean(),
    tocId: schema.integer(),
  },
  required: ["title", "combiIndex", "totalIndex", "url"],
});

const tocPartSchema = schema({
  id: "/TocPart",
  type: "object",
  properties: {
    title: schema.string(),
    combiIndex: schema.number(),
    totalIndex: schema.integer(),
    partialIndex: schema.integer(),
    episodes: {
      type: "array",
      items: tocEpisodeSchema,
    },
  },
  required: ["title", "combiIndex", "totalIndex", "episodes"],
});

const tocSchema = schema({
  id: "/Toc",
  type: "object",
  properties: {
    title: schema.string(),
    content: {
      type: "array",
      items: {
        oneOf: [tocEpisodeSchema, tocPartSchema],
      },
    },
    mediumId: schema.integer(),
    synonyms: schema.string(),
    mediumType: schema.integer(),
    partsOnly: schema.boolean(),
    end: schema.boolean(),
    link: schema.link(),
    langCOO: schema.string(),
    langTL: schema.string(),
    statusCOO: schema.integer(),
    statusTl: schema.integer(),
    authors: schema.string(),
    artists: schema.string(),
  },
  required: ["title", "content", "mediumType", "link"],
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
    _contextSelectors: contextSelectorsSchema,
    type: schema.string(),
    _$: schema.string(),
    mediumTitle: schema.string(),
    mediumTocLink: schema.string(),
    releases: {
      type: "object",
      properties: {
        _$: schema.string(),
        partTotalIndex: schema.string(),
        partPartialIndex: schema.string(),
        partIndex: schema.string(),
        episodeTotalIndex: schema.string(),
        episodePartialIndex: schema.string(),
        episodeIndex: schema.string(),
        episodeTitle: schema.string(),
        link: schema.string(),
        date: schema.string(),
      },
      required: ["_$", "episodeTotalIndex", "episodeIndex", "episodeTitle", "link", "date"],
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
    _contextSelectors: contextSelectorsSchema,
    _$: schema.string(),
    mediumTitle: schema.string(),
    mediumTocLink: schema.string(),
    partTotalIndex: schema.string(),
    partPartialIndex: schema.string(),
    partIndex: schema.string(),
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

const tocSingleSchema = schema({
  id: "/TocSingle",
  type: "object",
  properties: {
    _$: schema.string(),
    _request: requestConfigSchema,
    _contextSelectors: contextSelectorsSchema,
    title: schema.string(),
    statusTl: schema.string(),
    synonyms: schema.string(),
    link: schema.string(),
    langCOO: schema.string(),
    langTL: schema.string(),
    statusCOO: schema.string(),
    authors: schema.string(),
    artists: schema.string(),
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
    },
  },
  required: ["_$"],
});

const tocGeneratorSchema = schema({
  id: "/TocGenerator",
  type: "object",
  properties: {
    _$: schema.string(),
    _request: requestConfigSchema,
    _contextSelectors: contextSelectorsSchema,
    _generator: {
      type: "object",
      properties: {
        maxIndex: schema.string({ minLength: 1 }),
        urlRegex: jsonRegexSchema,
        urlTemplate: schema.string({ minLength: 2 }),
        titleTemplate: schema.string({ minLength: 2 }),
      },
      required: ["maxIndex", "urlRegex", "urlTemplate", "titleTemplate"],
    },
    title: schema.string(),
    statusTl: schema.string(),
    synonyms: schema.string(),
    link: schema.string(),
    langCOO: schema.string(),
    langTL: schema.string(),
    statusCOO: schema.string(),
    authors: schema.string(),
    artists: schema.string(),
  },
  required: ["_$", "_generator"],
});

const tocConfigSchema = schema({
  id: "/TocConfig",
  type: "object",
  properties: {
    regexes: jsonRegexMapSchema,
    data: {
      type: "array",
      items: {
        oneOf: [tocSingleSchema, tocGeneratorSchema],
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
          _contextSelectors: contextSelectorsSchema,
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
          _contextSelectors: contextSelectorsSchema,
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
    version: { const: 2 },
    domain: jsonRegexSchema,
    name: schema.string({ minLength: 2 }),
    news: newsConfigSchema,
    toc: tocConfigSchema,
    download: downloadConfigSchema,
    search: searchConfigSchema,
  },
  additionalProperties: false,
  required: ["base", "medium", "name", "version"],
});

export function validateHookConfig(value: any): ValidatorResult {
  const v = new Validator();
  return v.validate(value, hookConfigSchema);
}

export function validateToc<T extends boolean>(value: any, throwError: T): T extends true ? never : ValidatorResult {
  const v = new Validator();
  // @ts-expect-error
  return v.validate(value, tocSchema, { throwAll: throwError });
}

export function validateEpisodeNews<T extends boolean>(
  value: any,
  throwError: T,
): T extends true ? never : ValidatorResult {
  const v = new Validator();
  if (throwError) {
    // @ts-expect-error
    return v.validate(value, newsEpisodeSchema, {
      throwAll: true,
    });
  } else {
    // @ts-expect-error
    return v.validate(value, newsEpisodeSchema);
  }
}
