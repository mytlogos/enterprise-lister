export class ParseError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, ParseError);
  }
}

export class ValidationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, ValidationError);
  }
}

export class DatabaseError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, DatabaseError);
  }
}

export class SchemaError extends DatabaseError {
  public constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, SchemaError);
  }
}

export class MigrationError extends DatabaseError {
  public constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, MigrationError);
  }
}

export class DuplicateEntityError extends DatabaseError {
  public constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, DuplicateEntityError);
  }
}

export class MissingEntityError extends DatabaseError {
  public constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, MissingEntityError);
  }
}

export class DatabaseConnectionError extends DatabaseError {
  public constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, DatabaseConnectionError);
  }
}

export class JobError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, JobError);
  }
}

export class NotImplementedError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, NotImplementedError);
  }
}

export class UnsupportedError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, UnsupportedError);
  }
}

export class CredentialError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, CredentialError);
  }
}

export class SessionError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, SessionError);
  }
}

export class ConfigurationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, ConfigurationError);
  }
}
