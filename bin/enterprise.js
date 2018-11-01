const Storage = require("./database").Storage;
const Errors = require("./database").Errors;
const validator = require("validator");

const Enterprise = {

    /**
     *
     * @param {string} origin
     * @return {boolean}
     */
    originIsAllowed(origin) {
        // put logic here to detect whether the specified origin is allowed.
        return true;
    },

    /**
     *
     * @param {Object} msg
     * @param {*} response
     */
    wsMessage(msg, response) {
        if (msg.type === 'utf8') {
            console.log('Received Message: ' + msg.utf8Data);
            response.sendUTF(msg.utf8Data);
        }
    },
};
module.exports = Enterprise;