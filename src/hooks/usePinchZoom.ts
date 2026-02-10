import { useCallback, useRef, useEffect } from 'react';

interface UsePinchZoomOptions {
  currentScale: number;
  onScaleChange: (newScale: number) => void;
  minScale?: number;
  maxScale?: number;
}

function getDistance(touches: TouchList): number {
  const [a, b] = [touches[0], touches[1]];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

export function usePinchZoom({
  currentScale,
  onScaleChange,
  minScale = 0.5,
  maxScale = 3.0,
}: UsePinchZoomOptions) {
  const elementRef = useRef<HTMLElement | null>(null);
  const initialDistanceRef = useRef<number | null>(null);
  const initialScaleRef = useRef(currentScale);

  // Keep initialScaleRef in sync when not pinching
  useEffect(() => {
    if (initialDistanceRef.current === null) {
      initialScaleRef.current = currentScale;
    }
  }, [currentScale]);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        e.stopPropagation();
        initialDistanceRef.current = getDistance(e.touches);
        initialScaleRef.current = currentScale;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialDistanceRef.current !== null) {
        e.preventDefault();
        e.stopPropagation();
        const currentDistance = getDistance(e.touches);
        const ratio = currentDistance / initialDistanceRef.current;
        const newScale = Math.min(maxScale, Math.max(minScale, initialScaleRef.current * ratio));
        onScaleChange(newScale);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        initialDistanceRef.current = null;
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [currentScale, onScaleChange, minScale, maxScale]);

  const setRef = useCallback((node: HTMLElement | null) => {
    elementRef.current = node;
  }, []);

  return { setRef };
}
