module.exports = {
    apps: [
        {
            name: "enterprise-server",
            script: "server/dist/startServer.js",
            instances: 1,
            max_restarts: 5,
            exec_mode: "fork",
            autorestart: true,
            watch: false,
            max_memory_restart: "200M",
        }, {
            name: "enterprise-crawler",
            script: "server/dist/startCrawler.js",
            max_restarts: 5,
            instances: 1,
            exec_mode: "fork",
            autorestart: true,
            watch: false,
            max_memory_restart: "300M",
        }
    ],

    deploy: {
        production: {
            user: "pi",
            host: "localhost",
            ref: "origin/master",
            repo: "git@github.com:repo.git",
            path: "~/enterprise",
            "post-deploy": "npm install && pm2 reload ecosystem.config.js --env production"
        },
        development: {
            user: "pi",
            host: "localhost",
            ref: "origin/heroku-develop",
            repo: "git@github.com:mytlogos/enterprise-lister.git",
            path: "~/enterprise",
            "post-deploy": "npm install && pm2 reload"
        }
    }
};
