import { useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Alert } from 'react-bootstrap';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { EditorView } from '@codemirror/view';
import { decodeShareCode, analyzeCode, type CodeFlag } from '../utils/share';
import { useStore } from '../store/useStore';

export default function ShareWarningPage() {
  const { encoded } = useParams<{ encoded: string }>();
  const navigate = useNavigate();
  const setCode = useStore((s) => s.setCode);
  const reset = useStore((s) => s.reset);

  const code = useMemo(() => {
    if (!encoded) return null;
    return decodeShareCode(encoded);
  }, [encoded]);

  const flags: CodeFlag[] = useMemo(() => {
    if (!code) return [];
    return analyzeCode(code);
  }, [code]);

  const extensions = useMemo(
    () => [javascript(), EditorView.editable.of(false)],
    [],
  );

  const handleRunCode = useCallback(() => {
    if (code) {
      reset();
      setCode(code);
      navigate('/');
    }
  }, [code, reset, setCode, navigate]);

  const handleCancel = useCallback(() => {
    navigate('/');
  }, [navigate]);

  if (!code) {
    return (
      <div className="warning-page p-4">
        <Alert variant="danger">
          <Alert.Heading>Invalid Share Link</Alert.Heading>
          <p>The shared code could not be decoded. The link may be corrupted.</p>
          <Button variant="primary" onClick={handleCancel}>
            Go to JSTutor
          </Button>
        </Alert>
      </div>
    );
  }

  return (
    <div className="warning-page p-4">
      <Card>
        <Card.Header className="bg-warning text-dark">
          <h5 className="mb-0">⚠ You're about to run someone else's code</h5>
        </Card.Header>
        <Card.Body>
          <p>
            This code will execute in your browser.{' '}
            <strong>Only run code from people you trust.</strong>
          </p>

          {/* Static analysis flags */}
          {flags.length > 0 ? (
            flags.map((flag, i) => (
              <Alert key={i} variant="warning" className="py-1 px-2 mb-1" style={{ fontSize: '0.85rem' }}>
                ⚠ {flag.message}
              </Alert>
            ))
          ) : (
            <></>
          )}

          {/* Read-only code preview */}
          <div className="border rounded my-3" style={{ maxHeight: '400px', overflow: 'auto' }}>
            <CodeMirror
              value={code}
              extensions={extensions}
              theme="light"
              readOnly={true}
              basicSetup={{
                lineNumbers: true,
                highlightActiveLine: false,
                foldGutter: false,
              }}
            />
          </div>

          <div className="d-flex gap-2">
            <Button variant="success" onClick={handleRunCode}>
              View & Run Code
            </Button>
            <Button variant="outline-secondary" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
