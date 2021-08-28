import { generateExpressApiObject } from "./exportOpenApi";
import ts from "typescript";
import { generateOpenApiSpec, generateWebClient, generateValidator } from "./transformer";
import { OperationObject, ParameterObject, SchemaObject, RequestBodyObject, OpenApiObject } from "./types";
import yaml from "js-yaml";
import fs from "fs/promises";
import { isNumber, isString } from "validate.js";
import yargs from "yargs";

async function GenerateOpenApi(file: string) {
  const openApiObject = generateExpressApiObject([file], {
    target: ts.ScriptTarget.ES5,
    module: ts.ModuleKind.CommonJS,
  });

  await readHook(openApiObject);

  await generateOpenApiSpec(openApiObject);
  await generateWebClient(openApiObject);
  await generateValidator(openApiObject);
}

async function readHook(openApiObject: OpenApiObject) {
  const hook = yaml.load(await fs.readFile("openApiTypeHook.yaml", { encoding: "utf8" })) as any;

  if (!hook || isString(hook) || isNumber(hook)) {
    throw Error("expected an object, but got: " + typeof hook);
  }

  const methods = ["get", "delete", "post", "put"];

  for (const [path, value] of Object.entries(openApiObject.paths)) {
    const input: any = hook[path];

    for (const method of methods) {
      // @ts-expect-error
      const operation: OperationObject = value[method];
      const methodInput: any = input && input[method];

      if (operation) {
        if (operation.parameters && operation.parameters.length) {
          const inputParameter = methodInput.parameter || [];

          operation.parameters.forEach((p) => {
            const param = p as ParameterObject;

            const inputParam = inputParameter[param.name];

            if (!inputParam) {
              return;
            }
            param.schema = inputParam;
          });
        }

        if (operation.requestBody) {
          const requestSchema = (operation.requestBody as RequestBodyObject).content["application/json"]
            ?.schema as SchemaObject;

          if (requestSchema && requestSchema.properties) {
            const parameterInput: Record<string, SchemaObject> = methodInput.requestBody || {};

            for (const [key, schema] of Object.entries(requestSchema.properties)) {
              if (!schema || ((schema as SchemaObject).type === "any" && parameterInput[key])) {
                requestSchema.properties[key] = parameterInput[key];
              }
            }
          }
        }
      }
    }
  }
}

async function writeHook(openApiObject: OpenApiObject) {
  const hookOutput: any = {};
  const methods = ["get", "delete", "post", "put"];

  for (const [path, value] of Object.entries(openApiObject.paths)) {
    const output: any = {};
    for (const method of methods) {
      // @ts-expect-error
      const operation: OperationObject = value[method];
      const methodOutput: any = {};

      if (operation) {
        if (operation.parameters && operation.parameters.length) {
          const parameterOutput: Record<string, SchemaObject> = (methodOutput.parameter = {});

          operation.parameters.forEach((p) => {
            const param = p as ParameterObject;

            parameterOutput[param.name] = {
              ...((param.schema as SchemaObject) || {
                type: "string",
              }),
            };
          });
        }

        if (operation.requestBody) {
          const requestSchema = (operation.requestBody as RequestBodyObject).content["application/json"]
            ?.schema as SchemaObject;

          if (requestSchema && requestSchema.properties) {
            const parameterOutput: Record<string, SchemaObject> = {};

            for (const [key, schema] of Object.entries(requestSchema.properties)) {
              if (!schema || (schema as SchemaObject).type === "any") {
                parameterOutput[key] = {
                  ...((schema as SchemaObject) || {
                    type: "string",
                  }),
                  type: "string",
                };
              }
            }
            if (Object.keys(parameterOutput).length) {
              methodOutput.requestBody = parameterOutput;
            }
          }
        }
      }
      if (Object.keys(methodOutput).length) {
        output[method] = methodOutput;
      }
    }
    if (Object.keys(output).length) {
      hookOutput[path] = output;
    }
  }

  await fs.writeFile("openApiTypeHook.yaml", yaml.dump(hookOutput), {
    encoding: "utf8",
  });
}

async function generateClientOnly(openapi: string, target?: string) {
  const content = await fs.readFile(openapi, { encoding: "utf-8" });
  const openApiObject: any = yaml.load(content);

  if (!openApiObject) {
    console.log("No Open Api Object available");
    return;
  }

  console.log(typeof openApiObject);

  await generateWebClient(openApiObject, target);
}

function main() {
  const argv = yargs
    .option("openapi", {
      type: "string",
    })
    .option("target", {
      type: "string",
    })
    .option("middleware", {
      type: "string",
    })
    .help()
    .alias("help", "h").argv;

  // @ts-expect-error
  if (argv.openapi) {
    // @ts-expect-error
    generateClientOnly(argv.openapi, argv.target)
      // @ts-expect-error
      .then(() => console.log("Created the Client at " + argv.target))
      .catch((error) => {
        console.error(error);
      });
    // @ts-expect-error
  } else if (argv.middleware) {
    // @ts-expect-error
    GenerateOpenApi(argv.middleware);
  } else {
    GenerateOpenApi("./packages/server/bin/api.ts");
  }
}

if (typeof require !== "undefined" && require.main) {
  main();
}
