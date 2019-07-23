import {startCrawler} from "./crawlerStart";
import {startStorage} from "./database/database";
console.log("Process PID: " + process.pid);
// first start storage, then crawler, as crawler depends on storage
startStorage();
startCrawler();
