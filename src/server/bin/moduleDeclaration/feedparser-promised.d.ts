declare module "feedparser-promised" {
    import FeedParser from "node-feedparser";

    interface FeedParserOptions {
        /**
         * Default: false
         */
        strict?: boolean;
        /**
         * Default: true
         */
        normalize?: boolean;
        /**
         * Default: true
         */
        addmeta?: boolean;
        /**
         * Default: true
         */
        resume_saxerror?: boolean;
        /**
         * Default: 16 * 1024 * 1024
         */
        MAX_BUFFER_LENGTH?: number;

        /**
         * Default: ?
         */
        feedurl?: string;
    }

    interface FeedParserPromised {
        parse(uri: string, feedparserOptions?: FeedParserOptions): Promise<FeedParser.Item[]>;
    }

    const feedParserPromised: FeedParserPromised;
    export default feedParserPromised;
}
