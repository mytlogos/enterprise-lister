import { generateExpressApiObject } from "./exportOpenApi";
import ts from "typescript";
import { generateOpenApiSpec, generateWebClient } from "./transformer";

function GenerateOpenApi(file: string) {
    const openApiObject = generateExpressApiObject([file], {
        target: ts.ScriptTarget.ES5,
        module: ts.ModuleKind.CommonJS
    });

    generateOpenApiSpec(openApiObject);
    generateWebClient(openApiObject);
}

GenerateOpenApi("./src/server/bin/api.ts");