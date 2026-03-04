import { Button, Form, Spinner } from 'react-bootstrap';
import { useStore } from '../store/useStore';
import { runCode } from '../engine/executor';
import { encodeShareCode } from '../utils/share';

export default function ControlBar() {
  const code = useStore((s) => s.code);
  const snapshots = useStore((s) => s.snapshots);
  const currentStep = useStore((s) => s.currentStep);
  const isRunning = useStore((s) => s.isRunning);
  const setCurrentStep = useStore((s) => s.setCurrentStep);
  const stepForward = useStore((s) => s.stepForward);
  const stepBackward = useStore((s) => s.stepBackward);
  const stepFirst = useStore((s) => s.stepFirst);
  const stepLast = useStore((s) => s.stepLast);
  const reset = useStore((s) => s.reset);

  const total = snapshots.length;
  const hasSteps = total > 0;

  const handleVisualize = async () => {
    if (hasSteps) {
      // Stop visualization — clear snapshots
      reset();
    } else {
      await runCode(code);
    }
  };

  const handleShare = async () => {
    const encoded = encodeShareCode(code);
    const url = `${window.location.origin}${window.location.pathname}#/share/${encoded}`;
    try {
      await navigator.clipboard.writeText(url);
      alert('Share link copied to clipboard!');
    } catch {
      prompt('Copy this share link:', url);
    }
  };

  return (
    <div className="control-bar px-2">
      <div className="d-flex align-items-center gap-2 mb-1">
        <Button
          variant={hasSteps ? 'danger' : 'success'}
          size="sm"
          onClick={handleVisualize}
          disabled={isRunning || !code.trim()}
        >
          {isRunning ? (
            <>
              <Spinner animation="border" size="sm" className="me-1" />
              Running...
            </>
          ) : hasSteps ? (
            'Stop Visualization'
          ) : (
            'Visualize'
          )}
        </Button>
        {hasSteps && (
          <>
            <div className="vr" />
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={stepFirst}
              disabled={currentStep === 0}
              title="First step"
            >
              ⏮
            </Button>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={stepBackward}
              disabled={currentStep === 0}
              title="Previous step (← arrow key)"
            >
              ◀
            </Button>
            <span className="text-muted" style={{ fontSize: '0.85rem', minWidth: '100px', textAlign: 'center' }}>
              Step {currentStep + 1} of {total}
            </span>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={stepForward}
              disabled={currentStep === total - 1}
              title="Next step (→ arrow key)"
            >
              ▶
            </Button>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={stepLast}
              disabled={currentStep === total - 1}
              title="Last step"
            >
              ⏭
            </Button>
          </>
        )}
        <div className="vr" />
        <Button variant="outline-secondary" size="sm" onClick={handleShare} title="Copy share link">
          Share
        </Button>
      </div>
      {hasSteps && (
        <Form.Range
          className="step-slider"
          min={0}
          max={total - 1}
          value={currentStep}
          onChange={(e) => setCurrentStep(Number(e.target.value))}
        />
      )}
    </div>
  );
}
