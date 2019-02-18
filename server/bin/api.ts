import {Handler, Request, Response, Router} from "express";
import * as UserApi from "./userMiddleware";
import {NextFunction} from "express-serve-static-core";

/**
 *  Returns the Router for the User Api.
 *  @return {Router} user api router
 */
export function apiRouter() {
    const router = Router();
    // check if an user is logged in for ip
    router.get("", UserApi.checkLogin);

    // login a user
    router.post("/login", UserApi.login);

    // register a new user
    router.post("/register", UserApi.register);
    router.use("/user", userRouter());

    return router;
}

/**
 * Creates the User Api Router.
 */
function userRouter(): Router {
    const router = Router();

    // authenticate user, every route and middleware
    // after this middleware should be protected with this now
    router.use(UserApi.authenticate);

    // @ts-ignore
    UserApi.addUserApi(router);

    router.post("/logout", UserApi.logout);
    router.get("/lists", UserApi.getLists);
    router.get("/news", UserApi.getNews);

    router.use("/medium", mediumRouter());
    router.use("/list", listRouter());
    router.use("/process", processRouter());

    UserApi.addExternalUserApi(router.route("/externalUser"));
    UserApi.addSuggestionsRoute(router.route("/suggestion"));
    return router;
}

/**
 * Creates the List API Router.
 */
function listRouter(): Router {
    const router = Router();

    UserApi.addListMediumRoute(router.route("/medium"));
    // @ts-ignore
    UserApi.addListApi(router);

    return router;
}

function processRouter(): Router {
    const router = Router();
    router.use(stopper);
    router.post("/result", UserApi.processResult);
    return router;
}

/**
 * Creates the Medium API Router.
 * Adds the Part Api to the Medium Api.
 */
function mediumRouter(): Router {
    const router = Router();

    router.use("/part", partRouter());

    // router does not route correctly if i use get etc.
    // on router directly, need to use empty route for that?
    UserApi.addMediumApi(router.route(""));
    UserApi.addProgressRoute(router.route("/progress"));

    return router;
}

/**
 * Creates the Part Api Router.
 * Adds the Episode Api Route to the Part Api Router.
 */
function partRouter(): Router {
    const router = Router();

    // @ts-ignore
    UserApi.addPartRoute(router);
    UserApi.addEpisodeRoute(router.route("/episode"));

    return router;
}

function stopper(req: Request, res: Response, next: NextFunction): any {
    return next();
}
