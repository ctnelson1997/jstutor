/**
 * Web Worker for executing instrumented JavaScript code.
 *
 * Receives messages:
 *   { type: 'run', code: string }
 *
 * Posts messages:
 *   { type: 'result', snapshots: ExecutionSnapshot[] }
 *   { type: 'error', message: string, line?: number }
 */

self.onmessage = function (e: MessageEvent) {
  const { type, code } = e.data;

  if (type !== 'run') return;

  try {
    // The `code` string contains:
    //   1. Runtime helpers (which declare __snapshots__, __capture__, etc. as globals via `var`)
    //   2. The instrumented user code
    //   3. A final expression that evaluates to __snapshots__
    //
    // We evaluate using indirect eval so that `var` declarations end up on the worker's global scope.
    // This allows __capture__ calls inside nested functions to find __snapshots__ etc.
    const indirectEval = eval;
    indirectEval(code);

    // Read snapshots from the global scope
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const snapshots = (self as any).__snapshots__ || [];
    self.postMessage({ type: 'result', snapshots });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);

    // Try to extract line info
    let line: number | undefined;
    if (err instanceof Error && err.stack) {
      // Attempt to find a line offset. This is best-effort.
      const match = err.stack.match(/<anonymous>:(\d+)/);
      if (match) {
        line = parseInt(match[1], 10);
      }
    }

    self.postMessage({ type: 'error', message, line });
  }
};

// Prevent TypeScript from complaining about module scope
export {};
