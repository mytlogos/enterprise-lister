import { brotliDecompressSync } from "zlib";
import vm from "vm";
import https from "https";
import crypto from "crypto";
import { BasicRequestConfig, RequestConfig, Response, ResponseType } from "./types";
import { URL, URLSearchParams } from "url";
import { delay } from "enterprise-core/dist/tools";
import { RequestError, CloudflareError, CaptchaError, ParserError } from "./error";
import { HeaderGenerator } from "header-generator";
import { getStoreValue, StoreKey } from "enterprise-core/dist/asyncStorage";

const headerGenerator = new HeaderGenerator({
  browsers: ["chrome", "firefox", "safari"],
  devices: ["desktop"],
  operatingSystems: ["windows"],
});

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
const DEFAULT_CHALLENGE_COUNT = 3;

export async function handleCloudflare(config: RequestConfig<any>, requestor: Requester) {
  const defaultParams: ByPassRequestConfig<any> = {
    headers: getDefaultHeaders({ Host: HOST }),
    // Reduce Cloudflare's timeout to cloudflareMaxTimeout if it is excessive
    cloudflareMaxTimeout: 30000,
    // Support only this max challenges in row. If CF returns more, throw an error
    challengesToSolve: DEFAULT_CHALLENGE_COUNT,
    // Remove Cloudflare's email protection
    decodeEmails: false,
  };
  // clone config so we do not make any bad modifications
  config = structuredClone(config);
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
  return Object.assign({}, defaults, headerGenerator.getHeaders());
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

    html = html.substring(0, match.index) + result + html.substring(re.lastIndex);
    re.lastIndex = match.index + result.length - 1;
  }

  return html;
}

function decode(hexStr: string) {
  const key = parseInt(hexStr.substring(0, 2), 16);
  let email = "";

  for (let codePoint, i = 2; i < hexStr.length; i += 2) {
    codePoint = parseInt(hexStr.substring(i, i + 2), 16) ^ key;
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
  const headers = options.headers;
  if (headers) {
    Object.keys(headers).forEach((key) => {
      // @ts-expect-error
      if (key.toLowerCase() === "host" && headers[key] === HOST) {
        headers[key] = new URL(options.url as string).host;
      }
    });
  }

  let response;

  try {
    response = await requester(options as RequestConfig<any>);
  } catch (error) {
    if (error instanceof RequestError) {
      return onRequestResponse(options, error, requester, error.response);
    } else {
      return onRequestResponse(options, error, requester);
    }
  }
  return onRequestResponse(options, null, requester, response);
}

// The argument convention is options first where possible, options
// always before response, and body always after response.
async function onRequestResponse(
  options: ByPassRequestConfig,
  error: RequestError | any | null,
  requester: Requester,
  response?: Response,
) {
  let body = response?.data;

  // Encoding is null so body should be a buffer object
  if (!response || !body?.toString) {
    // Pure request error (bad connection, wrong url, etc)
    if (error && error instanceof RequestError) {
      throw error;
    } else {
      throw new RequestError(error, options, response);
    }
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
  const networkTrack = getStoreValue(StoreKey.NETWORK);

  if (networkTrack) {
    networkTrack.cloudflareCount++;
  }
  if (body.length < 1) {
    // This is a 4xx-5xx Cloudflare response with an empty body.
    throw new CloudflareError(response.statusCode, options, response);
  }

  const stringBody = body.toString("utf8");
  validateResponse(options, response, stringBody);
  const isChallenge = stringBody.includes("a = document.getElementById('jschl-answer');");

  if (isChallenge) {
    return onChallenge(options, response, stringBody, requester);
  }

  const isRedirectChallenge =
    stringBody.includes("You are being redirected") || stringBody.includes("sucuri_cloudproxy_js");

  if (isRedirectChallenge) {
    return onRedirectChallenge(options, response, stringBody, requester);
  }

  // 503 status is always a challenge
  if (response.statusCode === 503) {
    return onChallenge(options, response, stringBody, requester);
  }

  const isOtherChallenge = stringBody.includes('id="challenge-running"');

  // TODO: solve this challenge
  if (isOtherChallenge) {
    throw new CloudflareError(response.statusCode, options, response);
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
  } else if (body.includes("why_captcha") || /cdn-cgi\/l\/chk_captcha/i.test(body)) {
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
  if (match?.[2] && match[2] === "POST") {
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

function onRequestComplete(
  options: ByPassRequestConfig,
  response: Response,
  body: Buffer | string,
  isHtml?: boolean,
): Response {
  if (typeof options.realEncoding === "string") {
    body = body.toString(options.realEncoding as BufferEncoding);
    // The resolveWithFullResponse option will resolve with the response
    // object. This changes the response.body so it is as expected.

    if (isHtml && options.decodeEmails) {
      body = decodeEmails(body);
    }

    response.data = body;
  }

  if (options.challengesToSolve < DEFAULT_CHALLENGE_COUNT) {
    const networkTrack = getStoreValue(StoreKey.NETWORK);

    if (networkTrack) {
      networkTrack.cloudflareSolved++;
    }
  }
  return response;
}
