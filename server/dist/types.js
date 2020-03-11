"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ReleaseState;
(function (ReleaseState) {
    ReleaseState[ReleaseState["Unknown"] = 0] = "Unknown";
    ReleaseState[ReleaseState["Ongoing"] = 1] = "Ongoing";
    ReleaseState[ReleaseState["Hiatus"] = 2] = "Hiatus";
    ReleaseState[ReleaseState["Discontinued"] = 3] = "Discontinued";
    ReleaseState[ReleaseState["Dropped"] = 4] = "Dropped";
    ReleaseState[ReleaseState["Complete"] = 5] = "Complete";
})(ReleaseState = exports.ReleaseState || (exports.ReleaseState = {}));
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