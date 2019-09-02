"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ScrapeName;
(function (ScrapeName) {
    ScrapeName["searchForToc"] = "searchForToc";
    ScrapeName["toc"] = "toc";
    ScrapeName["oneTimeToc"] = "oneTimeToc";
    ScrapeName["feed"] = "feed";
    ScrapeName["news"] = "news";
    ScrapeName["newsAdapter"] = "newsAdapter";
    ScrapeName["oneTimeUser"] = "oneTimeUser";
    ScrapeName["checkTocs"] = "checkTocs";
    ScrapeName["queueTocs"] = "queueTocs";
    ScrapeName["remapMediaParts"] = "remapMediaParts";
    ScrapeName["queueExternalUser"] = "queueExternalUser";
})(ScrapeName = exports.ScrapeName || (exports.ScrapeName = {}));
var JobState;
(function (JobState) {
    JobState["RUNNING"] = "running";
    JobState["WAITING"] = "waiting";
})(JobState = exports.JobState || (exports.JobState = {}));
var MilliTime;
(function (MilliTime) {
    MilliTime[MilliTime["SECOND"] = 1000] = "SECOND";
    MilliTime[MilliTime["MINUTE"] = 60000] = "MINUTE";
    MilliTime[MilliTime["HOUR"] = 3600000] = "HOUR";
    MilliTime[MilliTime["DAY"] = 86400000] = "DAY";
})(MilliTime = exports.MilliTime || (exports.MilliTime = {}));
//# sourceMappingURL=types.js.map