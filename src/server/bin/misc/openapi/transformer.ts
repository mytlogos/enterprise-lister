import handlebars from "handlebars";
import fs from "fs/promises";
import { 
    OpenApiObject,
    OperationObject,
    PathItemObject,
    ReferenceObject,
    MediaTypeObject
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
    type: any;
    name: string;
}

interface TemplateContext {
    paths: TemplateApiPath[];
    schemata: Record<string, any>;
}

export async function generateWebClient(data: OpenApiObject): Promise<void> {
    const keyReg = /\/+/g;
    const validKeyReg = /^[a-z_][a-zA-Z_0-9]*$/;

    handlebars.registerHelper("toKey", (key: string) => {
        return key.replace(keyReg, "_").slice(1);
    });

    handlebars.registerHelper("objectAccess", (key: string) => {
        key = key.replace(keyReg, "_").slice(1);
        return new handlebars.SafeString(validKeyReg.test(key) ? "." + key : `["${key}"]`);
    });

    handlebars.registerHelper("toParameter", (param: TemplateApiParam[]) => {
        return new handlebars.SafeString(param.map(value => `${value.name}: string`).join(", "));
    });

    handlebars.registerHelper("toQueryParam", (param: TemplateApiParam[]) => {
        if (!param.length) {
            return "";
        }
        return new handlebars.SafeString(", { " + param.map(value => value.name).join(", ") + " }");
    });

    handlebars.registerHelper("toReturnType", (returnType?: any) => {
        if (!returnType) {
            return "unknown";
        } else if (returnType.type === "Array") {
            return new handlebars.SafeString("any[]");
        } else if (returnType.type === "object") {
            return "any";
        }
        return new handlebars.SafeString(returnType.type || "unknown");
    });

    const context: TemplateContext = {
        paths: [],
        schemata: [],
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
                parameter.push({ type: "", name: value.name });

                if (value.schema && !(isRefObj(value.schema)) && value.schema.type === "object" && value.schema.title) {
                    context.schemata[value.schema.title] = value.schema;
                }
            }
        });
    }
    if (operation.requestBody && !(isRefObj(operation.requestBody))) {
        const typeObject: MediaTypeObject = operation.requestBody.content["application/json"]

        if (typeObject && typeObject.schema && !(isRefObj(typeObject.schema)) && typeObject.schema.title) {
            parameter.push({ type: "", name: typeObject.schema.title });

            if (typeObject.schema.type === "object") {
                context.schemata[typeObject.schema.title] = typeObject.schema;
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

        if (schema.type === "object" && schema.title) {
            context.schemata[schema.title] = schema;
        }
    }
    return {
        name: method + kebubName,
        method,
        description: (path.description || "") + "\n" + (operation.description || ""),
        parameter,
        returnType,
    };
}

function isRefObj(value: any): value is ReferenceObject {
    return value && "$ref" in value;
}

export async function generateOpenApiSpec(data: OpenApiObject): Promise<void> {
    const templateResult = yaml.dump(data);
    await fs.writeFile("./result.yaml", templateResult, { encoding: "utf8" });
}