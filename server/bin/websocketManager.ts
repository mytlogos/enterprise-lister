import {Storage} from "./database/database";
import {add as addDependant} from "./externals/scraper";
import {getElseSet} from "./tools";
import {connection, IMessage, request} from "websocket";
import {MultiSingle, News} from "./types";
import logger from "./logger";


interface Connection {
    connection: connection;
    verified: boolean;
    extension: boolean;
    uuid: string;
}

interface IpObject {
    site?: Connection;
    extension?: Connection;
}


/**
 *
 * @type {Map<string, Map<string, {site: Connection, extension: Connection}>>}
 */
const connections = new Map();

/**
 * Checks whether the Origin is allowed
 *
 * @return {boolean|{uuid:string, extension: boolean}}
 */
async function originIsAllowed(req: request) {
    let exec = /https?:\/\/(.+)\/?/.exec(req.origin);

    let extension = false;
    // test if request comes from website
    if (!exec) {
        // origins from extension start with '[browser-code]-extension://'
        exec = /(moz|chrome)-extension:\/\/(.+)\/?/.exec(req.origin);
        // test if request comes from an extension
        if (!exec) {
            return false;
        }
        // todo test if their extension id is correct
        extension = true;
    } else if (exec[1] !== req.host) {
        // todo test if host is this server?
        return false;
    }
    const user = await Storage.userLoginStatus(req.remoteAddress);
    return user && {uuid: user.uuid, extension};
}

function wsMessage(msg: IMessage, conObject: Connection, ipObject: IpObject): void {
    if (msg.type !== "utf8" || !msg.utf8Data) {
        return;
    }
    const jsonMsg = JSON.parse(msg.utf8Data);

    // maybe this 'verifying' is unnecessary, but i do it anyway to ease my mind
    if (!conObject.verified) {
        if (jsonMsg.uuid && conObject.uuid === jsonMsg.uuid) {
            conObject.verified = true;
        }
        if (conObject.extension) {
            Storage
                .checkUnreadNews(conObject.uuid)
                .then((unread) => conObject.connection.sendUTF(JSON.stringify({unread})))
                .catch((error) => {
                    console.log(error);
                    logger.error(error);
                });
        }
        return;
    }

    if (jsonMsg.refresh) {
        if (jsonMsg.refresh.externalUuid) {
            Storage
                .getExternalUserWithCookies(jsonMsg.refresh.externalUuid)
                .then((externalUser) => addDependant({oneTimeUser: externalUser}))
                .catch((error) => {
                    console.log(error);
                    logger.error(error);
                });
        }
    }
    if (jsonMsg.read) {
        if (jsonMsg.read.news) {
            Storage
                .markNewsRead(conObject.uuid, jsonMsg.read.news)
                .catch((error) => {
                    console.log(error);
                    logger.error(error);
                })
                .finally(() => {
                    if (!conObject.extension && ipObject.extension && ipObject.extension.verified) {
                        // fixme the number of unread news and reachable news does not seem to match
                        // (maybe unreachable news are too old?) see 'Storage.getNews'
                        Storage
                            .checkUnreadNews(conObject.uuid)
                            // @ts-ignore
                            .then((unread) => ipObject.extension.connection.sendUTF(JSON.stringify({unread})))
                            .catch((error) => {
                                console.log(error);
                                logger.error(error);
                            });
                    }
                });
        }
    }
    if (jsonMsg.result) {
        Storage
            .markEpisodeRead(conObject.uuid, jsonMsg)
            .catch((error) => {
                console.log(error);
                logger.error(error);
            });
    }
    if (jsonMsg.progress) {
        Storage
            .setProgress(conObject.uuid, jsonMsg.progress)
            .catch((error) => {
                console.log(error);
                logger.error(error);
            });
    }
    logger.info("From: ", conObject.uuid, "Message: ", jsonMsg);
}

/**
 * Accepts a connection for websocket for a user/ip if the origin is valid.
 *
 * @param req
 */
export const requestHandler = (req: request) => wsRequestHandler(req).catch((reason) => {
    console.log(reason);
    logger.error(reason);
});

async function wsRequestHandler(req: request) {
    try {
        const uuidObj = await originIsAllowed(req);
        if (!uuidObj) {
            // Make sure we only accept requests from an allowed origin
            req.reject();
            logger.info(`${new Date()} Connection from origin ${req.origin} rejected.`);
            return;
        }

        const con: connection = req.accept(undefined, req.origin);
        logger.info(`${new Date()} Connection of ${req.origin} from ${req.remoteAddress} accepted.`);

        const ipMap: Map<string, IpObject> = getElseSet(connections, uuidObj.uuid, () => new Map());

        const ipObjectValue: IpObject | undefined = ipMap.get(req.remoteAddress);
        let ipObject: IpObject;

        if (ipObjectValue) {
            ipObject = ipObjectValue;
            if (uuidObj.extension) {
                if (ipObject.extension) {
                    if (uuidObj.extension) {
                        // if it tries to build up another connection, shoot it down
                        req.reject();
                        return;
                    }
                    ipObject.extension.connection.close();
                    ipObject.extension.verified = false;
                }
            } else if (ipObject.site) {
                if (!uuidObj.extension) {
                    // if it tries to build up another connection, shoot it down
                    req.reject();
                    return;
                }
                ipObject.site.connection.close();
                ipObject.site.verified = false;
            }
        } else {
            ipObject = {};
        }

        const conObj = {connection: con, verified: false, uuid: uuidObj.uuid, extension: uuidObj.extension};

        if (uuidObj.extension) {
            ipObject.extension = conObj;
        } else {
            ipObject.site = conObj;
        }
        ipMap.set(req.remoteAddress, ipObject);

        con.on("message", (message) => {
            try {
                wsMessage(message, conObj, ipObject);
            } catch (e) {
                logger.error(e);
                console.log(e);
            }
        });
        con.on("close", (reasonCode, description) => {
            if (uuidObj.extension) {
                if (ipObject.extension && ipObject.extension.connection === con) {
                    ipObject.extension = undefined;
                }
            } else if (ipObject.site && ipObject.site.connection === con) {
                ipObject.site = undefined;
            }
            if (!ipObject.site && !ipObject.extension) {
                ipMap.delete(uuidObj.uuid);
            }
            logger.info((new Date()) + " Peer " + con.remoteAddress + " disconnected.");
        });
    } catch (e) {
        console.log(e);
        logger.error(e);
    }
}

/**
 * Sends a message to the websocket connection of the user.
 */
export function sendMessage(uuid: string, msg: object, extension = false, excludeIp?: string): void {
    if (!Object.keys(msg).length) {
        return;
    }
    const data = JSON.stringify(msg);
    const ipMap = connections.get(uuid);

    // todo for now an connection ignores all messages until it is verified, make a messageQueue?
    if (!ipMap || !ipMap.size) {
        console.error("Got no Connections for user: " + uuid);
        return;
    }
    for (const entry of ipMap.entries()) {
        if (excludeIp === entry[0]) {
            continue;
        }
        const conObject = entry[1];

        if (conObject.site && conObject.site.verified) {
            logger.info("sending to site: " + JSON.stringify(uuid) + JSON.stringify(msg));
            conObject.site.connection.sendUTF(data);
        }
        if (conObject.extension && conObject.extension.verified) {
            logger.info("sending to extension: " + JSON.stringify(uuid) + JSON.stringify(msg));
            conObject.extension.connection.sendUTF(data);
        }
    }
}

/**
 * Sends a news message to all websocket connections
 * whose users the news are relevant for.
 */
export function broadCastNews(msg: MultiSingle<News>): void {
    if (!msg || (Array.isArray(msg) && !msg.length)) {
        return;
    }
    // todo filter it for each user
    const data = JSON.stringify({news: msg});

    for (const value of connections.values()) {
        for (const conObject of value.values()) {
            if (conObject.site && conObject.site.verified) {
                conObject.site.connection.sendUTF(data);
            }
            if (conObject.extension && conObject.extension.verified) {
                Storage
                    .checkUnreadNews(conObject.extension.uuid)
                    .then((unread) => {
                        const unreadData = JSON.stringify({unread});
                        conObject.extension.connection.sendUTF(unreadData);
                    })
                    .catch((error) => {
                        console.log(error);
                        logger.error(error);
                    });
            }
        }
    }
}

export function markLoggedOut(uuid: string, ip: string): void {
    const ipMap = connections.get(uuid);

    if (!ipMap || !ipMap.size) {
        connections.delete(uuid);
    }

    const ipObj = ipMap.get(ip);

    if (!ipObj) {
        return;
    }

    if (ipObj.extension) {
        ipObj.extension.connection.close();
        ipObj.extension.verified = false;

    }

    if (ipObj.site) {
        ipObj.site.connection.close();
        ipObj.site.verified = false;
    }
    ipMap.delete(ip);

    if (!ipMap.size) {
        connections.delete(uuid);
    }
}


