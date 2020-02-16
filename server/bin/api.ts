import {Request, Response, Router} from "express";
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
    router.get("/tunnel", UserApi.getTunnel);
    router.get("/dev", UserApi.getDev);

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

    const userRoute = router.route("");

    // check if an user is logged in for ip
    userRoute.get(UserApi.getUser);
    userRoute.put(UserApi.putUser);
    userRoute.delete(UserApi.deleteUser);

    router.post("/logout", UserApi.logout);
    router.get("/lists", UserApi.getLists);
    router.get("/invalidated", UserApi.getInvalidated);
    router.post("/bookmarked", UserApi.addBookmarked);
    router.post("/toc", UserApi.addToc);
    router.get("/search", UserApi.search);
    router.get("/stats", UserApi.getStats);
    router.get("/new", UserApi.getNew);
    router.get("/download", UserApi.downloadEpisode);
    router.use("/medium", mediumRouter());

    router.use("/news", newsRouter());
    router.use("/list", listRouter());
    router.use("/process", processRouter());
    router.use("/externalUser", externalUserRouter());

    return router;
}

function newsRouter() {
    const router = Router();
    router.post("/read", UserApi.readNews);
    // TODO: 30.06.2019 get Request does not want to work
    // TODO: 21.07.2019 update: testing this with intellij rest client does seem to work
    //  now is just needs to tested with the normal clients e.g. website and android app
    router.get("", UserApi.getNews);
    router.use(stopper);
    return router;
}

function externalUserRouter() {
    const router = Router();
    router.get("/refresh", UserApi.refreshExternalUser);
    const externalUserRoute = router.route("");
    externalUserRoute.get(UserApi.getExternalUser);
    externalUserRoute.post(UserApi.postExternalUser);
    externalUserRoute.delete(UserApi.deleteExternalUser);
    return router;
}

/**
 * Creates the List API Router.
 */
function listRouter(): Router {
    const router = Router();

    const listMediumRoute = router.route("/medium");
    listMediumRoute.get(UserApi.getListMedium);
    listMediumRoute.post(UserApi.postListMedium);
    listMediumRoute.put(UserApi.putListMedium);
    listMediumRoute.delete(UserApi.deleteListMedium);

    const listRoute = router.route("");
    listRoute.get(UserApi.getList);
    listRoute.post(UserApi.postList);
    listRoute.put(UserApi.putList);
    listRoute.delete(UserApi.deleteList);

    return router;
}

function processRouter(): Router {
    const router = Router();
    router.post("/result", UserApi.processResult);
    router.post("/read", UserApi.processReadEpisode);
    router.post("/progress", UserApi.processProgress);
    return router;
}

/**
 * Creates the Medium API Router.
 * Adds the Part Api to the Medium Api.
 */
function mediumRouter(): Router {
    const router = Router();

    router.get("/unused", UserApi.getUnusedMedia);
    router.get("/all", UserApi.getAllMedia);
    router.put("/unused", UserApi.putConsumeUnusedMedia);
    router.post("/create", UserApi.postCreateFromUnusedMedia);
    router.use("/part", partRouter());

    const mediumRoute = router.route("");
    mediumRoute.get(UserApi.getMedium);
    mediumRoute.post(UserApi.postMedium);
    mediumRoute.put(UserApi.putMedium);

    const progressRoute = router.route("/progress");
    progressRoute.get(UserApi.getProgress);
    progressRoute.post(UserApi.postProgress);
    progressRoute.put(UserApi.putProgress);
    progressRoute.delete(UserApi.deleteProgress);

    return router;
}

function episodeRouter() {
    const router = Router();

    const episodeRoute = router.route("");
    episodeRoute.get(UserApi.getEpisode);
    episodeRoute.post(UserApi.postEpisode);
    episodeRoute.put(UserApi.putEpisode);
    episodeRoute.delete(UserApi.deleteEpisode);
    return router;
}

/**
 * Creates the Part Api Router.
 * Adds the Episode Api Route to the Part Api Router.
 */
function partRouter(): Router {
    const router = Router();

    router.use("/episode", episodeRouter());

    const partRoute = router.route("");
    partRoute.get(UserApi.getPart);
    partRoute.post(UserApi.postPart);
    partRoute.put(UserApi.putPart);
    partRoute.delete(UserApi.deletePart);
    router.get("/items", UserApi.getPartItems);
    router.get("/releases", UserApi.getPartReleases);

    return router;
}

function stopper(req: Request, res: Response, next: NextFunction): any {
    return next();
}
