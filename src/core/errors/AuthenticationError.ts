import { AppError } from './AppError';

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required', code = 'AUTHENTICATION_ERROR') {
    super(message, 401, code);
  }
}
