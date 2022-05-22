export class RestResponseError extends Error {
  public readonly errorCode: number;
  public readonly errorData: any;

  public constructor(code: number, message: string, data: any) {
    super(message);
    this.name = this.constructor.name;
    this.errorCode = code;
    this.errorData = data;
  }
}
