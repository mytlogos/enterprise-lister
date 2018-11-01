const Storage = require("./database");
const assert = require("assert");

let credentials = ["ha", "frank", "192.162.1"];
let [user, password, ip] = credentials;

/*Storage.start()
    .then(() => Storage.register(...credentials))
    .then(uuid_session => {
        return Storage.showUser().then(result => console.log("current:", result))
            .then(() => Storage.userLoginStatus(credentials[2])
                .then(result => console.log("status: ", result))
                .then(() => uuid_session));
    })
    .catch(error => console.log(error))
    .then(() => Storage.loginUser(...credentials))
    .then(uuid_session => {
        return Storage.showUser()
            .then(result => console.log("current:", result))
            .then(() => Storage.userLoginStatus(credentials[2]))
            .then(result => console.log("status: ", result))
            .then(() => Storage.deleteUser(uuid_session.uuid))
            .then(result => console.log("delete acc: ", result));
    })
    .then(() => Storage.register(...credentials))
    .then(uuid_session => Storage.addList(uuid_session.uuid, {name: "Kafefe", medium: 1}))
    .catch(error => console.log("error: ", error))
    .finally(() => Storage.stop());*/

let uuid;
let session;

function isString(value) {
    return typeof value === 'string' || value instanceof String;
}

function testRegister() {
    return Storage.register(...credentials).then(uuid_session => {
        ({uuid, session} = uuid_session);

        assert.strictEqual(isString(uuid), true);
        assert.strictEqual(isString(session), true);
    })
}

function testLogStatus(logged) {
    return Storage.userLoginStatus(ip).then(uuid_session => {
        let {uuid: uuid2, session: session2} = uuid_session;

        if (logged) {
            assert.strictEqual(uuid, uuid2);
            assert.strictEqual(session, session2);
        } else {
            assert.strictEqual(uuid2, undefined);
            assert.strictEqual(session2, undefined);
        }
    });
}

function testLogout() {
    return Storage.logoutUser(uuid, ip).then(logged_out => {
        assert.strictEqual(logged_out, true);
    });
}

function testLogin() {
    return Storage.loginUser(...credentials).then(uuid_session => {
        ({uuid, session} = uuid_session);

        assert.strictEqual(isString(uuid), true);
        assert.strictEqual(isString(session), true);
    })
}

function testList() {
    let list = {name: "Reading", medium: 1};
    let updated = {name: "Paused", medium: 2};

    return Storage.addList(uuid, list).then(storage_list => {
        let id = storage_list.id;
        assert.strictEqual(isFinite(id), true);
        assert.strictEqual(id >= 0, true);

        updated.id = list.id = id;
    })
        .then(() => Storage.getList(list.id))
        .then(list => {
            console.log(list);
        });
}

function testDeleteUser() {
    return Storage.deleteUser(uuid).then(deleted => {
        assert.strictEqual(deleted, true);
    });
}


(function test() {
    let tests = [
        Storage.clear,
        Storage.start,
        testRegister,
        () => testLogStatus(true),
        testLogout,
        () => testLogStatus(false),
        testLogin,
        testList,
        testDeleteUser,
    ];

    let testChain = Promise.resolve();

    let index = 0;

    for (let testElement of tests) {
        let current = index++;

        testChain = testChain
            .then(testElement)
            .catch(error => console.log(`failed function number ${current}: ${testElement.name}`, error) && error);
    }

    testChain
        .then(() => console.log("all is well!"))
        .catch(error => assert.fail(error))
        .finally(Storage.stop)
        .catch(error => console.log("still an error on end", error));

    /*Storage.clear()
        .catch(error => console.log("failed0", error) && error)
        .then(() => Storage.start())
        .catch(error => console.log("failed1", error) && error)
        .then(() => testRegister())
        .catch(error => console.log("failed2", error) && error)
        .then(() => testLogStatus(true))
        .catch(error => console.log("failed3", error) && error)
        .then(() => testLogout())
        .catch(error => console.log("failed4", error) && error)
        .then(() => testLogStatus(false))
        .catch(error => console.log("failed5", error) && error)
        .then(() => testLogin())
        .catch(error => console.log("failed6", error) && error)
        .then(() => testDeleteUser())
        .catch(error => assert.fail(error))
        .finally(() => Storage.stop()
            .catch(error => console.log("he! ", error)));*/
})();