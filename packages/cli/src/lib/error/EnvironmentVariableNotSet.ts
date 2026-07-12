import { CustomError } from '@event-specification-gedoens/migration-core';

export class EnvironmentVariableNotSet extends CustomError {
  constructor(key: string) {
    super(`The environment variable '${key}' is not available in the current runtime.`);
  }
}
