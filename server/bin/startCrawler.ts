import {startCrawler} from "./crawlerStart";
import {startStorage} from "./database/database";
// first start storage, then crawler, as crawler depends on storage
startStorage();
startCrawler();
