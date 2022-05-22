import {
  AttributeSelector,
  HookConfig,
  JsonRegex,
  JsonSelector,
  RegexSelector,
  RequestConfig,
  Selector,
} from "./types";

export enum CustomHookErrorCodes {
  MULTIPLE_IN_MULTIPLE_SIBLINGS = 1,
  MERGE_TYPE_MISMATCH = 2,
  MERGE_TYPE_NON_OBJECT = 3,
  TEMPLATE_MISSING_CLOSE_BRACE = 4,
  TEMPLATE_MISSING_OPEN_BRACE = 5,
  TEMPLATE_UNKNOWN_VARIABLE = 6,
  TEMPLATE_VARIABLE_NO_VALUE = 7,
  REQUEST_URL_TRANSFORMATION_FAIL = 8,
  SELECTOR_NO_MATCH = 9,
  REGEX_NO_MATCH = 10,
  TRANSFER_WRONG_KEY = 11,
  EXTRACT_NO_VALUE = 12,
  ATTRIBUTE_TRANSFORM_FAIL = 13,
  ATTRIBUTE_NO_VALUE = 14,
  TYPE_COERCE_FAIL = 15,
}

export type ErrorData = HtmlErrorData | JsonErrorData;

interface BaseErrorData {
  context: Record<string, any>;
  config: HookConfig;
}

export interface HtmlErrorData extends BaseErrorData {
  html: true;
  body: string;
}

export interface JsonErrorData extends BaseErrorData {
  json: true;
  body: any;
}

export interface CustomHookErrorTypes {
  [CustomHookErrorCodes.MULTIPLE_IN_MULTIPLE_SIBLINGS]: {
    nextResults: any[];
    nextBuckets: any[][][];
    index: number;
    multipleBucket: any[];
    bucket: any[];
    parent: Selector<any> | JsonSelector<any, any>;
  } & ErrorData;
  [CustomHookErrorCodes.MERGE_TYPE_MISMATCH]: {
    target: any;
    source: any;
  } & ErrorData;
  [CustomHookErrorCodes.MERGE_TYPE_NON_OBJECT]: {
    target: any;
    source: any;
    key: string;
    targetValue: any;
    sourceValue: any;
  } & ErrorData;
  [CustomHookErrorCodes.TEMPLATE_MISSING_CLOSE_BRACE]: {
    currentIndex: number | undefined;
    lastBrace: { type: string; index: number } | undefined;
    template: string;
  } & ErrorData;
  [CustomHookErrorCodes.TEMPLATE_MISSING_OPEN_BRACE]: {
    currentIndex: number;
    lastBrace: { type: string; index: number } | undefined;
    template: string;
  } & ErrorData;
  [CustomHookErrorCodes.TEMPLATE_UNKNOWN_VARIABLE]: {
    opening: { type: string; index: number };
    closing: { type: string; index: number };
    originalVariableName: string;
    variableName: string;
    template: string;
  } & ErrorData;
  [CustomHookErrorCodes.TEMPLATE_VARIABLE_NO_VALUE]: {
    originalVariableName: string;
    variableName: string;
    template: string;
  } & ErrorData;
  [CustomHookErrorCodes.REQUEST_URL_TRANSFORMATION_FAIL]: {
    requestConfig: RequestConfig;
    targetUrl: string;
  } & ErrorData;
  [CustomHookErrorCodes.SELECTOR_NO_MATCH]: {
    selector: Selector<any> | JsonSelector<any, any>;
    element: string | null | any;
    found: string | any;
  } & ErrorData;
  [CustomHookErrorCodes.REGEX_NO_MATCH]: {
    regex: JsonRegex | RegExp;
    value: string;
    element: string | null;
    selector: RegexSelector<any>;
    result: any;
  } & ErrorData;
  [CustomHookErrorCodes.TRANSFER_WRONG_KEY]: {
    transferKey: string;
    targetKey: string;
    result: any;
  } & ErrorData;
  [CustomHookErrorCodes.EXTRACT_NO_VALUE]: {
    result: any;
    targetKey: string;
    transferKey: string;
    transferTarget: any;
  } & ErrorData;
  [CustomHookErrorCodes.ATTRIBUTE_TRANSFORM_FAIL]: {
    element: string | null;
    attribute: AttributeSelector;
    value: string;
  } & ErrorData;
  [CustomHookErrorCodes.ATTRIBUTE_NO_VALUE]: {
    element: string | null;
    attribute: AttributeSelector;
    value: undefined;
  } & ErrorData;
  [CustomHookErrorCodes.TYPE_COERCE_FAIL]: {
    value: string;
    type: string;
    result: null | number | Date | string;
  } & ErrorData;
}

export class CustomHookError<T extends CustomHookErrorCodes = CustomHookErrorCodes> extends Error {
  public readonly code: CustomHookErrorCodes;
  public readonly data: CustomHookErrorTypes[T];

  public constructor(message: string, code: T, data: Omit<CustomHookErrorTypes[T], keyof ErrorData>) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;

    // properties of ErrorData are set when rethrowing from the scrape-function
    this.data = data as CustomHookErrorTypes[T];
  }
}
