import { Cheerio, Element } from "cheerio";
import { Options } from "cloudscraper";
import { relativeToAbsoluteTime, sanitizeString } from "enterprise-core/dist/tools";
import * as url from "url";
import { queueCheerioRequest } from "../queueManager";
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
} from "./types";

function toRegex(value: RegExp | JsonRegex): RegExp {
  if (value instanceof RegExp) {
    return value;
  }
  return new RegExp(value.pattern, value.flags);
}

export function extractFromRegex(value: string, regex: RegExp, ...replace: string[]) {
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
}

function coerceType(value: string, type: TransferType): string | number | Date {
  if (!value) {
    throw Error("Empty value");
  }
  if (type === "date") {
    const lowerDate = value.toLowerCase();

    if (lowerDate.includes("now") || lowerDate.includes("ago")) {
      const date = relativeToAbsoluteTime(value);

      if (!date) {
        throw Error(`Could not coerce value '${value}' into a date`);
      }
      return date;
    } else {
      return new Date(value);
    }
  }
  if (type === "decimal") {
    const decimal = Number(value);

    if (Number.isNaN(decimal)) {
      throw Error(`Could not coerce value '${value}' into a decimal`);
    }
    return decimal;
  }
  if (type === "integer") {
    const integer = Number(value);

    if (!Number.isInteger(integer)) {
      throw Error(`Could not coerce value '${value}' into a integer`);
    }
    return integer;
  }

  if (type === "string") {
    return value;
  }
  throw Error("unknown type " + type);
}

function getAttributeValue(element: Cheerio<Element>, attribute: AttributeSelector, base: string) {
  let attrValue = element.attr(attribute.attribute);

  if (attrValue === undefined) {
    throw Error("Attribute Value is undefined");
  }

  if (attribute.resolve === true) {
    attrValue = new url.URL(attrValue, base).href;
  } else if (attribute.resolve) {
    attrValue = new url.URL(attrValue, attribute.resolve).href;
  }

  if ("regex" in attribute) {
    const extractions = extractFromRegex(attrValue, toRegex(attribute.regex), attribute.replace);

    if (!extractions) {
      throw Error(`Could not transform value: ${attrValue} to ${attribute.replace}`);
    }
    attrValue = extractions[0];
  }
  return attrValue;
}

const EXTRACT_ITEM_INDEX = Symbol.for("extract_item_index");

function transferValue<Target extends object>(
  value: string,
  transfer: BasicTransfer<Target>,
  result: Target,
  context: Context,
): void {
  let transferTarget: any = result;
  let transferKey = "";

  for (const property of transfer.targetKey.split(".")) {
    if (transferKey) {
      const currentTransferredValue = transferTarget[transferKey];

      if (!currentTransferredValue || Array.isArray(transferTarget)) {
        // either reuse last item, if index matches, or create new item
        if (
          Array.isArray(transferTarget) &&
          transferTarget.length &&
          transferTarget[transferTarget.length - 1][EXTRACT_ITEM_INDEX] == context.multipleIndex
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
    throw Error("Cannot transfer non-object type as object type - wrong transferkey, initially: " + transfer.targetKey);
  }

  if (transfer.mapping) {
    if (transfer.mapping.include) {
      value = value.toLowerCase();

      for (const [mappingKey, mappingValue] of Object.entries(transfer.mapping.include)) {
        if (value.includes(mappingKey)) {
          value = mappingValue;
          break;
        }
      }
    }
  }

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
}

function applyBasicSelector<Target extends object>(
  element: Cheerio<Element>,
  selector: SimpleSelector<Target>,
  base: string,
  result: Partial<Target>,
  context: Context,
) {
  const transfers: Array<SimpleTransfer<Target>> = selector.transfers || [];

  let text: string | undefined = undefined;

  for (const transfer of transfers) {
    let value: string;

    if (transfer.extract) {
      value = getAttributeValue(element, transfer.extract, base);
    } else {
      if (text == undefined) {
        text = sanitizeString(element.text().trim());
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
      if (text == undefined) {
        text = sanitizeString(element.text().trim());
      }
      value = text;
    }
    context.variables[variable.variableName] = value;
  }
  return result;
}

function applyRegexSelector<Target extends object>(
  element: Cheerio<Element>,
  selector: RegexSelector<Target>,
  base: string,
  result: Partial<Target>,
  context: Context,
) {
  const transfers: Array<RegexTransfer<Target>> = selector.transfers || [];

  let match: RegExpExecArray | null | undefined = undefined;

  for (const transfer of transfers) {
    let value: string;

    if (typeof transfer.extract === "object") {
      value = getAttributeValue(element, transfer.extract, base);
    } else {
      if (match === undefined) {
        const text = sanitizeString(element.text().trim());
        match = toRegex(selector.regex).exec(text);

        if (!match) {
          throw Error(`Could not match regex to text '${text}'`);
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
      if (match === undefined) {
        const text = sanitizeString(element.text().trim());
        match = toRegex(selector.regex).exec(text);

        if (!match) {
          throw Error(`Could not match regex to text '${text}'`);
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
}

function applySelector<Target extends object>(
  element: Cheerio<Element>,
  selector: Selector<Target>,
  base: string,
  context: Context,
) {
  if ("regex" in selector) {
    return applyRegexSelector(element, selector, base, {}, context);
  } else {
    return applyBasicSelector(element, selector, base, {}, context);
  }
}

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

export function extract<Target extends object>(
  element: Cheerio<Element>,
  selector: Selector<Target>,
  baseUri: string,
  context: Context = defaultContext(),
): Array<Partial<Target>> {
  const found = element.find(selector.selector);
  console.log(`Matched selector ${selector.selector} found ${found.length} matches`);
  let results: Array<Partial<Target>> = [];

  if ((selector.multiple && found.length > 1) || found.length === 1) {
    for (let index = 0; index < found.length; index++) {
      if (selector.multiple) {
        context.multipleIndex = index;
      }
      results.push(applySelector(found.eq(index), selector, baseUri, context));
    }
  } else {
    throw Error("Invalid Selector: no exact match found for: " + selector.selector);
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

      let multipleBucket: Array<Partial<Target>> | undefined = undefined;

      for (const bucket of nexts) {
        if (bucket.length > 1) {
          if (multipleBucket != undefined) {
            throw Error("Multiple Child Selectors of the same parent with multiple=true are not allowed");
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
}

function mergeSameIndexSymbol(
  target: Array<Record<string | symbol, any>>,
  source: Array<Record<string | symbol, any>>,
) {
  const indices: Record<number, Record<string | symbol, any>> = {};
  let processingTarget = true;

  const filter = (value: Record<string | symbol, any>) => {
    const index = value[EXTRACT_ITEM_INDEX];

    if (index != undefined) {
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
}

export function merge<T extends any[] | Record<string, any>>(target: T, source: T): T {
  if (Array.isArray(target) && Array.isArray(source)) {
    if (target[0] && target[0][EXTRACT_ITEM_INDEX] != undefined) {
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
          throw Error(
            `Cannot merge non object values: key: '${key}', target: '${targetValue}', source: '${sourceValue}'`,
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
    throw Error("Mismatched Value Types - both do not have same array or object type");
  }
  return target;
}

function templateString(value: string, context: Context): string {
  const originalValue = value;
  const braces: Array<{ type: string; index: number }> = [];
  let lastBrace: { type: string; index: number } | undefined = undefined;

  for (let index = 0; index < value.length; index++) {
    const char = value[index];

    if (char === "{") {
      if (lastBrace && lastBrace.type === char) {
        throw Error("two consecutive opening braces are not allowed!");
      } else {
        lastBrace = { type: char, index };
        braces.push(lastBrace);
      }
    } else if (char === "}") {
      if (!lastBrace || lastBrace.type === char) {
        throw Error("missing opening brace!");
      } else {
        lastBrace = { type: char, index };
        braces.push(lastBrace);
      }
    }
  }

  if (braces.length % 2 !== 0) {
    throw Error("missing closing brace!");
  }

  const replaceables: Record<string, string> = {};

  for (let index = 0; index < braces.length; index += 2) {
    const opening = braces[index];
    const closing = braces[index + 1];

    const variableName = value.slice(opening.index + 1, closing.index);

    if (!(variableName in context.variables)) {
      throw Error(`Unknown Variable '${variableName}'!`);
    }
    const variableValue = context.variables[variableName];

    if (variableValue == undefined) {
      throw Error(`Variable '${variableName}' has no value!`);
    }

    replaceables[variableName] = variableValue;
  }

  for (const [replaceName, replaceValue] of Object.entries(replaceables)) {
    value = value.replaceAll(`{${replaceName}}`, replaceValue);
  }
  console.log(`Templated Value '${originalValue}' into ${value}`);
  return value;
}

export function makeRequest(targetUrl: string, context: Context, requestConfig?: RequestConfig) {
  // @ts-expect-error
  const options: Options = {};

  if (requestConfig) {
    if (requestConfig.regexUrl && requestConfig.transformUrl) {
      const transformedUrl = extractFromRegex(targetUrl, requestConfig.regexUrl, requestConfig.transformUrl);

      if (!transformedUrl) {
        throw Error("URL Transformation failed");
      }

      targetUrl = transformedUrl[0];
    }
    if (requestConfig.templateUrl) {
      targetUrl = templateString(requestConfig.templateUrl, context);
    }
    if (requestConfig.options) {
      Object.assign(options, requestConfig.options);
    }
  }
  // @ts-expect-error
  options.url = targetUrl;

  console.log("Requesting url: " + targetUrl);
  return queueCheerioRequest(targetUrl, options as any);
}
