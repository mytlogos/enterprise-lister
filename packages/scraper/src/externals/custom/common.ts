import { Cheerio, Element } from "cheerio";
import { relativeToAbsoluteTime, sanitizeString } from "enterprise-core/dist/tools";
import * as url from "url";
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
} from "./types";

function toRegex(value: RegExp | JsonRegex): RegExp {
  if (value instanceof RegExp) {
    return value;
  }
  return new RegExp(value.pattern, value.flags);
}

function extractFromRegex(value: string, regex: RegExp, ...replace: string[]) {
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

function transferValue<Target extends object>(value: string, transfer: BasicTransfer<Target>, result: Target): void {
  let transferTarget: any = result;
  let transferKey = "";

  for (const property of transfer.targetKey.split(".")) {
    if (transferKey) {
      if (!transferTarget[transferKey]) {
        const newValue = property === "[*]" ? [] : {};
        transferTarget[transferKey] = newValue;
      }
      transferTarget = transferTarget[transferKey];
    }
    transferKey = property;
  }

  if (transferKey !== "[*]") {
    throw Error("Cannot transfer non-object type as object type - wrong transferkey");
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
  result: Partial<Target> = {},
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
    transferValue(value, transfer, result);
  }
  return result;
}

function applyRegexSelector<Target extends object>(
  element: Cheerio<Element>,
  selector: RegexSelector<Target>,
  base: string,
  result: Partial<Target> = {},
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
    transferValue(value, transfer, result);
  }
  return result;
}

function applySelector<Target extends object>(element: Cheerio<Element>, selector: Selector<Target>, base: string) {
  if ("regex" in selector) {
    return applyRegexSelector(element, selector, base);
  } else {
    return applyBasicSelector(element, selector, base);
  }
}

export function extract<Target extends object>(
  element: Cheerio<Element>,
  selector: Selector<Target>,
  baseUri: string,
): Array<Partial<Target>> {
  const found = element.find(selector.selector);
  console.log(`Matched selector ${selector.selector} found ${found.length} matches`);
  let results: Array<Partial<Target>> = [];

  if (selector.multiple && found.length > 1) {
    for (let index = 0; index < found.length; index++) {
      results.push(applySelector(found.eq(index), selector, baseUri));
    }
  } else if (found.length === 1) {
    results.push(applySelector(found, selector, baseUri));
  } else {
    throw Error("Invalid Selector: no exact match found for: " + selector.selector);
  }
  if (selector.children?.length) {
    const nextBuckets: Array<Array<Array<Partial<Target>>>> = Array.from({ length: results.length }, () => []);

    // merge children with 'parent' results with children overriding parents
    for (const child of selector.children) {
      // length of 'found' and 'results' must be the same
      for (let index = 0; index < found.length; index++) {
        const extractResults = extract(found.eq(index), child, baseUri);
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
          Object.assign(currentPartial, partial);
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
