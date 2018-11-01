const Router = require("express").Router;
const setUpUserApi = require("./userApi");

let api = Router({});

api.use("/user", setUpUserApi(Router({})));

module.exports = api;