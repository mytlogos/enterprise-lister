const createError = require('http-errors');
const express = require('express');
const path = require('path');
const logger = require('morgan');
const compression = require('compression');
//helps by preventing some known http vulnerabilities by setting http headers appropriately
const helmet = require('helmet');

const api = require("./api");
const enterprise = require('./enterprise');

const app = express();
exports.app = app;

const parentDirName = path.dirname(__dirname);

app.use(logger('dev'));
app.use(helmet());
app.use(compression());
//only accept json as req body
app.use(express.json());
app.use(express.static(path.join(parentDirName, 'public')));


// noinspection JSUnresolvedFunction
app.use("/api", api);

// noinspection JSUnresolvedFunction
app.get("/", (req, res) => {
    res.sendFile(path.join(parentDirName, path.join('public', 'viewer.html')));
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    // noinspection JSUnresolvedFunction
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.sendStatus(err.status || 500);
});

const WebSocketServer = require("websocket").server;

let wsServer;

exports.initWSServer = function initWSServer(server) {
    wsServer = new WebSocketServer({
        httpServer: server,
        // You should not use autoAcceptConnections for production
        // applications, as it defeats all standard cross-origin protection
        // facilities built into the protocol and the browser.  You should
        // *always* verify the connection's origin and decide whether or not
        // to accept it.
        autoAcceptConnections: false
    });


    wsServer.on('request', function (request) {
        if (!enterprise.originIsAllowed(request.origin)) {
            // Make sure we only accept requests from an allowed origin
            request.reject();
            console.log(`${new Date()} Connection from origin ${request.origin} rejected.`);
            return;
        }

        let connection = request.accept(null, request.origin);
        console.log(`${new Date()} Connection of ${request.origin} from ${request.remoteAddress} accepted.`);

        connection.on('message', message => enterprise.wsMessage(message, con));
        connection.on('close', function (reasonCode, description) {
            console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
        });
    });
};

//todo does it redirect automatically to https when http was typed?
//todo what options does https need
//todo what is with tls, cloudflare?

//todo at the end or at the beginning?
