export class RestResponseError extends Error {
  public readonly errorCode: number;
  public readonly errorMessage: string;
  public readonly errorData: any;

  public constructor(code: number, msg: string, data: any) {
    super();
    this.name = "RestHandlerError";
    this.errorCode = code;
    this.errorMessage = msg;
    this.errorData = data;
  }
}
