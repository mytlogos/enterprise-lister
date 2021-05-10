import { userStorage } from "bin/database/storages/storage";
import env from "bin/env";
import { Errors, isString } from "bin/tools";
import { getTunnelUrls } from "bin/tunnel";
import { Handler, Router } from "express";
import { sendResult } from "./apiTools";
import { userRouter } from "./user";

const checkLogin: Handler = (req, res) => {
  sendResult(res, userStorage.loggedInUser(req.ip));
};

const login: Handler = (req, res) => {
  const { userName, pw } = req.body;

  if (!userName || !isString(userName) || !pw || !isString(pw)) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }
  sendResult(res, userStorage.loginUser(userName, pw, req.ip));
};

const register: Handler = (req, res) => {
  const { userName, pw } = req.body;

  if (!userName || !isString(userName) || !pw || !isString(pw)) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }
  sendResult(res, userStorage.register(userName, pw, req.ip));
};

const getTunnel: Handler = (_req, res) => {
  sendResult(res, Promise.resolve(getTunnelUrls()));
};

const getDev: Handler = (_req, res) => {
  sendResult(res, Promise.resolve(Boolean(env.development)));
};

/**
 *  Returns the Router for the User Api.
 *  @return {Router} user api router
 */
export function apiRouter(): Router {
  const router = Router();
  // check if an user is logged in for ip
  router.get("", checkLogin);
  router.get("/tunnel", getTunnel);
  router.get("/dev", getDev);

  // login a user
  router.post("/login", login);

  // register a new user
  router.post("/register", register);
  router.use("/user", userRouter());

  return router;
}
