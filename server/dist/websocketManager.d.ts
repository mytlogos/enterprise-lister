import { request } from "websocket";
import { MultiSingle, News } from "./types";
/**
 * Accepts a connection for websocket for a user/ip if the origin is valid.
 *
 * @param req
 */
export declare const requestHandler: (req: request) => Promise<void>;
/**
 * Sends a message to the websocket connection of the user.
 */
export declare function sendMessage(uuid: string, msg: object, extension?: boolean, excludeIp?: string): void;
/**
 * Sends a news message to all websocket connections
 * whose users the news are relevant for.
 */
export declare function broadCastNews(msg: MultiSingle<News>): void;
export declare function markLoggedOut(uuid: string, ip: string): void;
