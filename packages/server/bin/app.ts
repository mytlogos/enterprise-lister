import createError, { HttpError } from "http-errors";
import express, { Request, Response } from "express";
import path from "path";
import logger from "morgan";
import compression from "compression";
// helps by preventing some known http vulnerabilities by setting http headers appropriately
import helmet from "helmet";
// own router
import log from "enterprise-core/dist/logger";
import { apiRouter } from "./api";
import { blockRequests } from "./timer";
import emojiStrip from "emoji-strip";
import { isString } from "enterprise-core/dist/tools";
import swaggerUi from "swagger-ui-express";
import swaggerJsDoc from "swagger-jsdoc";

const specs = swaggerJsDoc({
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "Enterprise API",
      version: "1.0.2",
    },
  },
  apis: ["dist/server/api/*", "dist/server/types.d.ts", "dist/server/externals/types.d.ts"],
});

export const app = express();

const parentDirName = path.dirname(path.dirname(__dirname));

app.use(blockRequests);
app.use(
  logger(":method :url :status :response-time ms - :res[content-length]", {
    stream: {
      write(str: string): void {
        log.info(str.trim());
      },
    },
  }),
);

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

app.use("/api", apiRouter());
app.use("/doc", swaggerUi.serve, swaggerUi.setup(specs));

// map root to app.html first, before the static files, else it will map to index.html by default
app.get("/", (req, res) => res.sendFile(path.join(parentDirName, path.join("dist", "website", "app.html"))));

app.use(express.static(path.join(parentDirName, "dist", "website")));

app.use((req, res) => {
  if (!req.path.startsWith("/api") && req.method === "GET") {
    res.sendFile(path.join(parentDirName, path.join("dist", "website", "app.html")));
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
