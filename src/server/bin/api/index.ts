import { userStorage } from "bin/database/storages/storage";
import env from "bin/env";
import { Errors, isString } from "bin/tools";
import { getTunnelUrls } from "bin/tunnel";
import { Router } from "express";
import { createHandler } from "./apiTools";
import { userRouter } from "./user";

const checkLogin = createHandler((req) => {
  return userStorage.loggedInUser(req.ip);
});

const login = createHandler((req) => {
  const { userName, pw } = req.body;

  if (!userName || !isString(userName) || !pw || !isString(pw)) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  return userStorage.loginUser(userName, pw, req.ip);
});

const register = createHandler((req) => {
  const { userName, pw } = req.body;

  if (!userName || !isString(userName) || !pw || !isString(pw)) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  return userStorage.register(userName, pw, req.ip);
});

const getTunnel = createHandler(() => {
  return Promise.resolve(getTunnelUrls());
});

const getDev = createHandler(() => {
  return Promise.resolve(Boolean(env.development));
});

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
