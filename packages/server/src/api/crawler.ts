import { Router } from "express";
import request from "request";
import { createHandler } from "./apiTools";
import env from "enterprise-core/dist/env";
import Websocket from "ws";

const getJobs = createHandler(() => {
  return request.get("http://" + env.crawlerHost + ":3000/");
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
      target.close(ev.code, ev.reason);
    }
    const index = liveSockets.indexOf(src);

    if (index >= 0) {
      liveSockets.splice(index, 1);
    }
  };
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
