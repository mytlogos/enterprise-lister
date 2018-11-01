const UserApi = require("./userMiddleware");

/**
 * @callback Middleware
 */

/**
 *
 * @param {Router} router
 * @param {function} router.get
 * @param {function} router.post
 * @param {function} router.use
 * @param {function} router.route
 */
module.exports = function setupApi(router) {
    //check if an user is logged in for ip
    router.get("", UserApi.checkLogin);

    //login a user
    router.post("/login", UserApi.login);

    //register a new user
    router.post("/register", UserApi.register);

    //authenticate user, every route and middleware
    //after this middleware should be protected with this now
    router.use(UserApi.authenticate);

    router.post("/logout", UserApi.logout);
    router.get("/lists", UserApi.getLists);

    UserApi.addMediumRoute(router.route("/medium"));
    UserApi.addListMediumRoute(router.route("/list/medium"));
    UserApi.addListRoute(router.route("/list"));

    return router;
};