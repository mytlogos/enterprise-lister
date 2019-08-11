import diagram from "dgram";
import {isString} from "./tools";
import env from "./env";

const PORT = 3001;

const server = diagram.createSocket("udp4");

server.on("listening", () => {
    const address = server.address();
    server.setBroadcast(true);
    if (isString(address)) {
        console.log("is String");
        console.log("UDP Server listening on " + address);
    } else {
        console.log("UDP Server listening on " + address.address + ":" + address.port);
    }
});

server.on("message", (message, remote) => {
    if (!message) {
        return;
    }
    const decoded = message.toString();
    if ("DISCOVER_SERVER_REQUEST_ENTERPRISE" === decoded) {
        console.log(`server was discovered in ${env.development} and ${process.env.NODE_ENV}`);
        const response = "ENTERPRISE_" + (env.development ? "DEV" : "PROD");
        const buffer = Buffer.from(response);
        const client = diagram.createSocket("udp4");
        client.send(buffer, 0, message.length, remote.port, remote.address, (err, bytes) => {
            if (err) {
                throw err;
            }
            console.log(`UDP message '${buffer.toString()}' sent to ${remote.address}:${remote.port}`);
            client.close();
        });
    }
    console.log(remote.address + ":" + remote.port + " - " + message);
});

server.bind(PORT);
