import { STATUS_CODES } from "http";
import { EOL } from "os";
import { BasicRequestConfig, Response } from ".";

function format(lines: string[]) {
  return EOL + lines.join(EOL) + EOL + EOL;
}

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

class SuperError extends Error {
  public readonly errorType: number;
  public readonly name: string;
  public readonly cause: any;
  public readonly options: BasicRequestConfig<any>;
  public readonly response?: Response;

  public constructor(type: number, name: string, cause: any, options: BasicRequestConfig<any>, response?: Response) {
    super();
    this.errorType = type;
    this.name = name;
    this.cause = cause;
    this.options = options;
    this.response = response;
  }
}

export class RequestError extends SuperError {
  public constructor(cause: any, options: BasicRequestConfig<any>, response?: Response) {
    super(0, "RequestError", cause, options, response);
  }
}

export class CaptchaError extends SuperError {
  public constructor(cause: any, options: BasicRequestConfig<any>, response?: Response) {
    super(1, "CaptchaError", cause, options, response);
  }
}

export class CloudflareError extends SuperError {
  // errorType 4 is a CloudflareError so this constructor is reused.
  public constructor(cause: any, options: BasicRequestConfig<any>, response?: Response) {
    super(2, "CloudflareError", cause, options, response);

    if (!isNaN(cause)) {
      const description = ERROR_CODES[cause] || STATUS_CODES[cause];
      if (description) {
        this.message = cause + ", " + description;
      }
    }
  }
}

export class ParserError extends SuperError {
  // errorType 4 is a CloudflareError so this constructor is reused.
  public constructor(cause: any, options: BasicRequestConfig<any>, response?: Response) {
    super(3, "ParserError", cause, options, response);
    this.message = BUG_REPORT + this.message;
  }
}

export class StatusCodeError extends SuperError {
  public constructor(cause: any, options: BasicRequestConfig<any>, response?: Response) {
    super(5, "StatusCodeError", cause, options, response);
  }
}

export class TransformError extends SuperError {
  public constructor(cause: any, options: BasicRequestConfig<any>, response?: Response) {
    super(6, "TransformError", cause, options, response);
  }
}
