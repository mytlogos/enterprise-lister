import handlebars from "handlebars";
import fs from "fs/promises";
import {
    OpenApiObject,
    OperationObject,
    PathItemObject,
    ReferenceObject,
    MediaTypeObject,
    SchemaObject,
    enumNameSymbol,
    keyTypeSymbol
} from "./types";
import yaml from "js-yaml";
import { isString, isBoolean } from "validate.js";

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
            const schema = root.components.schemas[reference.$ref.slice("#/components/schemas/".length)]

            // for now do not recursively check reference
            if (schema && !isRefObj(schema)) {
                return schema;
            }
        }
    }
    throw Error("Unable to Resolve Reference: " + reference.$ref);
}

export async function generateWebClient(data: Readonly<OpenApiObject>): Promise<void> {
    return new JSWebClientGenerator(data).generate()
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
                Object.values(schema.properties || {}).forEach(value => this.setSchemata(schemata, value));
            }
            if (schema.type === "Enum" && schema.title) {
                // @ts-expect-error
                if (schema.enum && schema.enum[enumNameSymbol]) {
                    schemata[schema.title] = schema;
                    schema.enum.forEach(value => this.setSchemata(schemata, value));
                } else {
                    console.log(`Enum '${schema.title}' without enum values or enum names!`);
                }
            }
            schema.allOf?.forEach(value => this.setSchemata(schemata, value));
            schema.anyOf?.forEach(value => this.setSchemata(schemata, value));
            schema.oneOf?.forEach(value => this.setSchemata(schemata, value));

            if (typeof(schema.additionalProperties) === "object" && !isRefObj(schema.additionalProperties)) {
                this.setSchemata(schemata, schema.additionalProperties);
            }
            this.setSchemata(schemata, schema.items);
        }
    }

    protected toMethod(context: TemplateContext, kebubName: string, method: string, path: PathItemObject, operation: OperationObject): TemplateApiMethod {
        const parameter: TemplateApiParam[] = [];

        if (operation.parameters) {
            operation.parameters.forEach(value => {
                if (isRefObj(value)) {
                    this.resolveReference(value);
                } else if (value.in === "query") {
                    const schema = this.getSchema(value.schema) || { type: "string" };
                    parameter.push({ type: schema, name: value.name });
                    this.setSchemata(context.schemata, value.schema);
                }
            });
        }
        if (operation.requestBody && !(isRefObj(operation.requestBody))) {
            const typeObject: MediaTypeObject = operation.requestBody.content["application/json"]

            if (typeObject && typeObject.schema) {
                const schema = this.getSchema(typeObject.schema) as SchemaObject;

                if (schema.title) {
                    parameter.push({ type: schema, name: schema.title });
                    this.setSchemata(context.schemata, schema);
                } else {
                    Object.entries(schema.properties || {}).forEach(value => {
                        const [name, propRefSchema] = value;
                        const propSchema = this.getSchema(propRefSchema) as SchemaObject;

                        this.setSchemata(context.schemata, propSchema);
                        parameter.push({ type: propSchema, name });
                    })
                }
            }
        }
        let returnType = null;
        if (!isRefObj(operation.responses[200])
            && operation.responses[200]?.content
            && operation.responses[200].content["application/json"]?.schema
            && !isRefObj(operation.responses[200].content["application/json"].schema)) {

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

class JSWebClientGenerator extends TemplateGenerator {
    private keyReg = /\/+/g;
    private validKeyReg = /^[a-z_][a-zA-Z_0-9]*$/;

    public constructor(data: Readonly<OpenApiObject>) {
        super(data, "./src/server/bin/misc/openapi/webclient.ts.handlebars", "./src/server/bin/misc/openapi/webclient.ts");
        this.addHelper();
    }

    private schemaToJSType(schema?: SchemaObject): string | handlebars.SafeString {
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

            const properties = entries.map(entry => {
                const subSchema = isRefObj(entry[1]) ? this.resolveReference(entry[1]) : entry[1];
                return `${entry[0]}: ${this.schemaToJSType(subSchema)}`;
            }).join("; ");
            return new handlebars.SafeString(`{ ${properties} }`);
        } else if (schema.type === "Union") {
            return schema.oneOf ? schema.oneOf.map(v => isRefObj(v) ? v.$ref : this.schemaToJSType(v)).join(" | ") : "unknown";
        } else if (schema.type === "string" && schema.format === "date-time") {
            return "Date";
        } else if (schema.type === "Record") {
            const valueSchema = schema.additionalProperties;
            // @ts-expect-error
            const keyType: SchemaObject = valueSchema[keyTypeSymbol];
            const valueType = isRefObj(valueSchema)
                ? this.resolveReference(valueSchema)
                : isBoolean(valueSchema)
                    ? "string"
                    : this.schemaToJSType(valueSchema as SchemaObject);
            return new handlebars.SafeString(`Record<${this.schemaToJSType(keyType)}, ${valueType}>`);
        } else if (schema.type === "integer") {
            return "number";
        }
        return new handlebars.SafeString(schema.type || "unknown");
    }

    private addHelper() {
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
                    .filter(value => !autoIncluded.includes(value.name))
                    .map(value => `${value.name}: ${this.schemaToJSType(value.type)}`)
                    .join(", ")
            );
        });

        handlebars.registerHelper("toQueryParam", (param: TemplateApiParam[]) => {
            param = param.filter(value => !autoIncluded.includes(value.name));

            if (!param.length) {
                return "";
            }
            return new handlebars.SafeString(
                ", { " + 
                param
                    .map(value => value.name)
                    .join(", ") + 
                " }"
            );
        });

        handlebars.registerHelper("toProperty", (property: string, schema: SchemaObject, requiredFields?: string[]) => {
            return new handlebars.SafeString(`${property}${(requiredFields || []).includes(property) ? "" : "?"}: ${this.schemaToJSType(schema).toString()};`);
        });

        handlebars.registerHelper("toEnumMember", (value: any, index: number, enumValue: any[]) => {
            const isStr = isString(value);
            // @ts-expect-error
            const name = enumValue[enumNameSymbol] ? enumValue[enumNameSymbol][index] : index;
            return new handlebars.SafeString(`${name} = ${isStr ? "\"" : ""}${value}${isStr ? "\"" : ""},`);
        });

        handlebars.registerHelper("toReturnType", (returnType?: SchemaObject) => {
            return this.schemaToJSType(returnType);
        });
    }

    protected createContext(): TemplateContext {
        const context: TemplateContext = {
            paths: [],
            schemata: {},
        }

        for (const [key, path] of Object.entries(this.root.paths)) {
            const kebubName = key
                .split(this.keyReg)
                .filter(s => s).map(s => s.slice(0, 1).toUpperCase() + s.slice(1))
                .join("");

            const templatePath: TemplateApiPath = {
                path: key,
                methods: []
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

export function isRefObj(value: any): value is ReferenceObject {
    return typeof value === "object" && "$ref" in value;
}

export async function generateOpenApiSpec(data: OpenApiObject): Promise<void> {
    const templateResult = yaml.dump(data);
    await fs.writeFile("./result.yaml", templateResult, { encoding: "utf8" });
}