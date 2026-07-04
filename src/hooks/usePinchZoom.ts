import { useCallback, useRef, useEffect } from 'react';

interface UsePinchZoomOptions {
  enabled?: boolean;
  currentScale: number;
  /** 手勢進行中（高頻呼叫，只應更新本地畫面） */
  onLiveScale: (newScale: number) => void;
  /** 手勢結束（寫回外部狀態） */
  onCommitScale: (newScale: number) => void;
  minScale?: number;
  maxScale?: number;
}

function getDistance(touches: TouchList): number {
  const [a, b] = [touches[0], touches[1]];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

export function usePinchZoom({
  enabled = true,
  currentScale,
  onLiveScale,
  onCommitScale,
  minScale = 0.5,
  maxScale = 3.0,
}: UsePinchZoomOptions) {
  const elementRef = useRef<HTMLElement | null>(null);

  // 最新值放 ref，事件監聽器只需綁定一次，不會在手勢進行中拆掉重綁
  const latestRef = useRef({ currentScale, onLiveScale, onCommitScale, minScale, maxScale });
  useEffect(() => {
    latestRef.current = { currentScale, onLiveScale, onCommitScale, minScale, maxScale };
  });

  const gestureRef = useRef<{ initialDistance: number; initialScale: number; lastScale: number } | null>(null);

  useEffect(() => {
    const el = elementRef.current;
    if (!el || !enabled) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        e.stopPropagation();
        gestureRef.current = {
          initialDistance: getDistance(e.touches),
          initialScale: latestRef.current.currentScale,
          lastScale: latestRef.current.currentScale,
        };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      const gesture = gestureRef.current;
      if (e.touches.length === 2 && gesture) {
        e.preventDefault();
        e.stopPropagation();
        const { minScale, maxScale, onLiveScale } = latestRef.current;
        const ratio = getDistance(e.touches) / gesture.initialDistance;
        const newScale = Math.min(maxScale, Math.max(minScale, gesture.initialScale * ratio));
        gesture.lastScale = newScale;
        onLiveScale(newScale);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      const gesture = gestureRef.current;
      if (gesture && e.touches.length < 2) {
        gestureRef.current = null;
        latestRef.current.onCommitScale(gesture.lastScale);
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [enabled]);

  const setRef = useCallback((node: HTMLElement | null) => {
    elementRef.current = node;
  }, []);

  return { setRef };
}
