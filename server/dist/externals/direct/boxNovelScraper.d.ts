import { Hook } from "../types";
import { TocSearchMedium } from "../../types";
import { SearchResult } from "./directTools";
export declare function searchAjax(searchWords: string, medium: TocSearchMedium): Promise<SearchResult>;
export declare function getHook(): Hook;
