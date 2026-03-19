import type { ExecutionSnapshot, RuntimeValue } from '../types/snapshot';

function serializeValue(v: RuntimeValue): string {
  if (v.type === 'ref') return `ref:${v.heapId}`;
  return `${v.type}:${v.value}`;
}

/**
 * Compare two consecutive snapshots and return a Set of keys
 * identifying values that changed (or are newly created).
 *
 * Key formats:
 *   Stack variables:  "var:<frameName>:<varName>"
 *   Heap properties:  "heap:<objectId>:<propKey>"
 */
export function getChangedKeys(
  prev: ExecutionSnapshot | undefined,
  curr: ExecutionSnapshot | undefined,
): Set<string> {
  const changed = new Set<string>();
  if (!curr) return changed;
  if (!prev) return changed; // first step — nothing to compare

  // --- Stack variables ---
  const prevVarMap = new Map<string, string>();
  for (const frame of prev.callStack) {
    for (const v of frame.variables) {
      prevVarMap.set(`var:${frame.name}:${v.name}`, serializeValue(v.value));
    }
    if (frame.closureVars) {
      for (const v of frame.closureVars) {
        prevVarMap.set(`closure:${frame.name}:${v.name}`, serializeValue(v.value));
      }
    }
  }
  for (const frame of curr.callStack) {
    for (const v of frame.variables) {
      const key = `var:${frame.name}:${v.name}`;
      const prevVal = prevVarMap.get(key);
      if (prevVal === undefined || prevVal !== serializeValue(v.value)) {
        changed.add(key);
      }
    }
    if (frame.closureVars) {
      for (const v of frame.closureVars) {
        const key = `closure:${frame.name}:${v.name}`;
        const prevVal = prevVarMap.get(key);
        if (prevVal === undefined || prevVal !== serializeValue(v.value)) {
          changed.add(key);
        }
      }
    }
  }

  // --- Heap properties ---
  const prevHeapMap = new Map<string, Map<string, string>>();
  for (const obj of prev.heap) {
    const props = new Map<string, string>();
    for (const p of obj.properties) {
      props.set(p.key, serializeValue(p.value));
    }
    prevHeapMap.set(obj.id, props);
  }
  for (const obj of curr.heap) {
    const prevProps = prevHeapMap.get(obj.id);
    for (const p of obj.properties) {
      const key = `heap:${obj.id}:${p.key}`;
      const prevVal = prevProps?.get(p.key);
      if (prevVal === undefined || prevVal !== serializeValue(p.value)) {
        changed.add(key);
      }
    }
  }

  return changed;
}
