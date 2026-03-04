import ControlBar from './ControlBar';
import FramesView from './FramesView';
import HeapView from './HeapView';
import ConsolePanel from './ConsolePanel';
import { useStore } from '../store/useStore';

export default function VisualizationPanel() {
  const snapshots = useStore((s) => s.snapshots);

  return (
    <div className="d-flex flex-column h-100">
      <ControlBar />
      <div className="viz-scroll p-2">
        {snapshots.length === 0 ? (
          <div className="text-center text-muted mt-5">
            <h5>Memory Visualization</h5>
            <p>Write some code and click <strong>Visualize</strong> to see how it runs step by step.</p>
          </div>
        ) : (
          <div className="d-flex flex-wrap gap-3">
            <div style={{ minWidth: '200px', flex: '1 1 40%' }}>
              <h6 className="text-muted mb-2" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>
                Frames
              </h6>
              <FramesView />
            </div>
            <div style={{ minWidth: '200px', flex: '1 1 55%' }}>
              <h6 className="text-muted mb-2" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>
                Objects
              </h6>
              <HeapView />
            </div>
          </div>
        )}
      </div>
      <ConsolePanel />
    </div>
  );
}
