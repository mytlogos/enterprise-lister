import { Hook } from "../types";
import { TocSearchMedium } from "../../types";
import { SearchResult as TocSearchResult } from "./directTools";
export declare function searchAjax(searchWords: string, medium: TocSearchMedium): Promise<TocSearchResult>;
export declare function getHook(): Hook;
