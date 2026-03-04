// ── Primitive values ──

export interface PrimitiveValue {
  type: 'number' | 'string' | 'boolean' | 'null' | 'undefined' | 'symbol' | 'bigint';
  value: string | number | boolean | null;
}

// ── Heap references ──

export interface HeapRef {
  type: 'ref';
  heapId: string;
}

export type RuntimeValue = PrimitiveValue | HeapRef;

// ── Heap objects ──

export interface Property {
  key: string;
  value: RuntimeValue;
}

export type HeapObjectType =
  | 'object'
  | 'array'
  | 'function'
  | 'class'
  | 'date'
  | 'regexp'
  | 'map'
  | 'set'
  | 'error';

export interface HeapObject {
  id: string;
  objectType: HeapObjectType;
  label?: string;               // e.g. function name, class name
  properties: Property[];
  proto?: HeapRef;
}

// ── Stack frames ──

export interface Variable {
  name: string;
  value: RuntimeValue;
}

export interface StackFrame {
  name: string;
  variables: Variable[];
}

// ── Execution snapshot ──

export interface ExecutionSnapshot {
  step: number;
  line: number;
  callStack: StackFrame[];
  heap: HeapObject[];
  stdout: string[];
}

// ── Execution result from the worker ──

export type WorkerMessage =
  | { type: 'result'; snapshots: ExecutionSnapshot[] }
  | { type: 'error'; message: string; line?: number };
