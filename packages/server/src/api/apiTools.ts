import { RestResponseError } from "../errors";
import logger from "enterprise-core/dist/logger";
import { isQuery, Errors, isError, isString } from "enterprise-core/dist/tools";
import { Handler, NextFunction, Request, Response } from "express";
import stringify from "stringify-stream";
import { ValidationError } from "enterprise-core/dist/error";
import { JSONSchemaType } from "enterprise-core/dist/validation";
import { Validator } from "express-json-validator-middleware";
import addFormats from "ajv-formats";
import * as validationSchemata from "../validation";

export function castQuery<T extends Record<string, any>>(req: Request): T {
  return req.query as T;
}

export function stopper(_req: Request, _res: Response, next: NextFunction): any {
  return next();
}

export function sendResult(res: Response, promise: Promise<any>): void {
  promise
    .then((result) => {
      if (isQuery(result)) {
        result.pipe(stringify({ open: "[", close: "]" })).pipe(res);
      } else {
        res.json(result);
      }
    })
    .catch((error) => {
      if (error instanceof RestResponseError) {
        res.status(400).json({ message: error.message, code: error.errorCode, data: error.errorData });
      } else {
        if (error instanceof ValidationError) {
          res.status(400).json({ error: Errors.INVALID_INPUT });
        } else {
          const errorCode = isError(error);
          res.status(errorCode ? 400 : 500).json({ error: errorCode ? error : Errors.INVALID_MESSAGE });
        }
        logger.error(error);
      }
    });
}

export function extractQueryParam<T extends boolean = false>(
  request: Request,
  key: string,
  optional?: T,
): T extends true ? string | undefined : string {
  const value = request.query[key];

  if (optional && value == null) {
    // @ts-expect-error
    return value;
  }

  if (isString(value)) {
    return value;
  } else {
    throw new TypeError(`Expected a String for "${key}" but got an object of type: ${typeof value}`);
  }
}

export type RestHandler<Return = any> = (request: Request, response: Response, next: NextFunction) => Return;
export interface ValidationSchemata {
  body?: JSONSchemaType<unknown> | any;
  params?: JSONSchemaType<unknown> | any;
  query?: JSONSchemaType<unknown> | any;
}

/**
 * Initialize a `Validator` instance, optionally passing in
 * an Ajv options object.
 *
 * @see https://github.com/ajv-validator/ajv/tree/v9#options
 */
export const validator = new Validator({});
addFormats(validator.ajv);

// add all exported schemata to this instance
for (const schema of Object.values(validationSchemata)) {
  if (schema?.$id) {
    // this will throw and exit process if any schema with already exiting id are added
    validator.ajv.addSchema(schema);
  }
}

/**
 * Wraps a Function handler. The return value is interpreted as the body
 * of the response. A Promise will be resolved, a Query will be listened on.
 * Errors are catched and returned as response status code depending on the error.
 *
 * @param restHandler handler function to wrap
 * @returns an express handler
 */
export function createHandler(restHandler: RestHandler, schemata?: ValidationSchemata): Handler | [Handler, Handler] {
  const handler: Handler = (req, res, next) => {
    try {
      const result = restHandler(req, res, next);

      if (result?.catch && result.then) {
        sendResult(res, result);
      } else {
        sendResult(res, Promise.resolve(result));
      }
    } catch (error) {
      sendResult(res, Promise.reject(error));
    }
  };
  if (schemata) {
    // if schema is defined, validate first and then call handler
    return [validator.validate(schemata as any), handler];
  }
  return handler;
}
