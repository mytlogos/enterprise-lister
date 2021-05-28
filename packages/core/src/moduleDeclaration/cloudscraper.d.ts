declare module "cloudscraper" {
  import * as request from "request";

  export interface CloudScraper<T = any> extends request.Request {
    then: Promise<T>["then"];
    catch: Promise<T>["catch"];

    promise(): Promise<T>;
  }

  export interface CloudscraperOptions extends request.CoreOptions {
    simple?: boolean;
    resolveWithFullResponse?: boolean;
    transform2xxOnly?: boolean;

    transform?(body: any, response: request.Response, resolveWithFullResponse?: boolean): any;
  }

  export type FullResponse = request.Response;
  type OptionsWithUri = request.UriOptions & CloudscraperOptions;
  type OptionsWithUrl = request.UrlOptions & CloudscraperOptions;
  export type Options = OptionsWithUri | OptionsWithUrl;

  const requestPromise: request.RequestAPI<CloudScraper, CloudscraperOptions, request.RequiredUriUrl>;

  export default requestPromise;
}
