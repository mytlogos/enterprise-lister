import { Request, Response } from "express";
import logger from "enterprise-core/dist/logger";
import onFinished from "on-finished";

export function logRequest(req: Request, res: Response, next: () => void) {
  // request data
  const start = process.hrtime();

  function log() {
    const httpHeader = req.header && req.header("x-forwarded-for");
    const requestID = req.header && req.header("x-request-id");

    const ip = req.ip || httpHeader || (req.connection && req.connection.remoteAddress) || req.socket.remoteAddress;
    // time elapsed from request start
    const elapsed = process.hrtime(start);

    // cover to milliseconds
    const ms = elapsed[0] * 1e3 + elapsed[1] * 1e-6;

    // return truncated value
    const elapsedMillis = ms.toFixed(3);

    const requestData = {
      ip: ip,
      method: req.method,
      status: res.statusCode,
      url: req.originalUrl || req.path || req.url,
      elapsed: elapsedMillis,
      contentLength: res.get("content-length"),
      contentType: res.get("content-type"),
    };

    if (requestID) {
      // @ts-expect-error
      requestData.requestId = requestID;
    }

    logger.info("request", requestData);
  }

  // log when response finished
  onFinished(res, log);
  next();
}
