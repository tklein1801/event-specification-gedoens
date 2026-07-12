/**
 * Gerneric custom error class that extends the built-in Error class.
 * @author developer.mozilla.org
 * @link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#custom_error_types
 */
export class CustomError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    // Pass remaining arguments (including vendor specific ones) to parent constructor
    super(message, options);

    this.name = this.constructor.name;
  }
}
