import { Router } from "express";
import { createHandler } from "./apiTools";
import env from "enterprise-core/dist/env";
import logger from "enterprise-core/dist/logger";
import Websocket from "ws";
import request from "enterprise-scraper/dist/externals/request";

const getJobs = createHandler(() => {
  return request.getJson({ url: "http://" + env.crawlerHost + ":" + env.crawlerPort + "/" });
});

const liveSockets = [] as Websocket[];

function setWSListener(src: Websocket, target: Websocket) {
  src.onmessage = (event) => {
    if (target.readyState === target.OPEN) {
      target.send(event.data);
    }
  };
  src.onclose = (ev) => {
    if (target.readyState !== target.CLOSED && target.readyState !== target.CLOSING) {
      // status code "CLOSE_NORMAL" see https://kapeli.com/cheat_sheets/WebSocket_Status_Codes.docset/Contents/Resources/Documents/index
      target.close(1000, ev.reason);
    }
    const index = liveSockets.indexOf(src);

    if (index >= 0) {
      liveSockets.splice(index, 1);
    }
  };
  src.onerror = (ev) => logger.error(ev.message);
  target.onerror = (ev) => logger.error(ev.message);
}

export function crawlerRouter(): Router {
  const router = Router();
  router.get("/jobs", getJobs);
  router.ws("/live", (ws) => {
    const crawlerSocket = new Websocket("ws://" + env.crawlerHost + ":" + env.crawlerWSPort);
    setWSListener(crawlerSocket, ws);
    setWSListener(ws, crawlerSocket);
    liveSockets.push(crawlerSocket);
  });
  return router;
}
