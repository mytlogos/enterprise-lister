declare module "query-types" {
  export function middleware();
  export function isObject(value: unknown): value is object;
  export function isNumber(value: unknown): value is number;
  export function isBoolean(value: unknown): value is boolean;
  export function isArray(value: unknown): value is any[];
  export function parseValue(value: unknown): any;
  export function parseObject(value: unknown): any;
  export function parseArray(value: unknown): any[];
  export function parseNumber(value: unknown): number;
  export function parseBoolean(value: unknown): boolean;
}
