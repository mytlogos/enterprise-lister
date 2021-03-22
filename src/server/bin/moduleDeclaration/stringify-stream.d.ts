declare module "stringify-stream" {
  import { Transform } from "stream";

  class Stringify extends Transform {}

  interface StringifyOptions {
    open?: string;
    sep?: string;
    close?: string;
  }

  /**
   * See JSON Replacer
   */
  type Replacer = (this: any, key: string, value: any) => any;

  export default function stringify(opts?: StringifyOptions, replacer?: Replacer, space?: string | number): Stringify;
}
