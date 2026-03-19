import { useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { EXAMPLES } from '../utils/examples';
import { useStore } from '../store/useStore';
import App from '../App';

export default function ExamplePage() {
  const { slug } = useParams<{ slug: string }>();
  const setCode = useStore((s) => s.setCode);
  const reset = useStore((s) => s.reset);

  const example = EXAMPLES.find((e) => e.slug === slug);

  useEffect(() => {
    if (example) {
      reset();
      setCode(example.code);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (!example) return <Navigate to="/" replace />;

  return <App />;
}
