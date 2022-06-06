import createError, { HttpError } from "http-errors";
import express, { Request, Response } from "express";
import path from "path";
import compression from "compression";
// helps by preventing some known http vulnerabilities by setting http headers appropriately
import helmet from "helmet";
// own router
import { apiRouter } from "./api";
import { blockRequests } from "./timer";
import { isString, emojiStrip } from "enterprise-core/dist/tools";
import swaggerUi from "swagger-ui-express";
import swaggerJsDoc from "swagger-jsdoc";
import enableWS from "express-ws";
import promBundle from "express-prom-bundle";
import { logRequest } from "./requestlogger";

// Add the options to the prometheus middleware most option are for http_request_duration_seconds histogram metric
const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true,
  customLabels: { NODE_APP_INSTANCE: "enterprise-server" },
  promClient: {
    collectDefaultMetrics: {
      labels: { NODE_APP_INSTANCE: "enterprise-server" },
    },
  },
});

const specs = swaggerJsDoc({
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "Enterprise API",
      version: "1.0.2",
    },
  },
  apis: ["dist/api/*", "dist/types.d.ts", "dist/externals/types.d.ts"],
});

export const app = express();
enableWS(app); // allow router/app to use *.ws

const parentDirName = path.dirname(path.dirname(__dirname));

app.use(blockRequests);
app.use(logRequest);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());

// remove any emoji, dont need it and it can mess up my database
app.use((req, res, next) => {
  if (req.body && isString(req.body)) {
    req.body = emojiStrip(req.body);
  }
  next();
});

// only accept json as req body
app.use(express.json());
app.use(metricsMiddleware);

app.use("/api", apiRouter());
app.use("/doc", swaggerUi.serve, swaggerUi.setup(specs));

app.use(express.static(path.join(parentDirName, "website", "dist")));

const ignorePaths = ["/api", "/doc", "/js/", "/css/", "/img/"];

app.use((req, res) => {
  // all other GET requests should be the pwa root with path from pwa router
  if (req.method === "GET" && ignorePaths.every((ignored) => !req.path.startsWith(ignored))) {
    res.sendFile(path.join(parentDirName, path.join("website", "dist", "index.html")));
  }
});

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
app.use((err: HttpError, req: Request, res: Response) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.sendStatus(err.status || 500);
});

// TODO what is with tls (https), cloudflare?
// TODO does it redirect automatically to https when http was typed?
// TODO what options does https need
