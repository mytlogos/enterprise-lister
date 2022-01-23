import { brotliDecompressSync } from "zlib";
import vm from "vm";
import { EOL } from "os";
import http from "http";
import https from "https";
import crypto from "crypto";
import { readFileSync } from "fs";
import { BasicRequestConfig, RequestConfig, Response, ResponseType } from "./types";
import { URL, URLSearchParams } from "url";
import { delay } from "enterprise-core/dist/tools";

const { chrome: chromeData } = JSON.parse(readFileSync("./browsers.json", { encoding: "utf-8" }));

// The purpose of this library:
// 1. Have errors consistent with request/promise-core
// 2. Prevent request/promise core from wrapping our errors
// 3. Create descriptive errors.

// There are two differences between these errors and the originals.
// 1. There is a non-enumerable errorType attribute.
// 2. The error constructor is hidden from the stacktrace.
const BUG_REPORT = format([
  "### Cloudflare may have changed their technique, or there may be a bug.",
  "### Bug Reports: https://github.com/codemanki/cloudscraper/issues",
  "### Check the detailed exception message that follows for the cause.",
]);

const ERROR_CODES: { [key: number]: string } = {
  // Non-standard 5xx server error HTTP status codes
  520: "Web server is returning an unknown error",
  521: "Web server is down",
  522: "Connection timed out",
  523: "Origin is unreachable",
  524: "A timeout occurred",
  525: "SSL handshake failed",
  526: "Invalid SSL certificate",
  527: "Railgun Listener to Origin Error",
  530: "Origin DNS error",
  // Other codes
  1000: "DNS points to prohibited IP",
  1001: "DNS resolution error",
  1002: "Restricted or DNS points to Prohibited IP",
  1003: "Access Denied: Direct IP Access Not Allowed",
  1004: "Host Not Configured to Serve Web Traffic",
  1005: "Access Denied: IP of banned ASN/ISP",
  1006: "Access Denied: Your IP address has been banned",
  1007: "Access Denied: Your IP address has been banned",
  1008: "Access Denied: Your IP address has been banned",
  1010: "The owner of this website has banned your access based on your browser's signature",
  1011: "Access Denied (Hotlinking Denied)",
  1012: "Access Denied",
  1013: "HTTP hostname and TLS SNI hostname mismatch",
  1016: "Origin DNS error",
  1018: "Domain is misconfigured",
  1020: "Access Denied (Custom Firewall Rules)",
};

export class RequestError extends Error {
  public readonly errorType = 0;
  public readonly name = "RequestError";
  public readonly cause: any;
  public readonly options: any;
  public readonly response: any;

  public constructor(cause: any, options: any, response: any) {
    super();
    this.cause = cause;
    this.options = options;
    this.response = response;
  }
}

export class CaptchaError extends Error {
  public readonly errorType = 1;
  public readonly name = "CaptchaError";
  public readonly cause: any;
  public readonly options: any;
  public readonly response: any;

  public constructor(cause: any, options: any, response: any) {
    super();
    this.cause = cause;
    this.options = options;
    this.response = response;
  }
}

export class CloudflareError extends Error {
  public readonly errorType = 2;
  public readonly name = "CloudflareError";
  public readonly cause: any;
  public readonly options: any;
  public readonly response: any;

  // errorType 4 is a CloudflareError so this constructor is reused.
  public constructor(cause: any, options: any, response: any) {
    super();
    this.cause = cause;
    this.options = options;
    this.response = response;

    if (!isNaN(cause)) {
      const description = ERROR_CODES[cause] || http.STATUS_CODES[cause];
      if (description) {
        this.message = cause + ", " + description;
      }
    }
  }
}

export class ParserError extends Error {
  public readonly errorType = 3;
  public readonly name = "ParserError";
  public readonly cause: any;
  public readonly options: any;
  public readonly response: any;

  // errorType 4 is a CloudflareError so this constructor is reused.
  public constructor(cause: any, options: any, response: any) {
    super();
    this.cause = cause;
    this.options = options;
    this.response = response;
    this.message = BUG_REPORT + this.message;
  }
}

export class StatusCodeError extends Error {
  public readonly errorType = 5;
  public readonly name = "StatusCodeError";
  public readonly cause: any;
  public readonly options: any;
  public readonly response: any;

  public constructor(cause: any, options: any, response: any) {
    super();
    this.cause = cause;
    this.options = options;
    this.response = response;
  }
}

export class TransformError extends Error {
  public readonly errorType = 6;
  public readonly name = "TransformError";
  public readonly cause: any;
  public readonly options: any;
  public readonly response: any;

  public constructor(cause: any, options: any, response: any) {
    super();
    this.cause = cause;
    this.options = options;
    this.response = response;
  }
}

interface ByPassRequestConfig<D = any> extends BasicRequestConfig<D> {
  // Reduce Cloudflare's timeout to cloudflareMaxTimeout if it is excessive
  cloudflareMaxTimeout: number;

  cloudflareTimeout?: string;
  // Support only this max challenges in row. If CF returns more, throw an error
  challengesToSolve: number;
  // Remove Cloudflare's email protection
  decodeEmails: boolean;
  realEncoding?: string;
  realResponseType?: ResponseType;
}

type Requester = (config: RequestConfig<any>) => Promise<Response>;

export async function handleCloudflare(config: RequestConfig<any>, requestor: Requester) {
  const defaultParams: ByPassRequestConfig<any> = {
    headers: getDefaultHeaders({ Host: HOST }),
    // Reduce Cloudflare's timeout to cloudflareMaxTimeout if it is excessive
    cloudflareMaxTimeout: 30000,
    // Support only this max challenges in row. If CF returns more, throw an error
    challengesToSolve: 3,
    // Remove Cloudflare's email protection
    decodeEmails: false,
  };
  if (config.httpAgent) {
    config.httpsAgent = new https.Agent({
      // Removes a few problematic TLSv1.0 ciphers to avoid CAPTCHA
      ciphers: crypto.constants.defaultCipherList + ":!ECDHE+SHA:!AES128-SHA",
    });
  }
  const params = Object.assign(defaultParams, config);
  validateRequest(params);
  return performRequest(params, requestor);
}

function format(lines: string[]) {
  return EOL + lines.join(EOL) + EOL + EOL;
}

const VM_OPTIONS = {
  filename: "iuam-challenge.js",
  contextOrigin: "cloudflare:iuam-challenge.js",
  contextCodeGeneration: { strings: true, wasm: false },
  timeout: 5000,
};

const VM_ENV = `
  (function (global) {
    const cache = Object.create(null);
    const keys = [];
    const { body, href } = global;
    
    Object.defineProperties(global, {
      document: {
        value: {
          createElement: function () {
            return { firstChild: { href: href } };
          },
          getElementById: function (id) {
            if (keys.indexOf(id) === -1) {
              const re = new RegExp(' id=[\\'"]?' + id + '[^>]*>([^<]*)');
              const match = body.match(re);
      
              keys.push(id);
              cache[id] = match === null ? match : { innerHTML: match[1] };
            }
      
            return cache[id];
          }
        }
      },
      location: { value: { reload: function () {} } }  
    })
  }(this));
`;

function evaluate(code: string, ctx: vm.Context) {
  return vm.runInNewContext(VM_ENV + code, ctx, VM_OPTIONS);
}

// Global context used to evaluate standard IUAM JS challenge
class Context {
  public body: string;
  public href: string;
  public document: any;

  public constructor(options?: any) {
    if (!options) options = { body: "", hostname: "" };
    this.body = options.body;
    this.href = "http://" + options.hostname + "/";
  }
  public atob(str: string) {
    try {
      return Buffer.from(str, "base64").toString("binary");
    } catch (ignore) {
      /* ignore error */
    }
  }
}

function getDefaultHeaders(defaults: any) {
  const headers = getChromeHeaders(random(chromeData));
  return Object.assign({}, defaults, headers);
}

function random(arr: any[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getChromeHeaders(options: any) {
  const { headers } = options;
  headers["User-Agent"] = random(options["User-Agent"]);
  return headers;
}

function caseless(headers: any) {
  const result: any = {};

  Object.keys(headers).forEach((key) => {
    result[key.toLowerCase()] = headers[key];
  });

  return result;
}

const pattern =
  // Opening tag
  // $1 = TAG_NAME
  "<([a-z]+)(?: [^>]*)?' + '(?:" +
  // href attribute
  // $2 = /cdn-cgi/l/email-protection#HEX_STRING
  // $3 = HEX_STRING
  " href=['\"]?(\\/cdn-cgi\\/l\\/email-protection#([a-f0-9]{4,}))|" +
  // data attribute
  // $4 = HEX_STRING
  " data-cfemail=[\"']?([a-f0-9]{4,})" +
  // Self-closing or innerHTML(disallow child nodes) followed by closing tag
  // \1 backreference to $1
  "(?:[^<]*\\/>|[^<]*?<\\/\\1>))";

const re = new RegExp(pattern, "gi");

function decodeEmails(html: string) {
  let match, result;

  re.lastIndex = 0;

  while ((match = re.exec(html)) !== null) {
    if (match[2] !== undefined) {
      result = match[0].replace(match[2], "mailto:" + decode(match[3]));
    } else {
      result = decode(match[4]);
    }

    html = html.substr(0, match.index) + result + html.substr(re.lastIndex);
    re.lastIndex = match.index + result.length - 1;
  }

  return html;
}

function decode(hexStr: string) {
  const key = parseInt(hexStr.substr(0, 2), 16);
  let email = "";

  for (let codePoint, i = 2; i < hexStr.length; i += 2) {
    codePoint = parseInt(hexStr.substr(i, 2), 16) ^ key;
    email += String.fromCharCode(codePoint);
  }

  return decodeURIComponent(escape(email));
}

const debugging = false;

const HOST = Symbol("host");

function validateRequest(options: ByPassRequestConfig) {
  // Prevent overwriting realEncoding in subsequent calls
  if (!("realEncoding" in options)) {
    // Can't just do the normal options.encoding || 'utf8'
    // because null is a valid encoding.
    if ("encoding" in options) {
      options.realEncoding = options.responseEncoding;
    } else {
      options.realEncoding = "utf8";
    }
  }

  // Prevent overwriting realResponseType in subsequent calls
  if (!("realResponseType" in options) && "responseType" in options) {
    options.realResponseType = options.responseType;
  }

  options.responseEncoding = undefined;
  options.responseType = "arraybuffer";

  if (isNaN(options.challengesToSolve)) {
    throw new TypeError(
      "Expected `challengesToSolve` option to be a number, " + "got " + typeof options.challengesToSolve + " instead.",
    );
  }

  if (isNaN(options.cloudflareMaxTimeout)) {
    throw new TypeError(
      "Expected `cloudflareMaxTimeout` option to be a number, " +
        "got " +
        typeof options.cloudflareMaxTimeout +
        " instead.",
    );
  }
}

// This function is wrapped to ensure that we get new options on first call.
// The options object is reused in subsequent calls when calling it directly.
async function performRequest(options: ByPassRequestConfig, requester: Requester) {
  // @ts-expect-error
  if (options.headers?.host === HOST) {
    // We must define the host header ourselves to preserve case and order.
    options.headers.host = new URL(options.url as string).host;
  }

  let response;

  try {
    response = await requester(options as RequestConfig<any>);
  } catch (error) {
    return onRequestResponse(options, error, requester);
  }
  return onRequestResponse(options, null, requester, response);
}

// The argument convention is options first where possible, options
// always before response, and body always after response.
async function onRequestResponse(options: ByPassRequestConfig, error: any, requester: Requester, response?: Response) {
  let body = response?.data;

  // Encoding is null so body should be a buffer object
  if (error || !body || !body.toString || !response) {
    // Pure request error (bad connection, wrong url, etc)
    throw new RequestError(error, options, response);
  }

  const headers = caseless(response.headers);

  // @ts-expect-error
  response.responseStartTime = Date.now();
  const isCloudflare = /^(cloudflare|sucuri)/i.test("" + headers.server);
  const isHTML = /text\/html/i.test("" + headers["content-type"]);

  // If body isn't a buffer, this is a custom response body.
  if (!Buffer.isBuffer(body)) {
    return response;
  }

  // Decompress brotli compressed responses
  if (/\bbr\b/i.test("" + headers["content-encoding"])) {
    try {
      response.data = body = brotliDecompressSync(body);
    } catch (compressError) {
      throw new RequestError(compressError, options, response);
    }
  }

  if (isCloudflare && isHTML) {
    return onCloudflareResponse(options, response, body, requester, isHTML);
  } else {
    return onRequestComplete(options, response, body, isHTML);
  }
}

function onCloudflareResponse(
  options: ByPassRequestConfig,
  response: any,
  body: Buffer,
  requester: Requester,
  isHtml: boolean,
): Promise<Response> {
  if (body.length < 1) {
    // This is a 4xx-5xx Cloudflare response with an empty body.
    throw new CloudflareError(response.statusCode, options, response);
  }

  const stringBody = body.toString("utf8");
  validateResponse(options, response, stringBody);
  const isChallenge = stringBody.indexOf("a = document.getElementById('jschl-answer');") !== -1;

  if (isChallenge) {
    return onChallenge(options, response, stringBody, requester);
  }

  const isRedirectChallenge =
    stringBody.indexOf("You are being redirected") !== -1 || stringBody.indexOf("sucuri_cloudproxy_js") !== -1;

  if (isRedirectChallenge) {
    return onRedirectChallenge(options, response, stringBody, requester);
  }

  // 503 status is always a challenge
  if (response.statusCode === 503) {
    return onChallenge(options, response, stringBody, requester);
  }

  // All is good
  return Promise.resolve(onRequestComplete(options, response, body, isHtml));
}

function detectRecaptchaVersion(body: string) {
  // New version > Dec 2019
  if (/__cf_chl_captcha_tk__=(.*)/i.test(body)) {
    // Test for ver2 first, as it also has ver2 fields
    return "ver2";
    // Old version < Dec 2019
  } else if (body.indexOf("why_captcha") !== -1 || /cdn-cgi\/l\/chk_captcha/i.test(body)) {
    return "ver1";
  }

  return false;
}

function validateResponse(options: ByPassRequestConfig, response: any, body: string) {
  // Finding captcha
  // Old version < Dec 2019
  const recaptchaVer = detectRecaptchaVersion(body);
  if (recaptchaVer) {
    // Convenience boolean
    response.isCaptcha = true;
    throw new CaptchaError("captcha", options, response);
  }

  // Trying to find '<span class="cf-error-code">1006</span>'
  const match = body.match(/<\w+\s+class="cf-error-code">(.*)<\/\w+>/i);

  if (match) {
    const code = parseInt(match[1]);
    throw new CloudflareError(code, options, response);
  }

  return false;
}

async function onChallenge(
  options: ByPassRequestConfig,
  response: any,
  body: string,
  requester: Requester,
): Promise<Response> {
  const uri = response.request.uri;
  // The query string to send back to Cloudflare
  const payload: any = {
    /* s, jschl_vc, pass, jschl_answer */
  };

  if (options.challengesToSolve === 0) {
    throw new CloudflareError("Cloudflare challenge loop", options, response);
  }

  let timeout = options.cloudflareTimeout ? parseInt(options.cloudflareTimeout) : NaN;
  let match;

  match = body.match(/name="(.+?)" value="(.+?)"/);

  if (match) {
    const hiddenInputName = match[1];
    payload[hiddenInputName] = match[2];
  }

  match = body.match(/name="jschl_vc" value="(\w+)"/);
  if (!match) {
    throw new ParserError("challengeId (jschl_vc) extraction failed", options, response);
  }

  payload.jschl_vc = match[1];

  match = body.match(/name="pass" value="(.+?)"/);
  if (!match) {
    throw new ParserError("Attribute (pass) value extraction failed", options, response);
  }

  payload.pass = match[1];

  match = body.match(
    /getElementById\('cf-content'\)[\s\S]+?setTimeout.+?\r?\n([\s\S]+?a\.value\s*=.+?)\r?\n(?:[^{<>]*},\s*(\d{4,}))?/,
  );
  if (!match) {
    throw new ParserError("setTimeout callback extraction failed", options, response);
  }

  if (isNaN(timeout)) {
    if (match[2] !== undefined) {
      timeout = parseInt(match[2]);

      if (timeout > options.cloudflareMaxTimeout) {
        if (debugging) {
          console.warn("Cloudflare's timeout is excessive: " + timeout / 1000 + "s");
        }

        timeout = options.cloudflareMaxTimeout;
      }
    } else {
      throw new ParserError("Failed to parse challenge timeout", options, response);
    }
  }

  // Append a.value so it's always returned from the vm
  response.challenge = match[1] + "; a.value";

  try {
    const ctx = new Context({ hostname: uri.hostname, body });
    payload.jschl_answer = evaluate(response.challenge, ctx);
  } catch (evalError) {
    if (typeof evalError === "object" && evalError && "message" in evalError) {
      (evalError as any).message = "Challenge evaluation failed: " + (evalError as any).message;
    }
    throw new ParserError(evalError, options, response);
  }

  if (isNaN(payload.jschl_answer)) {
    throw new ParserError("Challenge answer is not a number", options, response);
  }

  // Prevent reusing the headers object to simplify unit testing.
  options.headers = Object.assign({}, options.headers);
  // Use the original uri as the referer and to construct the answer uri.
  options.headers.Referer = uri.href;
  // Check is form to be submitted via GET or POST
  match = body.match(/id="challenge-form" action="(.+?)" method="(.+?)"/);
  if (match && match[2] && match[2] === "POST") {
    options.url = uri.protocol + "//" + uri.host + match[1];
    // Pass the payload using body form
    options.data = new URLSearchParams(payload).toString();
    options.headers = options.headers || {};

    const headers = caseless(options.headers);

    if (headers["content-type"] && headers["content-type"] !== "application/x-www-form-urlencoded") {
      throw new RequestError("content-type mismatch", options, response);
    }
    options.headers["content-type"] = "application/x-www-form-urlencoded";
    options.method = "POST";
  } else {
    // Whatever is there, fallback to GET
    options.url = uri.protocol + "//" + uri.host + "/cdn-cgi/l/chk_jschl?" + new URLSearchParams(payload);
  }
  // Decrement the number of challenges to solve.
  options.challengesToSolve -= 1;
  // baseUrl can't be used in conjunction with an absolute uri
  if (options.baseURL !== undefined) {
    options.baseURL = undefined;
  }
  // Change required by Cloudflate in Jan-Feb 2020
  options.url = options.url.replace(/&amp;/g, "&");

  // Make request with answer after delay.
  timeout -= Date.now() - response.responseStartTime;

  await delay(timeout);
  return performRequest(options, requester);
}

function onRedirectChallenge(options: any, response: any, body: string, requester: Requester) {
  const callback = options.callback;
  const uri = response.request.uri;

  const match = body.match(/S='([^']+)'/);
  if (!match) {
    const cause = "Cookie code extraction failed";
    return callback(new ParserError(cause, options, response));
  }

  const base64EncodedCode = match[1];
  response.challenge = Buffer.from(base64EncodedCode, "base64").toString("ascii");

  try {
    // Evaluate cookie setting code
    const ctx = new Context();
    evaluate(response.challenge, ctx);

    options.jar.setCookie(ctx.document.cookie, uri.href, { ignoreError: true });
  } catch (error) {
    if (typeof error === "object" && error && "message" in error) {
      (error as any).message = "Cookie code evaluation failed: " + (error as any).message;
    }
    return callback(new ParserError(error, options, response));
  }

  options.challengesToSolve -= 1;

  return performRequest(options, requester);
}

function onRequestComplete(options: any, response: Response, body: Buffer | string, isHtml?: boolean): Response {
  if (typeof options.realEncoding === "string") {
    body = body.toString(options.realEncoding);
    // The resolveWithFullResponse option will resolve with the response
    // object. This changes the response.body so it is as expected.

    if (isHtml && options.decodeEmails) {
      body = decodeEmails(body);
    }

    response.data = body;
  }

  return response;
}
