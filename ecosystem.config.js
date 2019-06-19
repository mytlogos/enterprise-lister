module.exports = {
    apps: [
        {
            name: "enterprise-server",
            script: "server/dist/startServer.js",

            instances: 2,
            max_restarts: 5,
            exec_mode: "cluster",
            autorestart: true,
            watch: false,
            max_memory_restart: "150M",
            env: {
                NODE_ENV: "development"
            },
            env_production: {
                NODE_ENV: "production"
            }
        }, {
            name: "enterprise-crawler",
            script: "server/dist/startCrawler.js",

            instances: 1,
            exec_mode: "fork",
            autorestart: true,
            watch: false,
            max_memory_restart: "1G",
            env: {
                NODE_ENV: "development"
            },
            env_production: {
                NODE_ENV: "production"
            }
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
