/**
 * Gerneric custom error class that extends the built-in Error class.
 * @author developer.mozilla.org
 * @link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#custom_error_types
 */
export class CustomError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    // Pass remaining arguments (including vendor specific ones) to parent constructor
    super(message, options);

    // Maintains proper stack trace for where our error was thrown (non-standard)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CustomError);
    }

    this.name = this.constructor.name;
  }
}
