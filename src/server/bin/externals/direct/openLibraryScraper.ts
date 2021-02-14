// https://openlibrary.org/api/books?bibkeys=ISBN:9780980200447&jscmd=data&format=json

import { Hook, Toc, TocEpisode } from "../types";
import { MediaType } from "../../tools";
import { queueRequest } from "../queueManager";
import { UrlError } from "../errors";
import { SearchResult } from "../../types";

const BASE_URI = "https://openlibrary.org/";

type OpenLibraryBookResponse = Record<string, OpenLibraryBookData>;

interface OpenLibraryBookData {
    publishers: Array<{ name: string }>;
    /**
     * What is this? e.g.:"80p."
     */
    pagination: string;
    /**
     * Identifier keys like "google" or "isbn_10" etc.
     */
    identifiers: Record<string, string[]>;
    table_of_contents?: Array<{ title: string; label: string; pagenum: string; level: number }>;
    links: Array<{ url: string; title: string }>;
    weight: string;
    title: string;
    url: string;
    classifications: Record<string, string[]>;
    notes: string;
    number_of_pages: number;
    cover: Record<string, string>;
    subjects: Array<{ url: string; name: string }>;
    /**
     * A Date like "March 2009"
     */
    publish_date: string;
    /**
     * Url Path like "/books/OL22853304M"
     */
    key: string;
    authors: Array<{ url: string; name: string }>;
    by_statement: string;
    publish_places: Array<{ name: string }>;
    ebooks: Array<{ checkedout: boolean; formats: any; preview_url: string; borrow_url: string; availability: string }>;
}

/**
 * Query the Open Library API to search Tocs.
 * 
 * The API is documented on https://openlibrary.org/dev/docs/api/books
 * 
 * @param tocLink toc link
 */
async function toc(tocLink: string): Promise<Toc[]> {
    const linkRegex = /https?:\/\/openlibrary\.org\/api\/books\?bibkeys=(ISBN|OLID):\d+&jscmd=data&format=json/

    if (!linkRegex.test(tocLink)) {
        throw new UrlError("Invalid Toc Link!", tocLink);
    }

    const response = await queueRequest(tocLink);
    const result: OpenLibraryBookResponse = JSON.parse(response);

    const tocs: Toc[] = [];

    for (const data of Object.values(result)) {
        const publishDate = new Date(data.publish_date);

        if (Number.isNaN(publishDate.getDate())) {
            throw Error("Invalid Time: " + data.publish_date);
        }

        const tocContent: TocEpisode[] = data?.table_of_contents?.map((value, index) => {
            return {
                totalIndex: index + 1,
                combiIndex: index + 1,
                title: value.title,
                url: tocLink,
                releaseDate: publishDate
            };
        }) || [{
            combiIndex: 1,
            totalIndex: 1,
            title: data.title,
            url: tocLink,
            releaseDate: publishDate
        }];

        tocs.push({
            mediumType: MediaType.TEXT,
            title: data.title,
            content: tocContent,
            link: tocLink,
            authors: data.authors.map(value => {
                return {
                    link: value.url,
                    name: value.name,
                }
            })
        });
    }
    return tocs;
}

interface OpenLibrarySearchResult {
    start: number;
    num_found: number;
    numFound: number;
    docs: SearchItem[];
}

interface SearchItem {
    title: string;
    author_name?: string[];
    key: string;
    cover_i: number;
    cover_edition_key: string;
}

/**
 * Query the Open Library API to search for Media.
 * 
 * The API is documented on https://openlibrary.org/dev/docs/api/search
 * 
 * @param text the text to search for
 * @param medium the medium type to filter after
 */
async function search(text: string, medium: number): Promise<SearchResult[]> {
    if (medium !== MediaType.TEXT) {
        return [];
    }
    const response = await queueRequest(`${BASE_URI}search.json?q=${encodeURIComponent(text)}`);
    const result: OpenLibrarySearchResult = JSON.parse(response);
    // not all have cover_edition_key, ignore those, that dont have it for now
    return result.docs.filter(v => v.cover_edition_key).map(value => {
        return {
            link: `${BASE_URI}api/books?bibkeys=OLID:${value.cover_edition_key}&jscmd=data&format=json`,
            title: value.title,
            author: value.author_name && value.author_name[0],
            coverUrl: `https://covers.openlibrary.org/b/id/${value.cover_i}-M.jpg`,
            medium: MediaType.TEXT
        };
    });
}

search.medium = MediaType.TEXT;

export function getHook(): Hook {
    return {
        name: "openlibrary",
        medium: MediaType.TEXT,
        domainReg: /^https:\/\/openlibrary\.org/,
        tocAdapter: toc,
        searchAdapter: search,
    };
}
