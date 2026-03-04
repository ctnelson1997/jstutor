import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';

interface Arrow {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Draws SVG arrows from every `.ref-dot[id^="ref-"]` element
 * to the corresponding `#heap-{heapId}` card.
 *
 * Must be rendered inside the scrollable viz container so that
 * positions are relative to the same coordinate space.
 */
export default function PointerArrows({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const currentStep = useStore((s) => s.currentStep);
  const snapshots = useStore((s) => s.snapshots);

  const computeArrows = useCallback((): Arrow[] => {
    const container = containerRef.current;
    if (!container) return [];

    const containerRect = container.getBoundingClientRect();
    const dots = container.querySelectorAll<HTMLElement>('.ref-dot');
    const arrows: Arrow[] = [];

    dots.forEach((dot) => {
      // FramesView uses id="ref-{heapId}", HeapView uses id="heap-ref-{heapId}"
      const heapId = dot.id.replace(/^(heap-)?ref-/, '');
      const target = container.querySelector<HTMLElement>(`#heap-${CSS.escape(heapId)}`);
      if (!target) return;

      const dotRect = dot.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();

      // Source: center of the dot
      const x1 = dotRect.left + dotRect.width / 2 - containerRect.left + container.scrollLeft;
      const y1 = dotRect.top + dotRect.height / 2 - containerRect.top + container.scrollTop;

      // Target: left-center of the heap card
      const x2 = targetRect.left - containerRect.left + container.scrollLeft;
      const y2 = targetRect.top + targetRect.height / 2 - containerRect.top + container.scrollTop;

      arrows.push({ id: heapId, x1, y1, x2, y2 });
    });

    return arrows;
  }, [containerRef]);

  const draw = useCallback(() => {
    const svg = svgRef.current;
    const container = containerRef.current;
    if (!svg || !container) return;

    // Size the SVG to cover the full scrollable area
    svg.setAttribute('width', String(container.scrollWidth));
    svg.setAttribute('height', String(container.scrollHeight));

    const arrows = computeArrows();

    // Build SVG content (defs + paths)
    const paths = arrows.map((a, i) => {
      // Quadratic bezier curving to the right
      const dx = a.x2 - a.x1;
      const dy = a.y2 - a.y1;
      const cx = a.x1 + dx * 0.5 + Math.abs(dy) * 0.15;
      const cy = a.y1 + dy * 0.5;

      return `<path
        d="M${a.x1},${a.y1} Q${cx},${cy} ${a.x2},${a.y2}"
        class="pointer-arrow"
        marker-end="url(#arrowhead)"
        data-heap="${a.id}"
        key="${i}"
      />`;
    }).join('');

    svg.innerHTML = `
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6"
          refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
          <polygon points="0 0, 8 3, 0 6" fill="#0d6efd" />
        </marker>
      </defs>
      ${paths}
    `;
  }, [computeArrows, containerRef]);

  useEffect(() => {
    // Redraw after a microtask so DOM layout is settled
    const raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [draw, currentStep, snapshots]);

  // Redraw on resize and scroll
  useEffect(() => {
    const container = containerRef.current;
    window.addEventListener('resize', draw);
    container?.addEventListener('scroll', draw);
    return () => {
      window.removeEventListener('resize', draw);
      container?.removeEventListener('scroll', draw);
    };
  }, [draw, containerRef]);

  return (
    <svg
      ref={svgRef}
      className="pointer-arrows-svg"
    />
  );
}
