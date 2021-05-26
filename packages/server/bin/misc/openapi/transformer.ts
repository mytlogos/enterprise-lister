import handlebars from "handlebars";
import fs from "fs/promises";
import { findAbsoluteProjectDirPath } from "enterprise-core/dist/tools";
import { join } from "path";
import {
  OpenApiObject,
  OperationObject,
  PathItemObject,
  ReferenceObject,
  MediaTypeObject,
  SchemaObject,
  enumNameSymbol,
  keyTypeSymbol,
} from "./types";
import yaml from "js-yaml";
import { isString, isBoolean, isNumber } from "validate.js";

interface TemplateApiPath {
  path: string;
  methods: TemplateApiMethod[];
}

interface TemplateApiMethod {
  name: string;
  method: string;
  description: string;
  parameter: TemplateApiParam[];
  returnType: any;
}

interface TemplateApiParam {
  type: SchemaObject;
  name: string;
}

interface TemplateContext {
  paths: TemplateApiPath[];
  schemata: Record<string, any>;
}

export function resolveReference(root: OpenApiObject, reference: ReferenceObject): SchemaObject {
  // check if it refers to current root
  if (reference.$ref.startsWith("#")) {
    if (reference.$ref.startsWith("#/components/schemas/")) {
      if (!root.components?.schemas) {
        throw Error("Unable to Resolve Reference: " + reference.$ref + ", missing schemata");
      }
      const schema = root.components.schemas[reference.$ref.slice("#/components/schemas/".length)];

      // for now do not recursively check reference
      if (schema && !isRefObj(schema)) {
        return schema;
      }
    }
  }
  throw Error("Unable to Resolve Reference: " + reference.$ref);
}

export async function generateWebClient(data: Readonly<OpenApiObject>, target?: string): Promise<void> {
  const rootDir = findAbsoluteProjectDirPath(__dirname);
  const templateDir = join(rootDir, "src", "server", "bin", "misc", "openapi");

  if (!target) {
    target = join(templateDir, "webclient.ts");
  }
  const source = join(templateDir, "webclient.ts.handlebars");
  return new TSWebClientGenerator(data, source, target).generate();
}

export async function generateValidator(data: Readonly<OpenApiObject>): Promise<void> {
  return new TSRequestValidatorGenerator(data).generate();
}

abstract class TemplateGenerator {
  protected root: Readonly<OpenApiObject>;
  private templateSource: string;
  private templateTarget: string;

  protected constructor(data: Readonly<OpenApiObject>, templateSource: string, templateTarget: string) {
    this.root = data;
    this.templateSource = templateSource;
    this.templateTarget = templateTarget;
  }

  protected resolveReference(reference: ReferenceObject): SchemaObject {
    return resolveReference(this.root, reference);
  }

  private getSchema(value?: SchemaObject | ReferenceObject): SchemaObject | undefined {
    return value && isRefObj(value) ? this.resolveReference(value) : value;
  }

  private setSchemata(schemata: any, schema?: SchemaObject | ReferenceObject) {
    if (schema) {
      if (isRefObj(schema)) {
        schema = this.resolveReference(schema);
      }
      if (schema.type === "object" && schema.title) {
        schemata[schema.title] = schema;
        Object.values(schema.properties || {}).forEach((value) => this.setSchemata(schemata, value));
      }
      if (schema.type === "Enum" && schema.title) {
        // @ts-expect-error
        if (schema.enum && schema.enum[enumNameSymbol]) {
          schemata[schema.title] = schema;
          schema.enum.forEach((value) => this.setSchemata(schemata, value));
        } else {
          console.log(`Enum '${schema.title}' without enum values or enum names!`);
        }
      }
      schema.allOf?.forEach((value) => this.setSchemata(schemata, value));
      schema.anyOf?.forEach((value) => this.setSchemata(schemata, value));
      schema.oneOf?.forEach((value) => this.setSchemata(schemata, value));

      if (typeof schema.additionalProperties === "object" && !isRefObj(schema.additionalProperties)) {
        this.setSchemata(schemata, schema.additionalProperties);
      }
      this.setSchemata(schemata, schema.items);
    }
  }

  protected toMethod(
    context: TemplateContext,
    kebubName: string,
    method: string,
    path: PathItemObject,
    operation: OperationObject,
  ): TemplateApiMethod {
    const parameter: TemplateApiParam[] = [];

    if (operation.parameters) {
      operation.parameters.forEach((value) => {
        if (isRefObj(value)) {
          this.resolveReference(value);
        } else if (value.in === "query") {
          const schema = this.getSchema(value.schema) || { type: "string" };
          parameter.push({ type: schema, name: value.name });
          this.setSchemata(context.schemata, value.schema);
        }
      });
    }
    if (operation.requestBody && !isRefObj(operation.requestBody)) {
      const typeObject: MediaTypeObject = operation.requestBody.content["application/json"];

      if (typeObject && typeObject.schema) {
        const schema = this.getSchema(typeObject.schema) as SchemaObject;

        if (schema.title) {
          parameter.push({ type: schema, name: schema.title });
          this.setSchemata(context.schemata, schema);
        } else {
          Object.entries(schema.properties || {}).forEach((value) => {
            const [name, propRefSchema] = value;
            const propSchema = this.getSchema(propRefSchema) as SchemaObject;

            this.setSchemata(context.schemata, propSchema);
            parameter.push({ type: propSchema, name });
          });
        }
      }
    }
    let returnType = null;
    if (
      !isRefObj(operation.responses[200]) &&
      operation.responses[200]?.content &&
      operation.responses[200].content["application/json"]?.schema &&
      !isRefObj(operation.responses[200].content["application/json"].schema)
    ) {
      const schema = operation.responses[200].content["application/json"].schema;
      returnType = schema;

      this.setSchemata(context.schemata, schema);
    }
    return {
      name: method + kebubName,
      method,
      description: (path.description || "") + "\n" + (operation.description || ""),
      parameter,
      returnType,
    };
  }

  protected abstract createContext(): TemplateContext;

  public async generate(): Promise<void> {
    const context = this.createContext();
    const content = await fs.readFile(this.templateSource, { encoding: "utf-8" });
    const template = handlebars.compile(content);
    const output = template(context);
    await fs.writeFile(this.templateTarget, output, { encoding: "utf-8" });
  }
}

function camelCase(s: string): string {
  return s.slice(0, 1).toUpperCase() + s.slice(1);
}

class TSTemplateGenerator extends TemplateGenerator {
  private keyReg = /\/+/g;
  private validKeyReg = /^[a-z_][a-zA-Z_0-9]*$/;

  public constructor(data: Readonly<OpenApiObject>, source: string, target: string) {
    super(data, source, target);
    this.addHelper();
  }

  protected schemaToJSType(schema?: SchemaObject): string | handlebars.SafeString {
    if (!schema) {
      return "unknown";
    } else if (schema.type === "Array") {
      let items = schema.items;

      if (isRefObj(items)) {
        items = this.resolveReference(items);
      }
      const genericType = this.schemaToJSType(items);

      if (genericType.toString().match(/^\w+$/)) {
        return new handlebars.SafeString(`${genericType}[]`);
      }
      return new handlebars.SafeString(`Array<${genericType}>`);
    } else if (schema.type === "Enum") {
      return schema.title || "unknown";
    } else if (schema.type === "object") {
      if (schema.title) {
        return schema.title;
      }

      const entries = Object.entries(schema.properties || {});

      if (!entries.length) {
        return "unknown";
      }

      const properties = entries
        .map((entry) => {
          const subSchema = isRefObj(entry[1]) ? this.resolveReference(entry[1]) : entry[1];
          return `${entry[0]}: ${this.schemaToJSType(subSchema)}`;
        })
        .join("; ");
      return new handlebars.SafeString(`{ ${properties} }`);
    } else if (schema.type === "Union") {
      return schema.oneOf
        ? schema.oneOf.map((v) => (isRefObj(v) ? v.$ref : this.schemaToJSType(v))).join(" | ")
        : "unknown";
    } else if (schema.type === "string" && schema.format === "date-time") {
      return "Date";
    } else if (schema.type === "Record") {
      const valueSchema = schema.additionalProperties;
      // @ts-expect-error
      const keyType: SchemaObject = valueSchema[keyTypeSymbol];
      let valueType;

      if (isRefObj(valueSchema)) {
        valueType = this.resolveReference(valueSchema);
      } else if (isBoolean(valueSchema)) {
        valueType = "string";
      } else {
        valueType = this.schemaToJSType(valueSchema as SchemaObject);
      }

      return new handlebars.SafeString(`Record<${this.schemaToJSType(keyType)}, ${valueType}>`);
    } else if (schema.type === "integer") {
      return "number";
    }
    return new handlebars.SafeString(schema.type || "unknown");
  }

  private addHelper() {
    handlebars.registerHelper("camelCase", camelCase);

    handlebars.registerHelper("is", (value: any, other: any) => {
      return value === other;
    });

    handlebars.registerHelper("isType", (value: SchemaObject, type: string) => {
      return value.type === type;
    });

    handlebars.registerHelper("toKey", (key: string) => {
      return key.replace(this.keyReg, "_").slice(1);
    });

    handlebars.registerHelper("objectAccess", (key: string) => {
      key = key.replace(this.keyReg, "_").slice(1);
      return new handlebars.SafeString(this.validKeyReg.test(key) ? "." + key : `["${key}"]`);
    });
    // these variables are automatically included if necessary in the queryServer method
    const autoIncluded = ["session", "uuid"];

    handlebars.registerHelper("toParameter", (param: TemplateApiParam[]) => {
      return new handlebars.SafeString(
        param
          .filter((value) => !autoIncluded.includes(value.name))
          .map((value) => `${value.name}: ${this.schemaToJSType(value.type)}`)
          .join(", "),
      );
    });

    handlebars.registerHelper("toQueryParam", (param: TemplateApiParam[]) => {
      param = param.filter((value) => !autoIncluded.includes(value.name));

      if (!param.length) {
        return "";
      }
      return new handlebars.SafeString(", { " + param.map((value) => value.name).join(", ") + " }");
    });

    handlebars.registerHelper("toProperty", (property: string, schema: SchemaObject, requiredFields?: string[]) => {
      return new handlebars.SafeString(
        `${property}${(requiredFields || []).includes(property) ? "" : "?"}: ${this.schemaToJSType(
          schema,
        ).toString()};`,
      );
    });

    handlebars.registerHelper("toEnumMember", (value: any, index: number, enumValue: any[]) => {
      const isStr = isString(value);
      // @ts-expect-error
      const name = enumValue[enumNameSymbol] ? enumValue[enumNameSymbol][index] : index;
      return new handlebars.SafeString(`${name} = ${isStr ? '"' : ""}${value}${isStr ? '"' : ""},`);
    });

    handlebars.registerHelper("toType", (type?: SchemaObject) => {
      return this.schemaToJSType(type);
    });
  }

  protected createContext(): TemplateContext {
    const context: TemplateContext = {
      paths: [],
      schemata: {},
    };

    for (const [key, path] of Object.entries(this.root.paths)) {
      const kebubName = key
        .split(this.keyReg)
        .filter((s) => s)
        .map(camelCase)
        .join("");

      const templatePath: TemplateApiPath = {
        path: key,
        methods: [],
      };

      if (path.delete) {
        templatePath.methods.push(this.toMethod(context, kebubName, "delete", path, path.delete));
      }
      if (path.get) {
        templatePath.methods.push(this.toMethod(context, kebubName, "get", path, path.get));
      }
      if (path.post) {
        templatePath.methods.push(this.toMethod(context, kebubName, "post", path, path.post));
      }
      if (path.put) {
        templatePath.methods.push(this.toMethod(context, kebubName, "put", path, path.put));
      }
      context.paths.push(templatePath);
    }
    return context;
  }
}

class TSWebClientGenerator extends TSTemplateGenerator {
  public constructor(data: Readonly<OpenApiObject>, source: string, target: string) {
    super(data, source, target);
  }
}

class TSRequestValidatorGenerator extends TSTemplateGenerator {
  public constructor(data: Readonly<OpenApiObject>) {
    super(
      data,
      "./packages/server/bin/misc/openapi/validateMiddleware.ts.handlebars",
      "./packages/server/bin/misc/openapi/validateMiddleware.ts",
    );
    this.addHandler();
  }

  /**
   * Inspect schema if it should have an own validator method and return
   * @param schema schema to inspect
   */
  private gatherSchemataNames(schema?: SchemaObject | ReferenceObject): string[] {
    const result: string[] = [];

    if (schema) {
      if (isRefObj(schema)) {
        schema = this.resolveReference(schema);
      }
      if (schema.type === "object" && schema.title) {
        result.push(schema.title);
        result.push(...Object.values(schema.properties || {}).flatMap((value) => this.gatherSchemataNames(value)));
      }
      if (schema.type === "Enum" && schema.title) {
        result.push(schema.title);
        // @ts-expect-error
        if (schema.enum && schema.enum[enumNameSymbol]) {
          result.push(...schema.enum.flatMap((value) => this.gatherSchemataNames(value)));
        } else {
          console.log(`Enum '${schema.title}' without enum values or enum names!`);
        }
      }
      schema.allOf?.map((value) => this.gatherSchemataNames(value)).forEach((v) => result.push(...v));
      schema.anyOf?.map((value) => this.gatherSchemataNames(value)).forEach((v) => result.push(...v));
      schema.oneOf?.map((value) => this.gatherSchemataNames(value)).forEach((v) => result.push(...v));

      if (typeof schema.additionalProperties === "object" && !isRefObj(schema.additionalProperties)) {
        result.push(...this.gatherSchemataNames(schema.additionalProperties));
      }
      result.push(...this.gatherSchemataNames(schema.items));
    }
    return result;
  }

  private addHandler() {
    handlebars.registerHelper("paramToReturnType", (apiParams: TemplateApiParam[]) => {
      return new handlebars.SafeString(
        `{ ${apiParams.map((value) => `${value.name}: ${this.schemaToJSType(value.type)}`).join("; ")} }`,
      );
    });
    handlebars.registerHelper("toConvertName", (schema: SchemaObject) => {
      if (schema.type === "object" && !schema.title) {
        return "toObject";
      }
      if (schema.type === "Array") {
        return "toArray";
      }
      return `to${camelCase(this.schemaToJSType(schema).toString())}`;
    });
    handlebars.registerHelper("toTSValue", (value) => {
      if (isString(value)) {
        return new handlebars.SafeString(`"${value}"`);
      } else if (isBoolean(value)) {
        return `${value}`;
      } else if (isNumber(value)) {
        return `${value}`;
      } else if (value === null) {
        return "null";
      } else if (value === undefined) {
        return "undefined";
      }
      throw Error(`Unknown TSValue: '${value}'`);
    });
    handlebars.registerHelper("findEnumMember", (value: any, enumValues: any[]) => {
      const index = enumValues.indexOf(value);

      if (index < 0) {
        throw Error(`Unknown EnumValue: '${value}'`);
      }
      // @ts-expect-error
      return enumValues[enumNameSymbol] ? enumValues[enumNameSymbol][index] : index;
    });
    handlebars.registerHelper("concat", (value: any, other: any) => {
      if (value != null && other != null) {
        return value + other;
      } else if (value != null) {
        return value;
      } else if (other != null) {
        return other;
      } else {
        return "";
      }
    });
    handlebars.registerHelper("add", (value: any, other: any) => {
      if (value != null && other != null) {
        return value + other;
      } else if (value != null) {
        return value;
      } else if (other != null) {
        return other;
      } else {
        return 0;
      }
    });
    handlebars.registerHelper("hasSingleProp", (value) => Object.keys(value).length === 1);
    handlebars.registerHelper("and", (value, other) => value && other);
    handlebars.registerHelper("not", (value) => !value);
    handlebars.registerHelper("toRecordKeyConverter", (schema: SchemaObject) => {
      const valueSchema = schema.additionalProperties;
      // @ts-expect-error
      const keyType: SchemaObject = valueSchema[keyTypeSymbol];
      return `to${camelCase(this.schemaToJSType(keyType).toString())}`;
    });
    handlebars.registerHelper("filterByParam", (schemata: Record<string, SchemaObject>, paths: TemplateApiPath[]) => {
      const names = new Set(
        paths.flatMap((path) =>
          path.methods.flatMap((method) => method.parameter.flatMap((param) => this.gatherSchemataNames(param.type))),
        ),
      );
      const newSchemata: Record<string, SchemaObject> = {};

      for (const key of Object.keys(schemata)) {
        if (names.has(key)) {
          newSchemata[key] = schemata[key];
        }
      }
      return newSchemata;
    });
    // expects a context of { variable: string; type: SchemaObject; depth: number }
    handlebars.registerPartial(
      "toRecord",
      `
for (const [key{{#if depth}}{{depth}}{{/if}}, keyValue{{#if depth}}{{depth}}{{/if}}] of Object.entries({{variable}} as {{toType type}})) {
    const newKey{{#if depth}}{{depth}}{{/if}} = {{toRecordKeyConverter type}}(key{{#if depth}}{{depth}}{{/if}});

    if (newKey{{#if depth}}{{depth}}{{/if}} == null) {
        return null;
    }
{{#if (isType type.additionalProperties "Array")}}
    let newValue{{#if depth}}{{depth}}{{/if}} = {{toConvertName type.additionalProperties}}(keyValue{{#if depth}}{{depth}}{{/if}});

    if (newValue{{#if depth}}{{depth}}{{/if}} == null) {
        return null;
    }
    newValue{{#if depth}}{{depth}}{{/if}} = newValue{{#if depth}}{{depth}}{{/if}}.map({{toConvertName type.additionalProperties.items}});

    if (newValue{{#if depth}}{{depth}}{{/if}}.some((v: any | null) => v == null)) {
        return null;
    }
    {{variable}}[newKey{{#if depth}}{{depth}}{{/if}}] = newValue{{#if depth}}{{depth}}{{/if}};
{{else if (isType type.additionalProperties "Record")}}
    {{> toRecord variable=(concat "keyValue" depth) type=type.additionalProperties depth=(add depth 1)}}
{{else if (and (isType type.additionalProperties "object") (not type.additionalProperties.title))}}
    {{> toObject type=type.additionalProperties variable=(concat "keyValue" depth)}}
{{else}}
    const newValue{{#if depth}}{{depth}}{{/if}} = {{toConvertName type.additionalProperties}}(keyValue{{#if depth}}{{depth}}{{/if}});

    if (newValue{{#if depth}}{{depth}}{{/if}} == null) {
        return null;
    }
    {{variable}}[newKey{{#if depth}}{{depth}}{{/if}}] = newValue{{#if depth}}{{depth}}{{/if}};
{{/if}}
}
`,
    );
    // expects a context of SchemaObject
    handlebars.registerPartial(
      "toObject",
      `
if (typeof {{variable}} !== "object") {
    return null;
}
const keys = Object.keys({{variable}});
let index;
{{#if type.properties}}
{{#each type.properties}}
{{#if (is type "Union")}}
{{#each oneOf}}
if ({{../../variable}}.{{@../key}} == null) {
    index = keys.indexOf("{{@../key}}");
    if (index < 0) {
        return null;
    }
    keys.splice(index, 1);
    {{../../variable}}.{{@../key}} = {{toConvertName .}}({{../../variable}}.{{@../key}});
{{#if (is type "Array")}}
    if ({{../../variable}}.{{@../key}}) {
        {{../../variable}}.{{@../key}} = {{../../variable}}.{{@../key}}.map({{toConvertName items}});

        if ({{../../variable}}.some((v: any | null) => v == null)) {
            return null;
        }
    }
{{/if}}
}
{{/each}}
if ({{../variable}}.{{@key}} == null) {
    return null;
}
{{else if (is type "Record")}}
{{> toRecord variable=(concat ../variable (concat "." @key)) type=this}}
{{else}}
index = keys.indexOf("{{@key}}");
if (index < 0) {
    return null;
}
keys.splice(index, 1);

{{../variable}}.{{@key}} = {{toConvertName .}}({{../variable}}.{{@key}});
{{#if (is type "Array")}}
{{../variable}}.{{@key}} = {{../variable}}.{{@key}}.map({{toConvertName items}});

if ({{../variable}}.some((v: any | null) => v == null)) {
    return null;
}
{{else}}
if ({{../variable}}.{{@key}} == null) {
    return null;
}
{{/if}}
{{/if}}
{{/each}}
{{else if (is type.type "Record")}}
{{> toRecord variable=variable type=type}}
{{/if}}
if (keys.length) {
    return null;
}
`,
    );
  }
}

export function isRefObj(value: any): value is ReferenceObject {
  return typeof value === "object" && "$ref" in value;
}

export async function generateOpenApiSpec(data: OpenApiObject): Promise<void> {
  const templateResult = yaml.dump(data);
  await fs.writeFile("./result.yaml", templateResult, { encoding: "utf8" });
}
