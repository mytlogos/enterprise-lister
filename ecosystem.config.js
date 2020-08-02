module.exports = {
    apps: [
        {
            name: "enterprise-server",
            script: "server/dist/startServer.js",
            instances: 1,
            max_restarts: 5,
            exec_mode: "fork",
            autorestart: true,
            max_memory_restart: "200M",
            watch: false,
            env: {
                NODE_APP_NAME: "enterprise-server"
            }
        },
        {
            name: "enterprise-crawler",
            script: "server/dist/startCrawler.js",
            max_restarts: 5,
            instances: 1,
            exec_mode: "fork",
            autorestart: true,
            max_memory_restart: "300M",
            watch: false,
            env: {
                NODE_APP_NAME: "enterprise-crawler"
            }
        }
    ],
};
