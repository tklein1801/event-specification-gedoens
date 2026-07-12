import { CustomError } from './CustomError';

export type MigrationErrorCode =
  'EMPTY_INPUT' | 'INVALID_SYNTAX' | 'INVALID_DOCUMENT' | 'INVALID_ACTION';

export class InvalidAsyncApiSpecification extends CustomError {
  constructor(
    message: string,
    readonly code: MigrationErrorCode = 'INVALID_DOCUMENT',
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}
