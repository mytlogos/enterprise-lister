/**
 *
 */
class WebSocketClient {
    constructor() {
        // allow this client only in browser environment and only once
        this.offline = false;
        this.started = null;
        this.eventMap = new Map();
    }
    /***
     *  Starts the WebSocket to the server of this
     *  Extension.
     *  Throws Error if client is offline.
     *
     * @return {Promise<void>}
     */
    startPush() {
        return (this.started = new Promise((resolve) => {
            if (this.offline) {
                throw Error("please verify that server is online");
            }
            // for now opens webSocket without tls
            this.socket = new WebSocket("ws://localhost:3000/");
            this.socket.onmessage = (event) => this.pushed(event);
            this.socket.onopen = () => resolve();
        }));
    }
    /***
     * Pushes a Message to the Server after converting it to JSON.
     *
     * @param message message to be stringified to JSON
     */
    push(message) {
        if (!this.socket || !this.started) {
            throw Error("webSocket is not active while trying to send message");
        }
        this.started.then(() => this.socket && this.socket.send(JSON.stringify(message)));
    }
    /***
     * Dispatches Events extracted from the message of the server.
     */
    pushed(event) {
        let data;
        // todo only return if parsing failed or log an error msg
        try {
            data = JSON.parse(event.data);
        }
        catch (e) {
            return;
        }
        if (!data) {
            return;
        }
        for (const key of Object.keys(data)) {
            // emit events if it is any of the valid events
            if (events.any(key)) {
                const msg = data[key];
                console.log("dispatched ", key, msg);
                const handler = this.eventMap.get(key);
                if (!handler) {
                    continue;
                }
                handler.forEach((callback) => callback(msg));
            }
        }
    }
    /**
     *
     */
    addEventListener(type, listener) {
        if (!events.any(type)) {
            throw Error("unknown event: " + type);
        }
        if (typeof listener !== "function") {
            throw Error("no callback provided!");
        }
        let handler = this.eventMap.get(type);
        if (!handler) {
            this.eventMap.set(type, (handler = []));
        }
        handler.push(listener);
    }
    /***
     * Closes the WebSocket and removes it from this client.
     *
     * @return {void}
     */
    close() {
        if (this.socket) {
            this.socket.close();
        }
        this.socket = undefined;
    }
}
export const WSClient = new WebSocketClient();
/**
 * Possible Events for this Clients.
 */
export const events = {
    ADD: "add",
    DELETE: "remove",
    UPDATE: "update",
    NEWS: "news",
    any(type) {
        for (const key of Object.keys(this)) {
            // @ts-ignore
            const event = this[key];
            if (event === type && typeof event !== "function") {
                return true;
            }
        }
        return false;
    },
};
//# sourceMappingURL=WebsocketClient.js.map