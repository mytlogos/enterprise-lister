import { ChannelMessage, WSRequest } from "enterprise-scraper/dist/externals/types";

let socket: WebSocket | null = null;
// correct mapping of WSEventListener is not yet known/possible
const listenerMap = new Map<EventType, Set<WSEventListener<any>>>();
const wsListenerMap = new Map<WSEventType, Set<() => void>>();

function createSocket() {
  socket = new WebSocket("ws://localhost:3004");
  // remove socket on close
  socket.onclose = () => {
    socket = null;
    wsListenerMap.get("disconnected")?.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        console.error(error);
      }
    });
  };
  socket.onmessage = (event) => {
    const data = event.data;
    if (typeof data !== "string") {
      console.warn("Expected a Message of type string ");
      return;
    }
    const message = JSON.parse(data) as ChannelMessage;

    const listeners = listenerMap.get(message.messageType);

    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(message);
        } catch (error) {
          console.error(error);
        }
      }
    }
  };
  socket.addEventListener("open", () => {
    wsListenerMap.get("connected")?.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        console.error(error);
      }
    });
  });
}

function checkSocket() {
  if (listenerMap.size && !socket) {
    createSocket();
    return;
  }
  if (!listenerMap.size && socket) {
    socket.close();
  }
}

async function sendMessage(message: string) {
  if (!socket) {
    return;
  }
  if (socket.readyState === socket.CONNECTING) {
    await new Promise<void>((resolve) => {
      if (!socket) {
        return;
      }
      socket.addEventListener("open", () => resolve());
    });
    socket.send(message);
  } else if (socket.readyState === socket.OPEN) {
    socket.send(message);
  } else {
    throw Error("Invalid Socket state, neither open nor connecting: " + socket.readyState);
  }
}

type findByType<Union, Type> = Union extends { messageType: Type } ? Union : never;
type EventType = ChannelMessage["messageType"];
type WSEventType = "disconnected" | "connected";

export type WSEventListener<T extends EventType> = (msg: findByType<ChannelMessage, T>) => void;

interface WebSocketClient {
  addEventListener<T extends EventType>(event: T, listener: WSEventListener<T>): void;
  addEventListener<T extends WSEventType>(event: T, listener: () => void): void;

  removeEventListener<T extends EventType>(event: T, listener: WSEventListener<T>): void;
  removeEventListener<T extends WSEventType>(event: T, listener: () => void): void;

  send(message: WSRequest | Record<string, unknown>): void;

  connect(): void;

  readonly isConnected: boolean;
}

/**
 * An Interface for a websocket to the Crawler.
 * The socket is only active if at least on listener is registered.
 */
export default {
  get isConnected(): boolean {
    return socket !== null;
  },

  addEventListener(event: WSEventType | EventType, listener: (...args: any[]) => void): void {
    if (event === "connected" || event === "disconnected") {
      const listeners = wsListenerMap.get(event);
      if (!listeners) {
        wsListenerMap.set(event, new Set([listener]));
      } else {
        listeners.add(listener);
      }
      return;
    }
    const listeners = listenerMap.get(event);

    if (!listeners) {
      listenerMap.set(event, new Set([listener]));
    } else {
      listeners.add(listener);
    }
    checkSocket();
  },
  removeEventListener(event: WSEventType | EventType, listener: (...args: any[]) => void): void {
    if (event === "connected" || event === "disconnected") {
      const listeners = wsListenerMap.get(event);
      listeners?.delete(listener);

      if (listeners && !listeners.size) {
        wsListenerMap.delete(event);
      }
      return;
    }
    const listeners = listenerMap.get(event);
    listeners?.delete(listener);

    if (listeners && !listeners.size) {
      listenerMap.delete(event);
    }
    checkSocket();
  },
  send(message: WSRequest | Record<string, unknown>): void {
    if (!listenerMap.size) {
      throw Error("Error: Called send(*) without having any WSEventListener registered!");
    }
    if (!socket) {
      throw new Error("No WebSocket initialized!");
    }
    sendMessage(typeof message === "object" ? JSON.stringify(message) : message).catch(console.error);
  },
  connect() {
    if (!listenerMap.size) {
      throw Error("Error: Called connect(*) without having any WSEventListener registered!");
    }
    checkSocket();
  },
} as WebSocketClient;
