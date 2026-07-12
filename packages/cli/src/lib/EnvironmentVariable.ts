import 'dotenv/config';
import { EnvironmentVariableNotSet } from './error/EnvironmentVariableNotSet';

export class EnvironmentVariable {
  readonly #key: string;
  readonly #value: string;

  constructor(key: string) {
    const value = process.env[key];
    if (value === undefined) {
      throw new EnvironmentVariableNotSet(key);
    }

    this.#key = key;
    this.#value = value;
  }

  get key() {
    return this.#key;
  }

  get value() {
    return this.#value;
  }
}
