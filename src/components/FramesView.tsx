import { Card } from 'react-bootstrap';
import { useStore } from '../store/useStore';
import type { RuntimeValue, StackFrame } from '../types/snapshot';

function ValueDisplay({ value }: { value: RuntimeValue }) {
  if (value.type === 'ref') {
    return (
      <span
        className="ref-dot"
        id={`ref-${value.heapId}`}
        title={`→ heap#${value.heapId}`}
      />
    );
  }

  // Primitive value
  const colorMap: Record<string, string> = {
    number: '#0d6efd',
    string: '#198754',
    boolean: '#fd7e14',
    null: '#6c757d',
    undefined: '#6c757d',
    symbol: '#6f42c1',
    bigint: '#0d6efd',
  };

  const color = colorMap[value.type] || '#333';
  const display =
    value.type === 'string'
      ? `"${value.value}"`
      : value.type === 'null'
        ? 'null'
        : value.type === 'undefined'
          ? 'undefined'
          : String(value.value);

  return (
    <span style={{ color, fontFamily: 'monospace', fontSize: '0.85rem' }}>
      {display}
    </span>
  );
}

function FrameCard({ frame, index }: { frame: StackFrame; index: number }) {
  const isGlobal = index === 0;
  const variant = isGlobal ? 'secondary' : 'primary';

  return (
    <Card className="frame-card mb-2" border={variant}>
      <Card.Header className={`bg-${variant} text-white`}>
        {frame.name}
      </Card.Header>
      <Card.Body>
        {frame.variables.length === 0 ? (
          <em className="text-muted" style={{ fontSize: '0.8rem' }}>No variables</em>
        ) : (
          <table className="w-100">
            <tbody>
              {frame.variables.map((v) => (
                <tr key={v.name}>
                  <td className="fw-semibold" style={{ fontFamily: 'monospace' }}>
                    {v.name}
                  </td>
                  <td className="text-end">
                    <ValueDisplay value={v.value} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card.Body>
    </Card>
  );
}

export default function FramesView() {
  const snapshots = useStore((s) => s.snapshots);
  const currentStep = useStore((s) => s.currentStep);

  if (snapshots.length === 0) return null;

  const snapshot = snapshots[currentStep];
  if (!snapshot) return null;

  // Render frames in reverse order (most recent call on top)
  const frames = [...snapshot.callStack].reverse();

  return (
    <div>
      {frames.map((frame, i) => (
        <FrameCard key={`${frame.name}-${i}`} frame={frame} index={snapshot.callStack.length - 1 - i} />
      ))}
    </div>
  );
}
