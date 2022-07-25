import { Cheerio, CheerioAPI, Element } from "cheerio";
import { Options } from "cloudscraper";
import { getStore } from "enterprise-core/dist/asyncStorage";
import logger from "enterprise-core/dist/logger";
import { getElseSet, relativeToAbsoluteTime, sanitizeString } from "enterprise-core/dist/tools";
import { Nullable } from "enterprise-core/dist/types";
import * as url from "url";
import { getText } from "../direct/directTools";
import { queueCheerioRequest, queueRequest } from "../queueManager";
import { CustomHookError, CustomHookErrorCodes } from "./errors";
import {
  JsonRegex,
  TransferType,
  AttributeSelector,
  SimpleSelector,
  SimpleTransfer,
  RegexSelector,
  RegexTransfer,
  Selector,
  BasicTransfer,
  RequestConfig,
  JSONTransfer,
  JsonSelector,
  TransferMapping,
} from "./types";

export interface FunctionTrace {
  name: string;
  callCount: number;
  parameters: any[];
  result: any;
  calledFunctions: FunctionTrace[];
}

export interface Trace {
  functionTraces: FunctionTrace[];
  unnamedIds: number;
  callStack: FunctionTrace[];
  callCounts: Record<string, number>;
  enableTrace: boolean;
}

/**
 * Serializes a Cheerio Object into html or its selected items in a html string array.
 * @param key property key
 * @param value property value
 * @returns serializable value
 */
function replacer(key: unknown, value: any): unknown {
  if ((typeof value === "object" || typeof value === "function") && value && typeof value.html === "function") {
    if (typeof value.eq === "function" && typeof value.length === "number") {
      const serialized = [];

      for (let index = 0; index < value.length; index++) {
        const element = value.eq(index);
        serialized.push(element.html());
      }
      return serialized;
    }
    return value.html();
  }
  return value;
}

/**
 * Simple clone, does not work with circular references.
 *
 * @param value value to clone
 */
function clone(value: any): any | string {
  if (value === undefined) {
    return undefined;
  }
  try {
    return JSON.parse(JSON.stringify(value, replacer));
  } catch (error) {
    return "Clone failed";
  }
}

function traceWrap<T extends (...args: any[]) => any>(target: T): T {
  // @ts-expect-error
  return (...args: Parameters<T>): ReturnType<T> => {
    const store = getStore() as undefined | Map<keyof Trace, Trace[keyof Trace]>;

    // no store means no tracing, so exit as light weight as possible
    if (!store || !store.get("enableTrace")) {
      return target(...args);
    }

    let functionName = target.name;

    // every function should have a name
    // except unnamed (arrow) function expressions which are not bound to an variable, e.g. taken as parameter
    if (!functionName) {
      const nextId = ((store.get("unnamedIds") as number) || 0) + 1;
      store.set("unnamedIds", nextId);
      functionName = "Unnamed" + nextId;
    }

    const callCounts = getElseSet(store, "callCounts", () => ({})) as Trace["callCounts"];

    const clonedParams = clone(args);

    const currentCallCount = (callCounts[functionName] || 0) + 1;
    callCounts[functionName] = currentCallCount;

    const functionTrace: FunctionTrace = {
      callCount: currentCallCount,
      name: functionName,
      parameters: clonedParams,
      result: null,
      calledFunctions: [],
    };

    const callStack = getElseSet(store, "callStack", () => []) as Trace["callStack"];
    const parentCaller = callStack[callStack.length - 1];

    if (parentCaller) {
      parentCaller.calledFunctions.push(functionTrace);
    } else {
      const callTraces = getElseSet(store, "functionTraces", () => []) as Trace["functionTraces"];
      // if there is no tracked parent call function, it is one of the top ones
      callTraces.push(functionTrace);
    }
    callStack.push(functionTrace);

    // Make the original function call, do not catch possible error
    const result = target(...args);

    // remove function from stack and store cloned result
    if (result instanceof Promise || (result && typeof result.then === "function")) {
      return result.then((promiseResult: any) => {
        functionTrace.result = clone(promiseResult);

        const lastTrace = callStack[callStack.length - 1];

        if (lastTrace !== functionTrace) {
          logger.warn("Last Call trace does not match expected one", {
            expected: `${functionTrace.name}-${functionTrace.callCount}`,
            found: `${lastTrace?.name}-${lastTrace?.callCount}`,
          });
        } else {
          callStack.pop();
        }
        return promiseResult;
      });
    } else {
      functionTrace.result = clone(result);

      const lastTrace = callStack[callStack.length - 1];

      if (lastTrace !== functionTrace) {
        logger.warn("Last Call trace does not match expected one", {
          expected: `${functionTrace.name}-${functionTrace.callCount}`,
          found: `${lastTrace?.name}-${lastTrace?.callCount}`,
        });
      } else {
        callStack.pop();
      }
      return result;
    }
  };
}

export const toRegex = traceWrap(function toRegex(value: RegExp | JsonRegex): RegExp {
  if (value instanceof RegExp) {
    return value;
  }
  return new RegExp(value.pattern, value.flags);
});

export const extractFromRegex = traceWrap(function extractFromRegex(
  value: string,
  regex: RegExp,
  ...replace: string[]
) {
  const match = regex.exec(value);

  if (!match) {
    return;
  }

  for (let index = 0; index < match.length; index++) {
    const groupValue = match[index] || "";
    const replaceRegex = new RegExp("\\$" + index);

    for (let rIndex = 0; rIndex < replace.length; rIndex++) {
      replace[rIndex] = replace[rIndex].replace(replaceRegex, groupValue);
    }
  }
  return replace;
});

const coerceType = traceWrap(function coerceType(value: string, type: TransferType): string | number | Date {
  if (!value) {
    throw new CustomHookError("Empty Value", CustomHookErrorCodes.TYPE_COERCE_FAIL, {
      value,
      type,
      result: null,
    });
  }
  if (type === "date") {
    let date: Nullable<Date> = new Date(value);

    if (!date || Number.isNaN(date.getTime())) {
      date = relativeToAbsoluteTime(value);
    }

    if (!date || Number.isNaN(date.getTime())) {
      throw new CustomHookError(
        `Could not coerce value '${value}' into a valid date`,
        CustomHookErrorCodes.TYPE_COERCE_FAIL,
        {
          value,
          type,
          result: date,
        },
      );
    }
    return date;
  }
  if (type === "decimal") {
    const decimal = Number(value);

    if (Number.isNaN(decimal)) {
      throw new CustomHookError(
        `Could not coerce value '${value}' into a decimal`,
        CustomHookErrorCodes.TYPE_COERCE_FAIL,
        {
          value,
          type,
          result: decimal,
        },
      );
    }
    return decimal;
  }
  if (type === "integer") {
    const integer = Number(value);

    if (!Number.isInteger(integer)) {
      throw new CustomHookError(
        `Could not coerce value '${value}' into a integer`,
        CustomHookErrorCodes.TYPE_COERCE_FAIL,
        {
          value,
          type,
          result: integer,
        },
      );
    }
    return integer;
  }

  if (type === "string") {
    return value;
  }

  throw new CustomHookError("Unknown type " + type, CustomHookErrorCodes.TYPE_COERCE_FAIL, {
    value,
    type,
    result: null,
  });
});

const getAttributeValue = traceWrap(function getAttributeValue(
  element: Cheerio<Element>,
  attribute: AttributeSelector,
  base: string,
) {
  let attrValue = element.attr(attribute.attribute);

  if (attrValue === undefined) {
    throw new CustomHookError(
      `Attribute Value for ${attribute.attribute} is undefined`,
      CustomHookErrorCodes.ATTRIBUTE_NO_VALUE,
      {
        element: element.html(),
        attribute,
        value: attrValue,
      },
    );
  }

  if (attribute.resolve === true) {
    attrValue = new url.URL(attrValue, base).href;
  } else if (attribute.resolve) {
    attrValue = new url.URL(attrValue, attribute.resolve).href;
  }

  if ("regex" in attribute) {
    const extractions = extractFromRegex(attrValue, toRegex(attribute.regex), attribute.replace);

    if (!extractions) {
      throw new CustomHookError(
        `Could not transform value: ${attrValue} to ${attribute.replace}`,
        CustomHookErrorCodes.ATTRIBUTE_TRANSFORM_FAIL,
        {
          element: element.html(),
          attribute,
          value: attrValue,
        },
      );
    }
    attrValue = extractions[0];
  }
  return attrValue;
});

const EXTRACT_ITEM_INDEX = Symbol.for("extract_item_index");

export const extractValue = traceWrap(function extractValue(result: any, targetKey: string, context: Context): any {
  let transferTarget: any = result;
  let transferKey = "";

  for (const property of targetKey.split(".")) {
    if (transferKey) {
      const currentTransferredValue = transferTarget[transferKey];

      if (!currentTransferredValue || Array.isArray(transferTarget)) {
        if (
          Array.isArray(transferTarget) &&
          transferTarget.length &&
          transferTarget[transferTarget.length - 1][EXTRACT_ITEM_INDEX] === context.multipleIndex
        ) {
          transferTarget = transferTarget[transferTarget.length - 1];
        } else {
          throw new CustomHookError("No value to extract", CustomHookErrorCodes.EXTRACT_NO_VALUE, {
            result,
            targetKey,
            transferKey,
            transferTarget,
          });
        }
      } else {
        transferTarget = transferTarget[transferKey];
      }
    }
    transferKey = property;
  }
  return transferTarget[transferKey];
});

const mapValue = traceWrap(function mapValue(value: string, mapping: TransferMapping | undefined): string {
  if (!value) {
    return value;
  }

  if (mapping) {
    if (mapping.include) {
      const lowerValue = value.toLowerCase();

      for (const [mappingKey, mappingValue] of Object.entries(mapping.include)) {
        if (lowerValue.includes(mappingKey)) {
          return mappingValue;
        }
      }
    }
  }
  return value;
});

const getTransferContext = traceWrap(function getTransferContext<Target extends object>(
  targetKey: string,
  result: Target,
  context: Context,
) {
  let transferTarget: any = result;
  let transferKey = "";

  for (const property of targetKey.split(".")) {
    if (transferKey) {
      const currentTransferredValue = transferTarget[transferKey];

      if (!currentTransferredValue || Array.isArray(transferTarget)) {
        // either reuse last item, if index matches, or create new item
        if (
          Array.isArray(transferTarget) &&
          transferTarget.length &&
          transferTarget[transferTarget.length - 1][EXTRACT_ITEM_INDEX] === context.multipleIndex
        ) {
          // reuse item
          transferTarget = transferTarget[transferTarget.length - 1];
        } else {
          // create new item
          const newValue = property === "[*]" ? [] : { [EXTRACT_ITEM_INDEX]: context.multipleIndex };

          if (Array.isArray(transferTarget)) {
            transferTarget.push(newValue);
          } else {
            transferTarget[transferKey] = newValue;
          }
          transferTarget = newValue;
        }
      } else {
        transferTarget = transferTarget[transferKey];
      }
    }
    transferKey = property;
  }

  if (transferKey === "[*]") {
    throw new CustomHookError(
      "Cannot transfer non-object type as object type - wrong transferkey, initially: " + targetKey,
      CustomHookErrorCodes.TRANSFER_WRONG_KEY,
      {
        transferKey,
        targetKey,
        result,
      },
    );
  }

  return { transferKey, transferTarget };
});

const transferValue = traceWrap(function transferValue<Target extends object>(
  value: string,
  transfer: BasicTransfer<Target>,
  result: Target,
  context: Context,
): void {
  const { transferKey, transferTarget } = getTransferContext(transfer.targetKey, result, context);
  value = mapValue(value, transfer.mapping);

  try {
    const coercedValue = coerceType(value, transfer.type);

    if (Array.isArray(transferTarget)) {
      transferTarget.push(coercedValue);
    } else {
      transferTarget[transferKey] = coercedValue;
    }
  } catch (error) {
    if (!transfer.optional) {
      throw error;
    }
  }
});

const applyBasicSelector = traceWrap(function applyBasicSelector<Target extends object>(
  element: Cheerio<Element>,
  selector: SimpleSelector<Target>,
  base: string,
  result: Partial<Target>,
  context: Context,
) {
  const transfers: Array<SimpleTransfer<Target>> = selector.transfers || [];

  let text: string | undefined;
  let html: string | null = null;

  for (const transfer of transfers) {
    let value: string;

    if (transfer.extract && Object.keys(transfer.extract).length) {
      value = getAttributeValue(element, transfer.extract, base);
    } else if (transfer.html) {
      if (html == null) {
        html = element.html() || "";
      }
      value = html;
    } else {
      if (text == null) {
        text = sanitizeString(getText(element).trim());
      }
      value = text;
    }

    // @ts-expect-error
    transferValue(value, transfer, result, context);
  }
  for (const variable of selector.variables || []) {
    let value;

    if (variable.extract) {
      value = getAttributeValue(element, variable.extract, base);
    } else {
      if (text == null) {
        text = sanitizeString(getText(element).trim());
      }
      value = text;
    }
    context.variables[variable.variableName] = value;
  }
  return result;
});

const applyRegexSelector = traceWrap(function applyRegexSelector<Target extends object>(
  element: Cheerio<Element>,
  selector: RegexSelector<Target>,
  base: string,
  result: Partial<Target>,
  context: Context,
) {
  const transfers: Array<RegexTransfer<Target>> = selector.transfers || [];

  let match: RegExpExecArray | null | undefined;

  for (const transfer of transfers) {
    let value: string;

    if (typeof transfer.extract === "object" && Object.keys(transfer.extract).length) {
      value = getAttributeValue(element, transfer.extract, base);
    } else if (typeof transfer.extract === "string") {
      if (match == null) {
        const text = sanitizeString(getText(element).trim());
        match = toRegex(selector.regex).exec(text);

        if (!match) {
          throw new CustomHookError(`Could not match regex to text '${text}'`, CustomHookErrorCodes.REGEX_NO_MATCH, {
            regex: selector.regex,
            value: text,
            element: element.html(),
            selector,
            result,
          });
        }
      }

      value = transfer.extract;

      for (let index = 0; index < match.length; index++) {
        const groupValue = match[index] || "";
        const replaceRegex = new RegExp("\\$" + index + "(\\D|$)");
        value = value.replace(replaceRegex, groupValue);
      }
    }

    // @ts-expect-error
    transferValue(value, transfer, result, context);
  }
  for (const variable of selector.variables || []) {
    let value = "";

    if (variable.extract) {
      value = getAttributeValue(element, variable.extract, base);
    } else if (variable.value) {
      if (match == null) {
        const text = sanitizeString(getText(element).trim());
        match = toRegex(selector.regex).exec(text);

        if (!match) {
          throw new CustomHookError(`Could not match regex to text '${text}'`, CustomHookErrorCodes.REGEX_NO_MATCH, {
            regex: selector.regex,
            value: text,
            element: element.html(),
            selector,
            result,
          });
        }
      }

      value = variable.value;

      for (let index = 0; index < match.length; index++) {
        const groupValue = match[index] || "";
        const replaceRegex = new RegExp("\\$" + index + "(\\D|$)");
        value = value.replace(replaceRegex, groupValue);
      }
    }
    context.variables[variable.variableName] = value;
  }
  return result;
});

const applyJsonSelector = traceWrap(function applyJsonSelector<Target extends object, Source extends object>(
  element: Source,
  selector: JsonSelector<Target, Source>,
  result: Partial<Target>,
  context: Context,
) {
  const transfers: Array<JSONTransfer<Target, Source>> = selector.transfers || [];

  for (const transfer of transfers) {
    let value: string = extractValue(element, transfer.sourceKey, context);
    value = mapValue(value, transfer.mapping);

    const { transferKey, transferTarget } = getTransferContext(transfer.targetKey, result, context);
    transferTarget[transferKey] = value;
  }
  return result;
});

const applySelector = traceWrap(function applySelector<Target extends object>(
  element: Cheerio<Element>,
  selector: Selector<Target>,
  base: string,
  context: Context,
) {
  if ("regex" in selector && "pattern" in selector.regex && selector.regex.pattern) {
    return applyRegexSelector(element, selector, base, {}, context);
  } else {
    return applyBasicSelector(element, selector as SimpleSelector<Target>, base, {}, context);
  }
});

interface Context {
  transferKeysIndices: Record<string, number | "DONE">;
  multipleIndex: number;
  variables: Record<string, string>;
}

export function defaultContext(): Context {
  return {
    transferKeysIndices: {},
    multipleIndex: 0,
    variables: {},
  };
}

export const extractJSON = traceWrap(function extractJSON<Target extends object, Source extends object>(
  target: any,
  selector: JsonSelector<Target, Source>,
  context: Context,
): Array<Partial<Target>> {
  let found = extractValue(target, selector.selector, context);

  if (!Array.isArray(found)) {
    if (found) {
      found = [found];
    } else {
      found = [];
    }
  }

  logger.debug(`Matched selector ${selector.selector} found ${found.length as string} matches`);
  logger.debug(`Has multiple: ${!!selector.multiple + ""}`);

  let results: Array<Partial<Target>> = [];

  if ((selector.multiple && found.length > 1) || found.length === 1) {
    for (let index = 0; index < found.length; index++) {
      if (selector.multiple) {
        context.multipleIndex = index;
      }
      results.push(applyJsonSelector(found[index], selector, {}, context));
    }
  } else {
    throw new CustomHookError(
      "Invalid Selector: no exact match found for: " + selector.selector,
      CustomHookErrorCodes.SELECTOR_NO_MATCH,
      {
        selector,
        element: target,
        found,
      },
    );
  }
  if (selector.children?.length) {
    const nextBuckets: Array<Array<Array<Partial<Target>>>> = Array.from({ length: results.length }, () => []);

    // merge children with 'parent' results with children overriding parents
    for (const child of selector.children) {
      // length of 'found' and 'results' must be the same
      for (let index = 0; index < found.length; index++) {
        if (selector.multiple) {
          context.multipleIndex = index;
        }
        const extractResults = extractJSON(found[index], child, context);
        nextBuckets[index].push(extractResults);
      }
    }

    const nextResults: Array<Partial<Target>> = [];

    for (let index = 0; index < results.length; index++) {
      const currentPartial = results[index];
      const nexts = nextBuckets[index];

      let multipleBucket: Array<Partial<Target>> | undefined;

      for (const bucket of nexts) {
        if (bucket.length > 1) {
          if (multipleBucket != null) {
            throw new CustomHookError(
              "Multiple Child Selectors of the same parent with multiple=true are not allowed",
              CustomHookErrorCodes.MULTIPLE_IN_MULTIPLE_SIBLINGS,
              {
                nextResults,
                nextBuckets,
                index,
                multipleBucket,
                bucket,
                parent: selector,
              },
            );
          }
          multipleBucket = bucket;
        } else {
          const [partial] = bucket;
          merge(currentPartial, partial);
        }
      }

      if (multipleBucket) {
        for (const partial of multipleBucket) {
          nextResults.push(Object.assign(partial, currentPartial));
        }
      } else {
        nextResults.push(currentPartial);
      }
    }
    results = nextResults;
  }
  return results;
});

export const extract = traceWrap(function extract<Target extends object>(
  element: Cheerio<Element>,
  selector: Selector<Target>,
  baseUri: string,
  context: Context = defaultContext(),
): Array<Partial<Target>> {
  const found = element.find(selector.selector);
  logger.debug(`Matched selector ${selector.selector} found ${found.length} matches`);
  let results: Array<Partial<Target>> = [];

  if ((selector.multiple && found.length > 1) || found.length === 1) {
    for (let index = 0; index < found.length; index++) {
      if (selector.multiple) {
        context.multipleIndex = index;
      }
      results.push(applySelector(found.eq(index), selector, baseUri, context));
    }
  } else {
    throw new CustomHookError(
      "Invalid Selector: no exact match found for: " + selector.selector,
      CustomHookErrorCodes.SELECTOR_NO_MATCH,
      {
        selector,
        element: element.html(),
        found: found.html(),
      },
    );
  }
  if (selector.children?.length) {
    const nextBuckets: Array<Array<Array<Partial<Target>>>> = Array.from({ length: results.length }, () => []);

    // merge children with 'parent' results with children overriding parents
    for (const child of selector.children) {
      // length of 'found' and 'results' must be the same
      for (let index = 0; index < found.length; index++) {
        if (selector.multiple) {
          context.multipleIndex = index;
        }
        const extractResults = extract(found.eq(index), child, baseUri, context);
        nextBuckets[index].push(extractResults);
      }
    }

    const nextResults: Array<Partial<Target>> = [];

    for (let index = 0; index < results.length; index++) {
      const currentPartial = results[index];
      const nexts = nextBuckets[index];

      let multipleBucket: Array<Partial<Target>> | undefined;

      for (const bucket of nexts) {
        if (bucket.length > 1) {
          if (multipleBucket != null) {
            throw new CustomHookError(
              "Multiple Child Selectors of the same parent with multiple=true are not allowed",
              CustomHookErrorCodes.MULTIPLE_IN_MULTIPLE_SIBLINGS,
              {
                nextResults,
                nextBuckets,
                index,
                multipleBucket,
                bucket,
                parent: selector,
              },
            );
          }
          multipleBucket = bucket;
        } else {
          const [partial] = bucket;
          merge(currentPartial, partial);
        }
      }

      if (multipleBucket) {
        for (const partial of multipleBucket) {
          nextResults.push(Object.assign(partial, currentPartial));
        }
      } else {
        nextResults.push(currentPartial);
      }
    }
    results = nextResults;
  }
  return results;
});

const mergeSameIndexSymbol = traceWrap(function mergeSameIndexSymbol(
  target: Array<Record<string | symbol, any>>,
  source: Array<Record<string | symbol, any>>,
) {
  const indices: Record<number, Record<string | symbol, any>> = {};
  let processingTarget = true;

  const filter = (value: Record<string | symbol, any>) => {
    const index = value[EXTRACT_ITEM_INDEX];

    if (index != null) {
      if (indices[index]) {
        merge(indices[index], value);
      } else {
        indices[index] = value;

        if (!processingTarget) {
          target.push(value);
        }
      }
      return false;
    }
    return true;
  };
  target.forEach(filter);
  processingTarget = false;
  target.push(...source.filter(filter));
});

export const merge = traceWrap(function merge<T extends any[] | Record<string, any>>(target: T, source: T): T {
  if (Array.isArray(target) && Array.isArray(source)) {
    if (target[0]?.[EXTRACT_ITEM_INDEX] != null) {
      mergeSameIndexSymbol(target, source);
    } else {
      target.push(...source);
    }
  } else if (!Array.isArray(target) && !Array.isArray(source)) {
    for (const key of Object.keys(target)) {
      if (key in source) {
        const sourceValue = source[key];
        const targetValue = target[key];

        if (typeof sourceValue === "object" && typeof targetValue === "object") {
          merge(targetValue, sourceValue);
        } else {
          throw new CustomHookError(
            `Cannot merge non object values: key: '${key}', target: '${targetValue + ""}', source: '${
              sourceValue + ""
            }'`,
            CustomHookErrorCodes.MERGE_TYPE_NON_OBJECT,
            {
              target,
              source,
              key,
              targetValue,
              sourceValue,
            },
          );
        }
      }
    }
    for (const key of Object.keys(source)) {
      // do not overwrite values in target
      if (key in target) {
        continue;
      }

      target[key] = source[key];
    }
  } else {
    throw new CustomHookError(
      "Mismatched Value Types - both do not have same array or object type",
      CustomHookErrorCodes.MERGE_TYPE_MISMATCH,
      {
        target,
        source,
      },
    );
  }
  return target;
});

const templateString = traceWrap(function templateString(value: string, context: Context): string {
  const originalValue = value;
  const braces: Array<{ type: string; index: number }> = [];
  let lastBrace: { type: string; index: number } | undefined;

  for (let index = 0; index < value.length; index++) {
    const char = value[index];

    if (char === "{") {
      if (lastBrace && lastBrace.type === char) {
        throw new CustomHookError(
          "Two consecutive opening braces are not allowed!",
          CustomHookErrorCodes.TEMPLATE_MISSING_CLOSE_BRACE,
          {
            currentIndex: index,
            lastBrace,
            template: value,
          },
        );
      } else {
        lastBrace = { type: char, index };
        braces.push(lastBrace);
      }
    } else if (char === "}") {
      if (!lastBrace || lastBrace.type === char) {
        throw new CustomHookError("Missing Opening Brace!", CustomHookErrorCodes.TEMPLATE_MISSING_OPEN_BRACE, {
          currentIndex: index,
          lastBrace,
          template: value,
        });
      } else {
        lastBrace = { type: char, index };
        braces.push(lastBrace);
      }
    }
  }

  if (braces.length % 2 !== 0) {
    throw new CustomHookError("Missing Closing Brace!", CustomHookErrorCodes.TEMPLATE_MISSING_CLOSE_BRACE, {
      currentIndex: undefined,
      lastBrace,
      template: value,
    });
  }

  const replaceables: Record<string, string> = {};

  for (let index = 0; index < braces.length; index += 2) {
    const opening = braces[index];
    const closing = braces[index + 1];

    const originalName = value.slice(opening.index + 1, closing.index);
    let variableName = originalName;

    const match = variableName.match(/(.+)\[(\d+)]/);

    if (match) {
      variableName = match[1];
    }

    if (!(variableName in context.variables)) {
      throw new CustomHookError(
        `Unknown Variable '${variableName}', original: '${originalName}'!`,
        CustomHookErrorCodes.TEMPLATE_UNKNOWN_VARIABLE,
        {
          opening,
          closing,
          originalVariableName: originalName,
          variableName,
          template: value,
        },
      );
    }

    let variableValue = context.variables[variableName];

    if (match) {
      variableValue = variableValue[Number(match[2])];
    }

    if (variableValue == null) {
      throw new CustomHookError(
        `Variable '${originalName}' has no value!`,
        CustomHookErrorCodes.TEMPLATE_VARIABLE_NO_VALUE,
        {
          originalVariableName: originalName,
          variableName,
          template: value,
        },
      );
    }

    replaceables[originalName] = variableValue;
  }

  for (const [replaceName, replaceValue] of Object.entries(replaceables)) {
    value = value.replaceAll(`{${replaceName}}`, replaceValue);
  }
  logger.debug(`Templated Value '${originalValue}' into ${value}`);
  return value;
});

export const makeRequest = traceWrap(function makeRequest(
  targetUrl: string,
  context: Context,
  requestConfig?: RequestConfig,
): Promise<CheerioAPI | any> {
  // @ts-expect-error
  const options: Options = {};

  if (requestConfig) {
    if (requestConfig.regexUrl && requestConfig.transformUrl) {
      const transformedUrl = extractFromRegex(targetUrl, toRegex(requestConfig.regexUrl), requestConfig.transformUrl);

      if (!transformedUrl) {
        throw new CustomHookError("URL Transformation failed", CustomHookErrorCodes.REQUEST_URL_TRANSFORMATION_FAIL, {
          requestConfig,
          targetUrl,
        });
      }

      targetUrl = transformedUrl[0];
    }
    if (requestConfig.templateUrl) {
      targetUrl = templateString(requestConfig.templateUrl, context);
    }
    if (requestConfig.templateBody) {
      options.body = templateString(requestConfig.templateBody, context);
    }
    if (requestConfig.options) {
      Object.assign(options, requestConfig.options);
    }
  }
  // @ts-expect-error
  options.url = targetUrl;

  logger.debug("Requesting url: " + targetUrl);
  if (requestConfig?.jsonResponse) {
    return queueRequest(targetUrl, options).then((value) => JSON.parse(value));
  }
  return queueCheerioRequest(targetUrl, options);
});
