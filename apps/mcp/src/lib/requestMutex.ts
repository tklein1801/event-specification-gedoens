/**
 * Serializes access to shared, process-global state. The Solace EP SDK stores
 * the auth token in a module-global OpenAPI config, so concurrent requests with
 * different tokens could otherwise leak credentials across requests.
 */
// ponytail: unbounded wait for the previous task. Add a queue timeout if
// long-running streaming requests are ever enabled.
let tail: Promise<unknown> = Promise.resolve();

export function runExclusive<T>(task: () => Promise<T>): Promise<T> {
  const result = tail.then(task, task);
  tail = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}
