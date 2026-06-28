// Tiny parallel-with-limit runner. No dependencies.
//
// Each worker pulls the next index from a shared cursor until exhausted.
// Results land in the same order as the input array. The `fn` itself decides
// how to surface success vs failure — typically by side-effecting into React
// state — so this helper never throws and never needs a result type.
//
// Used by the Campaign Builder to run many AI generations in parallel without
// hammering the provider (default cap = 3 simultaneous requests).

export async function runWithConcurrency<T>(
  items: readonly T[],
  fn: (item: T, index: number) => Promise<void>,
  limit: number
): Promise<void> {
  if (items.length === 0) return;
  const workers = Math.max(1, Math.min(limit, items.length));
  let cursor = 0;
  await Promise.all(
    Array.from({ length: workers }, async () => {
      while (true) {
        const i = cursor++;
        if (i >= items.length) return;
        try {
          await fn(items[i], i);
        } catch (e) {
          // The caller is expected to capture errors into per-item state.
          // If something escapes here it would otherwise crash the worker
          // and stop draining the queue — swallow defensively and log.
          // eslint-disable-next-line no-console
          console.warn("[runWithConcurrency] worker caught an unhandled error", e);
        }
      }
    })
  );
}
