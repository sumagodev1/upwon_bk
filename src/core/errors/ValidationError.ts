import { AppError, FieldError } from './AppError';

export class ValidationError extends AppError {
  public readonly fields: FieldError[];

  constructor(message = 'Validation failed', fields: FieldError[] = []) {
    super(message, 422, 'VALIDATION_ERROR', fields);
    this.fields = fields;
  }
}
