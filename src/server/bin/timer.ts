import {Handler} from "express";

const workFrom = 7;
const workTo = 11;

/**
 * Block requests in a given time frame.
 */
export const blockRequests: Handler = (req, resp, next) => {
    next();
};
