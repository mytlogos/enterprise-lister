const Storage = {};

const Enterprise = {

    originIsAllowed(origin) {
        // put logic here to detect whether the specified origin is allowed.
        return true;
    },

    wsMessage(msg, con) {
        if (msg.type === 'utf8') {
            console.log('Received Message: ' + msg.utf8Data);
            con.sendUTF(msg.utf8Data);
        }
    },

    httpMessage(msg, con) {
        if (msg.type === 'utf8') {
            console.log('Received Message: ' + msg.utf8Data);
            con.sendUTF(msg.utf8Data);
        }
    }

};
module.exports = Enterprise;