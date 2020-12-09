import { OpenApiObject } from "./types";
import { generateExpressApiObject } from "./exportOpenApi";
import ts from "typescript";
import yaml from "js-yaml";
import fs from "fs";

function templateOpenApi(openApi: OpenApiObject): string {
    return yaml.dump(openApi);
}

function GenerateOpenApi(file: string) {
    const openApiObject = generateExpressApiObject([file], {
        target: ts.ScriptTarget.ES5,
        module: ts.ModuleKind.CommonJS
    });

    const templateResult = templateOpenApi(openApiObject);
    fs.writeFileSync("./result.yaml", templateResult, { encoding: "utf8" });
}

GenerateOpenApi("./src/server/bin/api.ts");