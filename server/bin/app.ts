import createError, {HttpError} from "http-errors";
import express, {Request, Response} from "express";
import path from "path";
import logger from "morgan";
import compression from "compression";
// helps by preventing some known http vulnerabilities by setting http headers appropriately
import helmet from "helmet";
// own router
import log from "./logger";
import {apiRouter} from "./api";
import {blockRequests} from "./timer";
import emojiStrip from "emoji-strip";
import {isString} from "./tools";

export const app = express();

const parentDirName = path.dirname(path.dirname(__dirname));

app.use(blockRequests);
app.use(logger(":method :url :status :response-time ms - :res[content-length]", {
    stream: {
        write(str: string): void {
            log.info(str.trim());
        }
    }
}));
app.use(helmet());
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
app.use(express.static(path.join(parentDirName, "website", "dist")));

app.get("/", (req, res) => {
    res.sendFile(path.join(parentDirName, path.join("website","dist", "index.html")));
});

app.use((req: Request, res: Response) => {
    if (!req.path.startsWith("/api")) {
        // @ts-ignore
        res.redirect(`/?redirect=${req.path}`);
    }
});

// catch 404 and forward to error handler
app.use((req, res, next) => {
    next(createError(404));
});

// error handler
app.use((err: HttpError, req: Request, res: Response) => {
    // set locals, only providing error in development
    // @ts-ignore
    res.locals.message = err.message;
    // @ts-ignore
    res.locals.error = req.app.get("env") === "development" ? err : {};

    // render the error page
    // @ts-ignore
    res.sendStatus(err.status || 500);
});


// todo what is with tls (https), cloudflare?
// todo does it redirect automatically to https when http was typed?
// todo what options does https need
