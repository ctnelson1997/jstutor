import { useState } from 'react';
import { Button, Form, Modal, Spinner } from 'react-bootstrap';
import { useStore } from '../store/useStore';
import { runCode } from '../engine/executor';
import { encodeShareCode } from '../utils/share';

const iconStyle = { width: 14, height: 14, fill: 'currentColor', verticalAlign: '-2px' } as const;

function IconSkipStart() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" style={iconStyle}>
      <path d="M4 4a.5.5 0 0 1 1 0v3.248l6.267-3.636A.5.5 0 0 1 12 4.118v7.764a.5.5 0 0 1-.733.443L5 8.752V12a.5.5 0 0 1-1 0V4z" />
    </svg>
  );
}

function IconStepBack() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" style={iconStyle}>
      <path d="M3.86 8.753l5.482 4.796c.646.566 1.658.106 1.658-.753V3.204a1 1 0 0 0-1.659-.753l-5.48 4.796a1 1 0 0 0 0 1.506z" />
    </svg>
  );
}

function IconStepForward() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" style={iconStyle}>
      <path d="M12.14 8.753l-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z" />
    </svg>
  );
}

function IconSkipEnd() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" style={iconStyle}>
      <path d="M12 4a.5.5 0 0 0-1 0v3.248L4.733 3.612A.5.5 0 0 0 4 4.118v7.764a.5.5 0 0 0 .733.443L11 8.752V12a.5.5 0 0 0 1 0V4z" />
    </svg>
  );
}

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

  const [shareUrl, setShareUrl] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const handleShare = () => {
    const encoded = encodeShareCode(code);
    const url = `${window.location.origin}${window.location.pathname}#/share/${encoded}`;
    setShareUrl(url);
    setCopied(false);
    setShowShareModal(true);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select the input so user can copy manually
      const input = document.getElementById('share-url-input') as HTMLInputElement | null;
      input?.select();
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
              <IconSkipStart />
            </Button>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={stepBackward}
              disabled={currentStep === 0}
              title="Previous step (← arrow key)"
            >
              <IconStepBack />
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
              <IconStepForward />
            </Button>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={stepLast}
              disabled={currentStep === total - 1}
              title="Last step"
            >
              <IconSkipEnd />
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

      <Modal show={showShareModal} onHide={() => setShowShareModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: '1rem' }}>Share this snippet</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted mb-3" style={{ fontSize: '0.875rem' }}>
            Anyone with this link can view and step through your code. Paste it into a browser to open it in JSTutor.
          </p>
          <div className="d-flex gap-2">
            <Form.Control
              id="share-url-input"
              type="text"
              readOnly
              value={shareUrl}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}
            />
            <Button
              variant={copied ? 'success' : 'outline-primary'}
              size="sm"
              onClick={handleCopy}
              style={{ whiteSpace: 'nowrap', minWidth: '80px' }}
            >
              {copied ? 'Copied!' : 'Copy link'}
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
}
