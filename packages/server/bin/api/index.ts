import { userStorage } from "enterprise-core/dist/database/storages/storage";
import env from "../env";
import { Errors, isString } from "enterprise-core/dist/tools";
import { getTunnelUrls } from "../tunnel";
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
 * @openapi
 * tags:
 *  name: Base
 *  description: API without authentication restriction
 */

/**
 *  Returns the Router for the User Api.
 *  @return {Router} user api router
 */
export function apiRouter(): Router {
  const router = Router();

  /**
   * @openapi
   * /api:
   *    get:
   *      tags: [Base]
   *      description: Check if an user is logged in for ip
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/SimpleUser"
   *          description: true if logged in, else false
   */
  router.get("", checkLogin);

  /**
   * @openapi
   * /api/tunnel:
   *    get:
   *      tags: [Base]
   *      description: Get the current active Tunnels
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: array
   *                items:
   *                  type: string
   *          description: Tunnel Array
   */
  router.get("/tunnel", getTunnel);

  /**
   * @openapi
   * /api/dev:
   *    get:
   *      tags: [Base]
   *      description: Check if the program mode
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: boolean
   *          description: true if the server is in development mode
   */
  router.get("/dev", getDev);

  /**
   * @openapi
   * /api/login:
   *    post:
   *      tags: [Base]
   *      description: login a user
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/User"
   *          description: the user
   */
  router.post("/login", login);

  /**
   * @openapi
   * /api/register:
   *    post:
   *      tags: [Base]
   *      description: register a new user
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/User"
   *          description: the user
   */
  router.post("/register", register);
  router.use("/user", userRouter());

  return router;
}
