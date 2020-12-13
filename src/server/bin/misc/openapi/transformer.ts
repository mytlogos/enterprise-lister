import handlebars from "handlebars";
import fs from "fs/promises";
import { 
    OpenApiObject,
    OperationObject,
    PathItemObject,
    ReferenceObject,
    MediaTypeObject,
    SchemaObject
} from "./types";
import yaml from "js-yaml";

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

export async function generateWebClient(data: OpenApiObject): Promise<void> {
    const keyReg = /\/+/g;
    const validKeyReg = /^[a-z_][a-zA-Z_0-9]*$/;

    function schemaToJSType(schema?: SchemaObject): string | handlebars.SafeString {
        if (!schema) {
            return "unknown";
        } else if (schema.type === "Array") {
            if (schema.items && "$ref" in schema.items) {
                return "unknown[]";
            }
            const genericType = schemaToJSType(schema.items);

            if (genericType.toString().match(/^\w+$/)) {
                return new handlebars.SafeString(`${genericType}[]`);
            }
            return new handlebars.SafeString(`Array<${genericType}>`);
        } else if (schema.type === "object") {
            return schema.title || "any";
        } else if (schema.type === "Union") {
            return schema.anyOf ? schema.anyOf.map(v => isRefObj(v) ? v.$ref : schemaToJSType(v)).join(" | ") : "unknown";
        }
        return new handlebars.SafeString(schema.type || "unknown");
    }

    handlebars.registerHelper("toKey", (key: string) => {
        return key.replace(keyReg, "_").slice(1);
    });

    handlebars.registerHelper("objectAccess", (key: string) => {
        key = key.replace(keyReg, "_").slice(1);
        return new handlebars.SafeString(validKeyReg.test(key) ? "." + key : `["${key}"]`);
    });

    handlebars.registerHelper("toParameter", (param: TemplateApiParam[]) => {
        return new handlebars.SafeString(param.map(value => `${value.name}: ${schemaToJSType(value.type)}`).join(", "));
    });

    handlebars.registerHelper("toQueryParam", (param: TemplateApiParam[]) => {
        if (!param.length) {
            return "";
        }
        return new handlebars.SafeString(", { " + param.map(value => value.name).join(", ") + " }");
    });

    handlebars.registerHelper("toProperty", (property: string, schema: SchemaObject) => {
        return new handlebars.SafeString(`${property}: ${schemaToJSType(schema).toString()};`);
    });

    handlebars.registerHelper("toReturnType", (returnType?: SchemaObject) => {
        return schemaToJSType(returnType);
    });

    const context: TemplateContext = {
        paths: [],
        schemata: {},
    }

    for (const [key, path] of Object.entries(data.paths)) {
        const kebubName = key
            .split(keyReg)
            .filter(s => s).map(s => s.slice(0, 1).toUpperCase() + s.slice(1))
            .join("");

        const templatePath: TemplateApiPath = {
            path: key,
            methods: []
        };

        if (path.delete) {
            templatePath.methods.push(toMethod(context, kebubName, "delete", path, path.delete));
        }
        if (path.get) {
            templatePath.methods.push(toMethod(context, kebubName, "get", path, path.get));
        }
        if (path.post) {
            templatePath.methods.push(toMethod(context, kebubName, "post", path, path.post));
        }
        if (path.put) {
            templatePath.methods.push(toMethod(context, kebubName, "put", path, path.put));
        }
        context.paths.push(templatePath);
    }

    const content = await fs.readFile("./src/server/bin/misc/openapi/webclient.ts.handlebars", { encoding: "utf-8" });
    const template = handlebars.compile(content);
    const output = template(context);
    await fs.writeFile("./src/server/bin/misc/openapi/webclient.ts", output, { encoding: "utf-8" });
}

function toMethod(context: TemplateContext, kebubName: string, method: string, path: PathItemObject, operation: OperationObject): TemplateApiMethod {
    const parameter: TemplateApiParam[] = [];

    if (operation.parameters) {
        operation.parameters.forEach(value => {
            if (isRefObj(value)) {
                (value as ReferenceObject).$ref
            } else if (value.in === "query") {
                parameter.push({ type: {type: "string"}, name: value.name });
                setSchemata(context.schemata, value.schema);
            }
        });
    }
    if (operation.requestBody && !(isRefObj(operation.requestBody))) {
        const typeObject: MediaTypeObject = operation.requestBody.content["application/json"]

        if (typeObject && typeObject.schema && !(isRefObj(typeObject.schema)) && typeObject.schema.title) {
            parameter.push({ type: {type: "string"}, name: typeObject.schema.title });
            setSchemata(context.schemata, typeObject.schema);
        }
    }
    let returnType = null;
    if (!isRefObj(operation.responses[200])
        && operation.responses[200]?.content
        && operation.responses[200].content["application/json"]?.schema
        && !isRefObj(operation.responses[200].content["application/json"].schema)) {

        const schema = operation.responses[200].content["application/json"].schema;
        returnType = schema;

        setSchemata(context.schemata, schema);
    }
    return {
        name: method + kebubName,
        method,
        description: (path.description || "") + "\n" + (operation.description || ""),
        parameter,
        returnType,
    };
}

function setSchemata(schemata: any, schema?: SchemaObject | ReferenceObject) {
    if (schema && !(isRefObj(schema))) {
        if (schema.type === "object" && schema.title) {
            schemata[schema.title] = schema;
            Object.values(schema.properties || {}).forEach(value => setSchemata(schemata, value));
        }
        schema.allOf?.forEach(value => setSchemata(schemata, value));
        schema.anyOf?.forEach(value => setSchemata(schemata, value));
        schema.oneOf?.forEach(value => setSchemata(schemata, value));
        setSchemata(schemata, schema.items);
    }
}

function isRefObj(value: any): value is ReferenceObject {
    return value && "$ref" in value;
}

export async function generateOpenApiSpec(data: OpenApiObject): Promise<void> {
    const templateResult = yaml.dump(data);
    await fs.writeFile("./result.yaml", templateResult, { encoding: "utf8" });
}