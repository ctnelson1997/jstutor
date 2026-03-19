import { useEffect, useMemo } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { decodeShareCode } from '../utils/share';
import { useStore } from '../store/useStore';
import { runCode } from '../engine/executor';
import App from '../App';

export default function EmbedPage() {
  const { encoded } = useParams<{ encoded: string }>();
  const setCode = useStore((s) => s.setCode);
  const reset = useStore((s) => s.reset);

  const code = useMemo(() => {
    if (!encoded) return null;
    return decodeShareCode(encoded);
  }, [encoded]);

  useEffect(() => {
    if (code) {
      reset();
      setCode(code);
      runCode(code);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encoded]);

  if (!code) return <Navigate to="/" replace />;

  return <App embed />;
}
