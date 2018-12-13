/**
 *
 * @type {Router}
 * @property {function} router.get
 * @property {function} router.post
 * @property {function} router.use
 * @property {function} router.route
 */
const Router = require("express").Router;
const UserApi = require("./userMiddleware");

/**
 *  Returns the Router for the User Api.
 *  @return {Router} user api router
 */
module.exports = function apiRouter() {
    const apiRouter = Router();
    //check if an user is logged in for ip
    apiRouter.get("", UserApi.checkLogin);

    //login a user
    apiRouter.post("/login", UserApi.login);

    //register a new user
    apiRouter.post("/register", UserApi.register);

    apiRouter.use("/user", userRouter);

    return apiRouter;
};

/**
 * Creates the User Api Router.
 *
 * @return {Router} router of the user api
 */
function userRouter() {
    const userRouter = Router();

    //authenticate user, every route and middleware
    //after this middleware should be protected with this now
    userRouter.use(UserApi.authenticate);

    UserApi.addUserApi(userRouter);

    userRouter.post("/logout", UserApi.logout);
    userRouter.get("/lists", UserApi.getLists);

    userRouter.use("/medium", mediumRouter());

    userRouter.use("/list", listRouter());

    UserApi.addSuggestionsRoute(userRouter.route("/suggestion"));

    userRouter.use("/externalUser", externalUserRouter());

    return userRouter;
}

/**
 * Creates the List API Router.
 *
 * @return {Router} router of the medium api
 */
function listRouter() {
    const router = Router();

    UserApi.addListMediumRoute(router.route("/medium"));
    UserApi.addListApi(router);

    return router;
}

/**
 * Creates the ExternalUser API Router.
 * Adds the ExternalList Api to the ExternalUser Api.
 *
 * @return {Router} router of the medium api
 */
function externalUserRouter() {
    const router = Router();

    UserApi.addExternalUserApi(router);
    router.use("/externalList", externalListRouter());

    return router;
}

/**
 * Creates the ExternalList API Router.
 *
 * @return {Router} router of the medium api
 */
function externalListRouter() {
    const router = Router();

    UserApi.addExternalListRoute(router);
    UserApi.addExternalListMediumApi(router.route("/medium"));

    return router;
}

/**
 * Creates the Medium API Router.
 * Adds the Part Api to the Medium Api.
 *
 * @return {Router} router of the medium api
 */
function mediumRouter() {
    let router = Router();

    UserApi.addMediumRoute(router);
    router.use("/part", partRouter());
    UserApi.addProgressRoute(router.route("/progress"));

    return router;
}

/**
 * Creates the Part Api Router.
 * Adds the Episode Api Route to the Part Api Router.
 *
 * @return {Router} router of the part api
 */
function partRouter() {
    let router = Router();

    UserApi.addPartRoute(router);
    UserApi.addEpisodeRoute(router.route("/episode"));

    return router;
}