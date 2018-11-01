const database = require("./database");
const Storage = database.Storage;
const Errors = database.Errors;
const isErrorCode = database.isError;

module.exports.checkLogin = function checkLogin(req, res) {
    sendResult(res, Storage.userLoginStatus(req.ip));
};

module.exports.login = function login(req, res) {
    let {userName, pw} = req.body;
    sendResult(res, Storage.loginUser(userName, pw, req.ip));
};

module.exports.register = function register(req, res) {
    let {userName, pw} = req.body;
    sendResult(res, Storage.register(userName, pw, req.ip));
};

module.exports.logout = function logout(req, res) {
    let {uuid} = req.body;
    sendResult(res, Storage.logoutUser(uuid, req.ip));
};

/**
 *
 * @param {Route} route
 * @param {function} route.get
 * @param {function} route.post
 * @param {function} route.put
 * @param {function} route.delete
 */
module.exports.addListRoute = route => {
    route.get((req, res) => {
        let {listId} = req.body;
        sendResult(res, Storage.getList(listId));
    });
    route.post((req, res) => {
        let {uuid, list: list} = req.body;
        sendResult(res, Storage.addList(uuid, list));
    });
    route.put((req, res) => {
        let {list} = req.body;
        sendResult(res, Storage.updateList(list));
    });
    route.delete((req, res) => {
        let {listId, uuid} = req.body;
        sendResult(res, Storage.deleteList(listId, uuid));
    });
};

/**
 *
 * @param {Route} route
 * @param {function} route.get
 * @param {function} route.post
 * @param {function} route.put
 * @param {function} route.delete
 */
module.exports.addListMediumRoute = function addListMediumRoute(route) {
    route.get((req, res) => {
        let {listId, media} = req.body;

        let listPromise = Storage
            .getList(listId)
            .then(list => list.items.filter(value => media.includes(value.id)));

        sendResult(res, listPromise);
    });
    route.post((req, res) => {
        let {listId, mediumId} = req.body;
        sendResult(res, Storage.addItemToList(listId, mediumId));
    });
    route.put((req, res) => {
        let {oldListId, newListId, mediumId} = req.body;
        sendResult(res, Storage.moveMedium(oldListId, newListId, mediumId));
    });
    route.delete((req, res) => {
        let {listId, mediumId} = req.body;
        sendResult(res, Storage.removeMedium(listId, mediumId));
    });
};

/**
 *
 * @param {Route} route
 * @param {function} route.get
 * @param {function} route.post
 * @param {function} route.put
 * @param {function} route.delete
 */
module.exports.addMediumRoute = function addMediumRoute(route) {
    route.get((req, res) => {
        let {mediumId} = req.body;
        sendResult(res, Storage.getMedium(mediumId));
    });
    route.post((req, res) => {
        let {uuid, medium} = req.body;
        sendResult(res, Storage.addMedium(uuid, medium));
    });
    route.put((req, res) => {
        let {medium} = req.body;
        sendResult(res, Storage.updateMedium(medium));
    });
};

module.exports.getLists = function getLists(req, res) {
    let {uuid} = req.body;
    sendResult(res, Storage.getUserLists(uuid));
};

module.exports.authenticate = function authenticate(req, res, next) {
    let {uuid, session} = req.body;

    Storage
        .userLoginStatus(req.ip)
        .then(result => {
            if (session === result.session && uuid === result.uuid) {
                next();
            } else {
                res.status(500).json({error: Errors.INVALID_SESSION});
            }
        })
        .catch(error => res.status(500).json({error: isErrorCode(error) ? error : Errors.INVALID_MESSAGE}));
};

/**
 *
 * @param res
 * @param {Promise<*>} promise
 */
function sendResult(res, promise) {
    promise.then(result => res.json(result))
        .catch(error => res.status(500)
            .json({error: isErrorCode(error) ? error : Errors.INVALID_MESSAGE}));
}