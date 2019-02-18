import {Storage} from "./database";
import {add as addDependant} from "./externals/scraper";
import {getElseSet} from "./tools";
import {connection, IMessage, request} from "websocket";
import {News} from "./types";


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
                .checkUnread(conObject.uuid)
                .then((unread) => conObject.connection.sendUTF(JSON.stringify({unread})))
                .catch(console.log);
        }
        return;
    }

    if (jsonMsg.refresh) {
        if (jsonMsg.refresh.externalUuid) {
            Storage
                .getExternalUserWithCookies(jsonMsg.refresh.externalUuid)
                .then((externalUser) => addDependant({oneTimeUser: externalUser}))
                .catch(console.log);
        }
    }
    if (jsonMsg.read) {
        if (jsonMsg.read.news) {
            Storage
                .markNewsRead(conObject.uuid, jsonMsg.read.news)
                .catch(console.log)
                .finally(() => {
                    if (!conObject.extension && ipObject.extension && ipObject.extension.verified) {
                        // fixme the number of unread news and reachable news does not seem to match
                        // (maybe unreachable news are too old?) see 'Storage.getNews'
                        Storage
                            .checkUnread(conObject.uuid)
                            // @ts-ignore
                            .then((unread) => ipObject.extension.connection.sendUTF(JSON.stringify({unread})))
                            .catch(console.log);
                    }
                });
        }
    }
    if (jsonMsg.result) {
        Storage
            .markEpisodeRead(conObject.uuid, jsonMsg)
            .catch(console.log);
    }
    console.log("From: ", conObject.uuid, "Message: ", jsonMsg);
}

/**
 * Accepts a connection for websocket for a user/ip if the origin is valid.
 *
 * @param req
 */
export const requestHandler = async (req: request) => {
    const uuidObj = await originIsAllowed(req);
    if (!uuidObj) {
        // Make sure we only accept requests from an allowed origin
        req.reject();
        console.log(`${new Date()} Connection from origin ${req.origin} rejected.`);
        return;
    }

    const con: connection = req.accept(undefined, req.origin);
    console.log(`${new Date()} Connection of ${req.origin} from ${req.remoteAddress} accepted.`);

    const ipMap = getElseSet(connections, uuidObj.uuid, () => new Map());

    let ipObject: IpObject;

    if (ipMap.has(req.remoteAddress)) {
        ipObject = ipMap.get(req.remoteAddress);

        if (uuidObj.extension) {
            if (ipObject.extension) {
                ipObject.extension.connection.close();
                ipObject.extension.verified = false;
            }
        } else if (ipObject.site) {
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

    con.on("message", (message) => wsMessage(message, conObj, ipObject));
    con.on("close", (reasonCode, description) => {
        console.log((new Date()) + " Peer " + con.remoteAddress + " disconnected.");
    });
};

/**
 * Sends a message to the websocket connection of the user.
 */
export function sendMessage(uuid: string, msg: object, extension = false, excludeIp?: string): void {
    if (!Object.keys(msg).length) {
        return;
    }
    const data = JSON.stringify(msg);
    const ipMap = connections.get(uuid);

    // todo for now an connection ignores all message until it is verified, make a messageQueue?
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
            console.log("sending to site: ", uuid, msg);
            conObject.site.connection.sendUTF(data);
        }
        if (conObject.extension && conObject.extension.verified) {
            console.log("sending to extension: ", uuid, msg);
            conObject.extension.connection.sendUTF(data);
        }
    }
}

/**
 * Sends a news message to all websocket connections
 * whose users the news are relevant for.
 */
export function broadCastNews(msg: News | News[]): void {
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
                    .checkUnread(conObject.extension.uuid)
                    .then((unread) => {
                        const unreadData = JSON.stringify({unread});
                        conObject.extension.connection.sendUTF(unreadData);
                    })
                    .catch(console.log);
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


