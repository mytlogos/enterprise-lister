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
module.exports.addListApi = route => {
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
module.exports.addPartRoute = function addPartRoute(route) {
    route.get((req, res) => {
        let {mediumId} = req.body;
        sendResult(res, Storage.getParts(mediumId));
    });
    route.post((req, res) => {
        let {part, mediumId} = req.body;
        sendResult(res, Storage.addPart(mediumId, part));
    });
    route.put((req, res) => {
        let {part} = req.body;
        sendResult(res, Storage.updatePart(part));
    });
    route.delete((req, res) => {
        let {partId} = req.body;
        sendResult(res, Storage.deletePart(partId));
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
module.exports.addEpisodeRoute = function addEpisodeRoute(route) {
    route.get((req, res) => {
        let {episodeId} = req.body;
        sendResult(res, Storage.getEpisode(episodeId));
    });
    route.post((req, res) => {
        let {medium, partId} = req.body;
        sendResult(res, Storage.addEpisode(partId, medium));
    });
    route.put((req, res) => {
        let {episode} = req.body;
        sendResult(res, Storage.updateEpisode(episode));
    });
    route.delete((req, res) => {
        let {episodeId} = req.body;
        sendResult(res, Storage.deletePart(episodeId));
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
module.exports.addExternalListRoute = function addExternalListRoute(route) {
    route.get((req, res) => {
        let {externalListId} = req.body;
        sendResult(res, Storage.getExternalList(externalListId));
    });
    route.post((req, res) => {
        let {uuid, externalList} = req.body;
        sendResult(res, Storage.addExternalList(uuid, externalList));
    });
    route.put((req, res) => {
        let {externalList} = req.body;
        sendResult(res, Storage.updateList(externalList));
    });
    route.delete((req, res) => {
        let {externalListId, uuid} = req.body;
        sendResult(res, Storage.deleteList(externalListId, uuid));
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
module.exports.addExternalUserApi = function addExternalUserApi(route) {
    route.get((req, res) => {
        let {externalUuid} = req.body;
        sendResult(res, Storage.getExternalUser(externalUuid));
    });
    route.post((req, res) => {
        let {uuid, externalUser} = req.body;
        sendResult(res, Storage.addExternalUser(uuid, externalUser));
    });
    route.delete((req, res) => {
        let {externalUuid} = req.body;
        sendResult(res, Storage.deleteExternalUser(externalUuid));
    });
};

/**
 *
 * @param {Router} router
 * @param {function} router.get
 * @param {function} router.post
 * @param {function} router.put
 * @param {function} router.delete
 */
module.exports.addUserApi = function addEpisodeRoute(router) {
    router.put((req, res) => {
        let {uuid, user} = req.body;
        sendResult(res, Storage.updateUser(uuid, user));
    });
    router.delete((req, res) => {
        let {uuid} = req.body;
        sendResult(res, Storage.deleteUser(uuid));
    });
};

/**
 *
 * @param {Router} router
 * @param {function} router.get
 * @param {function} router.post
 * @param {function} router.put
 * @param {function} router.delete
 */
module.exports.addProgressRoute = function addProgressRoute(router) {
    router.get((req, res) => {
        let {uuid, episodeId} = req.body;
        sendResult(res, Storage.getProgress(uuid, episodeId));
    });
    router.post((req, res) => {
        let {uuid, episode_id, progress} = req.body;
        sendResult(res, Storage.addProgress(uuid, episode_id, progress));
    });
    router.put((req, res) => {
        let {uuid, episode_id, progress} = req.body;
        sendResult(res, Storage.updateProgress(uuid, episode_id, progress));
    });
    router.delete((req, res) => {
        let {uuid, episode_id} = req.body;
        sendResult(res, Storage.removeProgress(uuid, episode_id));
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

module.exports.addSuggestionsRoute = function getLists(req, res) {
    //todo implement suggestions api for auto complete
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