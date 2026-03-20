import type { WorkerMessage, ExecutionSnapshot } from '../../types/snapshot';

/**
 * Mock Python executor — returns a handful of hardcoded snapshots
 * regardless of input. This is a placeholder until a real Python
 * engine (e.g. Pyodide) is integrated.
 */
export async function execute(_source: string): Promise<WorkerMessage> {
  const snapshots: ExecutionSnapshot[] = [
    {
      step: 0,
      line: 1,
      callStack: [
        {
          name: '<module>',
          variables: [
            { name: 'x', value: { type: 'number', value: 1 } },
          ],
        },
      ],
      heap: [],
      stdout: [],
    },
    {
      step: 1,
      line: 2,
      callStack: [
        {
          name: '<module>',
          variables: [
            { name: 'x', value: { type: 'number', value: 1 } },
            { name: 'y', value: { type: 'number', value: 2 } },
          ],
        },
      ],
      heap: [],
      stdout: [],
    },
    {
      step: 2,
      line: 3,
      callStack: [
        {
          name: '<module>',
          variables: [
            { name: 'x', value: { type: 'number', value: 1 } },
            { name: 'y', value: { type: 'number', value: 2 } },
            { name: 'z', value: { type: 'number', value: 3 } },
          ],
        },
      ],
      heap: [],
      stdout: [],
    },
    {
      step: 3,
      line: 4,
      callStack: [
        {
          name: '<module>',
          variables: [
            { name: 'x', value: { type: 'number', value: 1 } },
            { name: 'y', value: { type: 'number', value: 2 } },
            { name: 'z', value: { type: 'number', value: 3 } },
          ],
        },
      ],
      heap: [],
      stdout: ['3'],
    },
  ];

  return { type: 'result', snapshots };
}
