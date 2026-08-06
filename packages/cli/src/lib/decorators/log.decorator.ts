import { logger } from '../logger';

export function log<This, Args extends unknown[], Return>(
  originalMethod: (this: This, ...args: Args) => Return,
  context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Return>,
): (this: This, ...args: Args) => Return {
  return function (this: This, ...args: Args): Return {
    logger.debug('-> Calling %s with %o', String(context.name), args);
    const result = originalMethod.call(this, ...args);
    logger.debug('<- %s returned %o', String(context.name), result);
    return result;
  };
}
