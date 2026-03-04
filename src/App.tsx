import { useEffect, useState } from 'react';
import { Container, Row, Col, Toast, ToastContainer, Button } from 'react-bootstrap';
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
      <Container fluid className="main-layout px-0">
        <Row className="g-0">
          <Col lg={5} className="editor-column border-end">
            <EditorPanel />
          </Col>
          <Col lg={7} className="viz-column">
            <VisualizationPanel />
          </Col>
        </Row>
      </Container>

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
