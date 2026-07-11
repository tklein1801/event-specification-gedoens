import 'dotenv/config';
import { EnvironmentVariableNotSet } from './error/EnvironmentVariableNotSet';

export class EnvironmentVariable<T> {
  private #key: string;
  private #value: T;

  constructor(key: string) {
    if (!process.env[key]) {
      throw new EnvironmentVariableNotSet(key);
    }

    this.#key = key;
    this.#value = process.env[key];
  }

  get key() {
    return this.#key;
  }

  get value() {
    return this.#value;
  }
}
