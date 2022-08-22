import { Schema } from "jsonschema";

declare module "jsonschema" {
  export declare class ValidatorResultError extends Error {
    public constructor(result: { instance: any; schema: Schema; errors: ValidationError[]; options: any });
    public readonly instance: any;
    public readonly schema: Schema;
    public readonly errors: ValidationError[];
    public readonly stack: string;
    public readonly name: string;
    public toString(): string;
  }
}
