/**
 * Executor
 *
 * Orchestrates: user code → instrumenter → runtime + worker → snapshots → store
 */

import { instrument } from './instrumenter';
import { getRuntimeCode } from './runtime';
import { useStore } from '../store/useStore';
import type { WorkerMessage } from '../types/snapshot';

// Worker timeout in milliseconds (safety net)
const WORKER_TIMEOUT = 10_000;

// We dynamically create workers to ensure a fresh global scope each run
function createWorker(): Worker {
  // Use a blob URL to create the worker inline
  // The worker code is simple: eval the received code and post back snapshots
  const workerCode = `
    self.onmessage = function(e) {
      var data = e.data;
      if (data.type !== 'run') return;

      try {
        // Indirect eval so var declarations go to global scope
        var indirectEval = eval;
        indirectEval(data.code);

        // Read snapshots from global scope
        var snapshots = self.__snapshots__ || [];
        self.postMessage({ type: 'result', snapshots: snapshots });
      } catch (err) {
        var message = err instanceof Error ? err.message : String(err);
        self.postMessage({ type: 'error', message: message });
      }
    };
  `;

  const blob = new Blob([workerCode], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);
  URL.revokeObjectURL(url);
  return worker;
}

/**
 * Run user code through the full pipeline:
 * 1. Parse and instrument the AST
 * 2. Prepend runtime helpers
 * 3. Execute in a Web Worker
 * 4. Collect snapshots and update the store
 */
export async function runCode(source: string): Promise<void> {
  const store = useStore.getState();

  // Reset state
  store.reset();
  store.setIsRunning(true);

  try {
    // Step 1: Instrument the code
    let instrumentedCode: string;
    try {
      instrumentedCode = instrument(source);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      // Try to extract line number from Acorn parse error
      let line: number | undefined;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((err as any)?.loc?.line) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        line = (err as any).loc.line;
      }
      store.setError({ message: `Parse error: ${message}`, line });
      store.setIsRunning(false);
      return;
    }

    // Step 2: Prepend runtime helpers
    const runtimeCode = getRuntimeCode();
    const fullCode = runtimeCode + '\n' + instrumentedCode;

    // Step 3: Execute in Worker
    const result = await executeInWorker(fullCode);

    // Step 4: Update store
    if (result.type === 'result') {
      if (result.snapshots.length === 0) {
        store.setError({ message: 'No execution steps were captured. The code may be empty or only contain declarations.' });
      } else {
        store.setSnapshots(result.snapshots);
      }
    } else {
      store.setError({ message: result.message, line: result.line });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    store.setError({ message });
  } finally {
    store.setIsRunning(false);
  }
}

/**
 * Execute instrumented code in a Web Worker with a timeout.
 */
function executeInWorker(code: string): Promise<WorkerMessage> {
  return new Promise((resolve) => {
    const worker = createWorker();

    const timeout = setTimeout(() => {
      worker.terminate();
      resolve({
        type: 'error',
        message: `Execution timed out after ${WORKER_TIMEOUT / 1000} seconds. Your code may contain an infinite loop.`,
      });
    }, WORKER_TIMEOUT);

    worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
      clearTimeout(timeout);
      worker.terminate();
      resolve(e.data);
    };

    worker.onerror = (e: ErrorEvent) => {
      clearTimeout(timeout);
      worker.terminate();
      resolve({
        type: 'error',
        message: e.message || 'An unknown error occurred in the worker.',
      });
    };

    // Send code to the worker
    worker.postMessage({ type: 'run', code });
  });
}
