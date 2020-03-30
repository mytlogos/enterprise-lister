import { Toc } from "./externals/types";
export declare function tocHandler(result: {
    tocs: Toc[];
    uuid?: string;
}): Promise<void>;
export declare const startCrawler: () => void;
