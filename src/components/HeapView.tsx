import { useState, useMemo } from 'react';
import { Card, ButtonGroup, Button } from 'react-bootstrap';
import { useStore } from '../store/useStore';
import type { HeapObject, RuntimeValue, StackFrame } from '../types/snapshot';

function ValueDisplay({ value }: { value: RuntimeValue }) {
  if (value.type === 'ref') {
    return (
      <span
        className="ref-dot"
        id={`heap-ref-${value.heapId}`}
        title={`→ heap#${value.heapId}`}
      />
    );
  }

  const display =
    value.type === 'string'
      ? `"${value.value}"`
      : value.type === 'null'
        ? 'null'
        : value.type === 'undefined'
          ? 'undefined'
          : String(value.value);

  return (
    <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
      {display}
    </span>
  );
}

function ArrayDisplay({ obj }: { obj: HeapObject }) {
  return (
    <div className="array-cells">
      {obj.properties.map((prop, i) => (
        <div key={i} className="array-cell">
          <span className="cell-index">{prop.key}</span>
          <ValueDisplay value={prop.value} />
        </div>
      ))}
      {obj.properties.length === 0 && (
        <div className="array-cell text-muted" style={{ fontStyle: 'italic' }}>
          empty
        </div>
      )}
    </div>
  );
}

function ObjectDisplay({ obj }: { obj: HeapObject }) {
  return (
    <table className="w-100">
      <tbody>
        {obj.properties.map((prop) => (
          <tr key={prop.key}>
            <td style={{ fontFamily: 'monospace', fontWeight: 500, fontSize: '0.8rem' }}>
              {prop.key}
            </td>
            <td className="text-end">
              <ValueDisplay value={prop.value} />
            </td>
          </tr>
        ))}
        {obj.properties.length === 0 && (
          <tr>
            <td colSpan={2} className="text-muted" style={{ fontStyle: 'italic' }}>
              empty object
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function FunctionDisplay({ obj }: { obj: HeapObject }) {
  return (
    <div style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
      <span style={{ color: '#6f42c1' }}>ƒ</span>{' '}
      {obj.label || 'anonymous'}()
    </div>
  );
}

function HeapCard({ obj }: { obj: HeapObject }) {
  const typeLabels: Record<string, string> = {
    array: 'Array',
    object: 'Object',
    function: 'Function',
    class: 'Class',
    date: 'Date',
    regexp: 'RegExp',
    map: 'Map',
    set: 'Set',
    error: 'Error',
  };

  const label = obj.label
    ? `${typeLabels[obj.objectType] || obj.objectType}: ${obj.label}`
    : typeLabels[obj.objectType] || obj.objectType;

  const variant =
    obj.objectType === 'array'
      ? 'info'
      : obj.objectType === 'function'
        ? 'dark'
        : 'warning';

  return (
    <Card className="heap-card mb-2" border={variant} id={`heap-${obj.id}`}>
      <Card.Header className={`bg-${variant} bg-opacity-25`}>
        {label}
        <span className="text-muted ms-1" style={{ fontSize: '0.65rem' }}>
          #{obj.id}
        </span>
      </Card.Header>
      <Card.Body>
        {obj.objectType === 'array' ? (
          <ArrayDisplay obj={obj} />
        ) : obj.objectType === 'function' ? (
          <FunctionDisplay obj={obj} />
        ) : (
          <ObjectDisplay obj={obj} />
        )}
      </Card.Body>
    </Card>
  );
}

type HeapFilter = 'all' | 'current';

/** Collect heap IDs directly referenced by a frame's variables. */
function refsInFrame(frame: StackFrame): Set<string> {
  const ids = new Set<string>();
  for (const v of frame.variables) {
    if (v.value.type === 'ref') ids.add(v.value.heapId);
  }
  return ids;
}

export default function HeapView() {
  const snapshots = useStore((s) => s.snapshots);
  const currentStep = useStore((s) => s.currentStep);
  const [filter, setFilter] = useState<HeapFilter>('all');

  const snapshot = snapshots[currentStep];

  const visibleObjects = useMemo(() => {
    if (!snapshot || snapshot.heap.length === 0) return [];
    if (filter === 'all') return snapshot.heap;

    // "current" — only objects referenced by the top (most recent) frame
    const topFrame = snapshot.callStack[snapshot.callStack.length - 1];
    if (!topFrame) return snapshot.heap;
    const topRefs = refsInFrame(topFrame);
    return snapshot.heap.filter((obj) => topRefs.has(obj.id));
  }, [snapshot, filter]);

  if (snapshots.length === 0) return null;
  if (!snapshot || snapshot.heap.length === 0) {
    return <div className="text-muted" style={{ fontSize: '0.85rem' }}>No heap objects</div>;
  }

  return (
    <div>
      <ButtonGroup size="sm" className="mb-2">
        <Button
          variant={filter === 'all' ? 'primary' : 'outline-primary'}
          onClick={() => setFilter('all')}
          style={{ fontSize: '0.7rem' }}
        >
          All frames
        </Button>
        <Button
          variant={filter === 'current' ? 'primary' : 'outline-primary'}
          onClick={() => setFilter('current')}
          style={{ fontSize: '0.7rem' }}
        >
          Current frame
        </Button>
      </ButtonGroup>
      {visibleObjects.length === 0 ? (
        <div className="text-muted" style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>
          No objects in this frame
        </div>
      ) : (
        <div className="d-flex flex-wrap gap-2">
          {visibleObjects.map((obj) => (
            <HeapCard key={obj.id} obj={obj} />
          ))}
        </div>
      )}
    </div>
  );
}
