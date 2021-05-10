import logger from "bin/logger";
import { isQuery, Errors, isError, isString } from "bin/tools";
import { Handler, NextFunction, Request, Response } from "express";
import stringify from "stringify-stream";

export function stopper(req: Request, res: Response, next: NextFunction): any {
  return next();
}

export function sendResult(res: Response, promise: Promise<any>): void {
  promise
    .then((result) => {
      if (isQuery(result)) {
        result
          .stream({ objectMode: true, highWaterMark: 10 })
          .pipe(stringify({ open: "[", close: "]" }))
          .pipe(res);
      } else {
        res.json(result);
      }
    })
    .catch((error) => {
      const errorCode = isError(error);
      res.status(errorCode ? 400 : 500).json({ error: errorCode ? error : Errors.INVALID_MESSAGE });

      logger.error(error);
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
    // @ts-expect-error
    return value;
  } else {
    throw Error(`Expected a String for "${key}" but got an object of type: ${typeof value}`);
  }
}

export type RestHandler<Return = any> = (request: Request, response: Response, next: NextFunction) => Return;

/**
 * Wraps a Function handler. The return value is interpreted as the body
 * of the response. A Promise will be resolved, a Query will be listened on.
 * Errors are catched and returned as response status code depending on the error.
 *
 * @param handler handler function to wrap
 * @returns an express handler
 */
export function createHandler(handler: RestHandler): Handler {
  return (req, res, next) => {
    try {
      const result = handler(req, res, next);

      if (result && result.catch && result.then) {
        return result;
      } else {
        return Promise.resolve(result);
      }
    } catch (error) {
      return Promise.reject(error);
    }
  };
}
