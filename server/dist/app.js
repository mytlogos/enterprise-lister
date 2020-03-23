"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const http_errors_1 = tslib_1.__importDefault(require("http-errors"));
const express_1 = tslib_1.__importDefault(require("express"));
const path_1 = tslib_1.__importDefault(require("path"));
const morgan_1 = tslib_1.__importDefault(require("morgan"));
const compression_1 = tslib_1.__importDefault(require("compression"));
// helps by preventing some known http vulnerabilities by setting http headers appropriately
const helmet_1 = tslib_1.__importDefault(require("helmet"));
// own router
const logger_1 = tslib_1.__importDefault(require("./logger"));
const api_1 = require("./api");
const timer_1 = require("./timer");
const emoji_strip_1 = tslib_1.__importDefault(require("emoji-strip"));
const tools_1 = require("./tools");
exports.app = express_1.default();
const parentDirName = path_1.default.dirname(path_1.default.dirname(__dirname));
exports.app.use(timer_1.blockRequests);
exports.app.use(morgan_1.default(":method :url :status :response-time ms - :res[content-length]", {
    stream: {
        write(str) {
            logger_1.default.info(str.trim());
        }
    }
}));
exports.app.use(helmet_1.default());
exports.app.use(compression_1.default());
// remove any emoji, dont need it and it can mess up my database
exports.app.use((req, res, next) => {
    if (req.body && tools_1.isString(req.body)) {
        req.body = emoji_strip_1.default(req.body);
    }
    next();
});
// only accept json as req body
exports.app.use(express_1.default.json());
exports.app.use("/api", api_1.apiRouter());
exports.app.use(express_1.default.static(path_1.default.join(parentDirName, "dist")));
exports.app.get("/", (req, res) => {
    res.sendFile(path_1.default.join(parentDirName, path_1.default.join("dist", "index.html")));
});
exports.app.use((req, res) => {
    if (!req.path.startsWith("/api")) {
        // @ts-ignore
        res.redirect(`/?redirect=${req.path}`);
    }
});
// catch 404 and forward to error handler
exports.app.use((req, res, next) => {
    next(http_errors_1.default(404));
});
// error handler
exports.app.use((err, req, res) => {
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
//# sourceMappingURL=app.js.map