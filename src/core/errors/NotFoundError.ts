import { AppError } from './AppError';

export class NotFoundError extends AppError {
  constructor(resource = 'Resource', code = 'NOT_FOUND') {
    super(resource + ' not found', 404, code);
  }
}
