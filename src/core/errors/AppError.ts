export interface FieldError {
  field: string;
  message: string;
  code: string;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  /**
   * true  -> an expected outcome (bad input, missing record, denied access).
   *          Safe to show the client, logged at WARN.
   * false -> a bug or infrastructure failure. Generic message to the client,
   *          logged at ERROR with the stack.
   */
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode = 500,
    code = 'INTERNAL_ERROR',
    details?: unknown,
    isOperational = true,
  ) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, new.target);
  }
}
