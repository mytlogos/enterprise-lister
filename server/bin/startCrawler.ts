import {startCrawler} from "./crawlerStart";
import {startStorage} from "./database/storages/storage";
import logger from "./logger";

logger.info(`Process PID: ${process.pid} in environment '${process.env.NODE_ENV}'`);
// first start storage, then crawler, as crawler depends on storage
startStorage();
startCrawler();
