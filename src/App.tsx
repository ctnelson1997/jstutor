import { useEffect, useState, useRef, useCallback } from 'react';
import { Toast, ToastContainer, Button } from 'react-bootstrap';
import AppNavbar from './components/AppNavbar';
import ControlBar from './components/ControlBar';
import EditorPanel from './components/EditorPanel';
import VisualizationPanel from './components/VisualizationPanel';
import { useStore } from './store/useStore';
import { runCode } from './engine/executor';

export default function App() {
  const stepForward = useStore((s) => s.stepForward);
  const stepBackward = useStore((s) => s.stepBackward);
  const code = useStore((s) => s.code);
  const snapshots = useStore((s) => s.snapshots);

  const shouldShowToast = localStorage.getItem('jstutor-hide-warning') !== 'true';
  const [showToast, setShowToast] = useState(false);

  // Resizable split (desktop only)
  const [splitPercent, setSplitPercent] = useState(40);
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mobile detection & tab state
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 991px)').matches);
  const [activeTab, setActiveTab] = useState<'editor' | 'viz'>('editor');

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 991px)');
    const handler = () => setIsMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Auto-switch to viz tab on mobile when visualization runs
  const hasSnapshots = snapshots.length > 0;
  useEffect(() => {
    if (isMobile && hasSnapshots) {
      setActiveTab('viz');
    }
  }, [isMobile, hasSnapshots]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    setSplitPercent(Math.min(80, Math.max(20, pct)));
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }, []);

  useEffect(() => {
    if (shouldShowToast) {
      const id = requestAnimationFrame(() => setShowToast(true));
      return () => cancelAnimationFrame(id);
    }
  }, [shouldShowToast]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.cm-editor')) {
        if (e.key === 'Enter' && e.shiftKey) {
          e.preventDefault();
          runCode(code);
        }
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        stepForward();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepBackward();
      } else if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        runCode(code);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [stepForward, stepBackward, code]);

  return (
    <>
      <AppNavbar />

      {isMobile ? (
        <div className="mobile-layout">
          <ControlBar />
          <div className="mobile-tab-bar">
            <button
              className={`mobile-tab${activeTab === 'editor' ? ' active' : ''}`}
              onClick={() => setActiveTab('editor')}
            >
              Editor
            </button>
            <button
              className={`mobile-tab${activeTab === 'viz' ? ' active' : ''}`}
              onClick={() => setActiveTab('viz')}
            >
              Visualization
            </button>
          </div>
          <div className="mobile-panel">
            {activeTab === 'editor' ? <EditorPanel /> : <VisualizationPanel />}
          </div>
        </div>
      ) : (
        <div
          className="main-layout"
          ref={containerRef}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <div className="editor-column border-end" style={{ width: `${splitPercent}%` }}>
            <EditorPanel />
          </div>
          <div
            className="split-divider"
            onPointerDown={onPointerDown}
          />
          <div className="viz-column" style={{ width: `${100 - splitPercent}%` }}>
            <ControlBar />
            <VisualizationPanel />
          </div>
        </div>
      )}

      <ToastContainer position="bottom-end" className="p-3" style={{ zIndex: 1080 }}>
        <Toast show={showToast} onClose={() => setShowToast(false)} animation>
          <Toast.Header closeButton>
            <strong className="me-auto">⚠️ Experimental Tool</strong>
          </Toast.Header>
          <Toast.Body>
            This tool is currently experimental and may produce inaccurate visualizations.
            <div className="mt-2">
              <Button
                variant="dark"
                size="sm"
                onClick={() => {
                  localStorage.setItem('jstutor-hide-warning', 'true');
                  setShowToast(false);
                }}
              >
                Don't Show Again
              </Button>
            </div>
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </>
  );
}
