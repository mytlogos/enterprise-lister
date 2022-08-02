import { JSONSchema7 as Schema, JSONSchema7TypeName } from "json-schema";
import { ExcludeRequiredProps } from "./types";
import ajv, { JSONSchemaType } from "ajv";
export * from "ajv";
export { ajv };

type RequireField<T, K extends keyof T> = T & Required<Pick<T, K>>;

export interface TypedSchema<T extends JSONSchema7TypeName> {
  type: T;
}

export interface LinkSchema {
  type: "string";
  format: string;
  pattern: string;
}

export interface UuidSchema {
  type: "string";
  format: "uuid";
}

export interface StringSchema {
  type: "string";
}

export interface IdSchema {
  type: "integer";
  minimum: 1;
}

export interface ArraySchema<T extends { type: string }> {
  type: "array";
  items: T;
}

interface NumberKeywords {
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
  format?: string;
}

interface StringKeywords {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
}

function deepFreeze<T extends Record<string, any>>(record: T): T {
  // Retrieve the property names defined on object
  const propNames = Object.getOwnPropertyNames(record);

  // Freeze properties before freezing self

  for (const name of propNames) {
    const value = record[name];

    if (value && typeof value === "object") {
      deepFreeze(value);
    }
  }

  return Object.freeze(record);
}

export function schema<T extends RequireField<Schema, "$id" | "type">>(value: T): Readonly<T> {
  value.$schema = "http://json-schema.org/draft-07/schema#";

  // by default forbid any additionally defined properties
  if (value.type === "object" && value.additionalProperties == null) {
    value.additionalProperties = false;
  }
  return deepFreeze(value);
}

export function object<R extends Record<string, any>>(value: JSONSchemaType<R>): Readonly<JSONSchemaType<R>> {
  value.type = "object";

  // by default forbid any additionally defined properties
  if (value.additionalProperties == null) {
    value.additionalProperties = false;
  }
  return deepFreeze(value);
}

export function string(value: StringKeywords = {}): TypedSchema<"string"> {
  return { ...value, type: "string" };
}

export function integer(value: NumberKeywords = {}): TypedSchema<"integer"> {
  return { ...value, type: "integer" };
}

export function number(value: NumberKeywords = {}): TypedSchema<"number"> {
  return { ...value, type: "number" };
}

export function boolean(): TypedSchema<"boolean"> {
  return { type: "boolean" };
}

export function id(value: NumberKeywords = {}): IdSchema {
  return { ...value, type: "integer", minimum: 1 };
}

export function idArray(value: ExcludeRequiredProps<ArraySchema<IdSchema>> = {}): ArraySchema<IdSchema> {
  return { ...value, type: "array", items: { type: "integer", minimum: 1 } };
}

export function stringArray(value: ExcludeRequiredProps<ArraySchema<StringSchema>> = {}): ArraySchema<StringSchema> {
  return { ...value, type: "array", items: string() };
}

export function linkArray(value: ExcludeRequiredProps<ArraySchema<LinkSchema>> = {}): ArraySchema<LinkSchema> {
  return { ...value, type: "array", items: link() };
}

export function uuidArray(value: ExcludeRequiredProps<ArraySchema<UuidSchema>> = {}): ArraySchema<UuidSchema> {
  return { ...value, type: "array", items: uuid() };
}

export function link(value: StringKeywords = {}): LinkSchema {
  return {
    ...value,
    type: "string",
    format: "uri",
    pattern: "^https?://.+",
  };
}

export function uuid(value: StringKeywords = {}): UuidSchema {
  return {
    ...value,
    type: "string",
    format: "uuid",
  };
}
