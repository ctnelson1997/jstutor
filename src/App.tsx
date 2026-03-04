import { useEffect, useState, useRef, useCallback } from 'react';
import { Toast, ToastContainer, Button } from 'react-bootstrap';
import AppNavbar from './components/AppNavbar';
import EditorPanel from './components/EditorPanel';
import VisualizationPanel from './components/VisualizationPanel';
import { useStore } from './store/useStore';
import { runCode } from './engine/executor';

export default function App() {
  const stepForward = useStore((s) => s.stepForward);
  const stepBackward = useStore((s) => s.stepBackward);
  const code = useStore((s) => s.code);

  const shouldShowToast = localStorage.getItem('jstutor-hide-warning') !== 'true';
  const [showToast, setShowToast] = useState(false);

  // Resizable split
  const [splitPercent, setSplitPercent] = useState(40);
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Delay showing toast so it mounts hidden first, then fades in
  useEffect(() => {
    if (shouldShowToast) {
      const id = requestAnimationFrame(() => setShowToast(true));
      return () => cancelAnimationFrame(id);
    }
  }, [shouldShowToast]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't intercept when typing in the editor
      const target = e.target as HTMLElement;
      if (target.closest('.cm-editor')) {
        // Only intercept Shift+Enter inside the editor
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
          <VisualizationPanel />
        </div>
      </div>

      <ToastContainer position="bottom-end" className="p-3" style={{ zIndex: 1080 }}>
        <Toast show={showToast} onClose={() => setShowToast(false)} animation>
          <Toast.Header closeButton >
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
