import { useCallback, useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { EditorView, Decoration, type DecorationSet } from '@codemirror/view';
import { StateField, StateEffect } from '@codemirror/state';
import { useStore } from '../store/useStore';

// ── Line highlight via CodeMirror state effect ──

const setHighlightLine = StateEffect.define<number | null>();

const highlightField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decos, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setHighlightLine)) {
        if (effect.value === null) return Decoration.none;
        const line = effect.value;
        if (line < 1 || line > tr.state.doc.lines) return Decoration.none;
        const lineObj = tr.state.doc.line(line);
        const deco = Decoration.line({ class: 'cm-current-step-line' });
        return Decoration.set([deco.range(lineObj.from)]);
      }
    }
    return decos;
  },
  provide: (f) => EditorView.decorations.from(f),
});

export default function EditorPanel() {
  const code = useStore((s) => s.code);
  const setCode = useStore((s) => s.setCode);
  const snapshots = useStore((s) => s.snapshots);
  const currentStep = useStore((s) => s.currentStep);
  const error = useStore((s) => s.error);

  const extensions = useMemo(() => [javascript(), highlightField], []);

  const onChange = useCallback(
    (value: string) => {
      setCode(value);
    },
    [setCode],
  );

  // Determine which line to highlight
  const highlightLine =
    snapshots.length > 0 && snapshots[currentStep]
      ? snapshots[currentStep].line
      : null;

  // Update the highlight decoration when step changes
  const onCreateEditor = useCallback(
    (view: EditorView) => {
      // Store the view reference for later updates
      (window as unknown as Record<string, unknown>).__cmView = view;
    },
    [],
  );

  // Keep highlight in sync via an effect dispatch.
  // Only dispatch when the desired line actually differs from the current
  // decoration state to avoid triggering an infinite update loop.
  const onUpdate = useCallback(
    (viewUpdate: { view: EditorView }) => {
      const view = viewUpdate.view;
      const decoSet = view.state.field(highlightField);
      let currentlyHighlighted: number | null = null;
      const iter = decoSet.iter();
      if (iter.value) {
        currentlyHighlighted = view.state.doc.lineAt(iter.from).number;
      }
      if (currentlyHighlighted !== highlightLine) {
        view.dispatch({
          effects: setHighlightLine.of(highlightLine),
        });
      }
    },
    [highlightLine],
  );

  return (
    <div className="d-flex flex-column h-100">
      {/* Error display */}
      {error && (
        <div className="alert alert-danger m-2 py-1 px-2 mb-0" role="alert" style={{ fontSize: '0.85rem' }}>
          <strong>Error{error.line ? ` (line ${error.line})` : ''}:</strong> {error.message}
        </div>
      )}

      {/* CodeMirror editor */}
      <div className="flex-grow-1" style={{ minHeight: 0 }}>
        <CodeMirror
          value={code}
          extensions={extensions}
          onChange={onChange}
          onCreateEditor={onCreateEditor}
          onUpdate={onUpdate}
          theme="light"
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: false,
          }}
        />
      </div>
    </div>
  );
}
