import { useEffect, useRef, useCallback, useState } from 'react';
import { useStore } from '../store/useStore';

export default function ConsolePanel() {
  const snapshots = useStore((s) => s.snapshots);
  const currentStep = useStore((s) => s.currentStep);
  const bottomRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  // Get stdout up to the current step
  const stdout = snapshots.length > 0 && snapshots[currentStep]
    ? snapshots[currentStep].stdout
    : [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [stdout]);

  // Drag-to-resize logic
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    const startY = e.clientY;
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const startHeight = wrapper.getBoundingClientRect().height;

    const onMouseMove = (ev: MouseEvent) => {
      const delta = startY - ev.clientY; // dragging up = bigger
      const newHeight = Math.max(60, Math.min(window.innerHeight * 0.6, startHeight + delta));
      wrapper.style.height = `${newHeight}px`;
    };

    const onMouseUp = () => {
      setDragging(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  return (
    <div ref={wrapperRef} className="console-panel-wrapper">
      <div
        className={`console-resize-handle${dragging ? ' active' : ''}`}
        onMouseDown={onMouseDown}
      />
      <div className="console-panel">
        <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '0.25rem' }}>
          Console Output
        </div>
        {stdout.length === 0 ? (
          <div style={{ color: '#666', fontStyle: 'italic' }}>No output yet</div>
        ) : (
          stdout.map((line, i) => (
            <div key={i}>{line}</div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
