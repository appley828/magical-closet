import { useCallback, useEffect, useRef, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Clothing } from '../types';
import { usePinchZoom } from '../hooks/usePinchZoom';

interface DraggableClothingProps {
  clothing: Clothing;
  inCanvas?: boolean;
  position?: { x: number; y: number };
  scale?: number;
  selected?: boolean;
  onSelect?: () => void;
  onRemove?: () => void;
  onScaleChange?: (newScale: number) => void;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 3.0;

const clampScale = (value: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

export default function DraggableClothing({
  clothing,
  inCanvas = false,
  position,
  scale = 1,
  selected = false,
  onSelect,
  onRemove,
  onScaleChange,
}: DraggableClothingProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: inCanvas ? `canvas-${clothing.id}` : clothing.id,
    data: { clothing, inCanvas },
  });

  // 手勢進行中的即時縮放值：只重繪這一件衣服，結束才寫回外部狀態（避免整頁 re-render 造成卡頓）
  const [liveScale, setLiveScale] = useState<number | null>(null);
  const displayScale = liveScale ?? scale;
  const displayScaleRef = useRef(displayScale);
  useEffect(() => {
    displayScaleRef.current = displayScale;
  });

  const commitScale = useCallback(
    (newScale: number) => {
      setLiveScale(null);
      onScaleChange?.(newScale);
    },
    [onScaleChange]
  );

  const { setRef: setPinchRef } = usePinchZoom({
    enabled: inCanvas && !!onScaleChange,
    currentScale: scale,
    onLiveScale: setLiveScale,
    onCommitScale: commitScale,
    minScale: MIN_SCALE,
    maxScale: MAX_SCALE,
  });

  const nodeRef = useRef<HTMLElement | null>(null);
  const combinedRef = useCallback(
    (node: HTMLElement | null) => {
      nodeRef.current = node;
      setNodeRef(node);
      setPinchRef(node);
    },
    [setNodeRef, setPinchRef]
  );

  // Web：選取後可用滾輪／觸控板捏合縮放（原生監聽才能 preventDefault）
  const wheelCommitTimer = useRef<number | null>(null);
  useEffect(() => {
    const el = nodeRef.current;
    if (!el || !inCanvas || !selected || !onScaleChange) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const newScale = clampScale(displayScaleRef.current * Math.exp(-e.deltaY * 0.002));
      setLiveScale(newScale);
      if (wheelCommitTimer.current !== null) {
        window.clearTimeout(wheelCommitTimer.current);
      }
      wheelCommitTimer.current = window.setTimeout(() => {
        wheelCommitTimer.current = null;
        setLiveScale(null);
        onScaleChange(newScale);
      }, 200);
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
    };
  }, [inCanvas, selected, onScaleChange]);

  // 角落縮放把手
  const resizeRef = useRef<{ startX: number; startY: number; startScale: number; lastScale: number } | null>(null);

  const handleResizePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    resizeRef.current = { startX: e.clientX, startY: e.clientY, startScale: scale, lastScale: scale };
  };

  const handleResizePointerMove = (e: React.PointerEvent) => {
    if (!resizeRef.current || !onScaleChange) return;
    const dx = e.clientX - resizeRef.current.startX;
    const dy = e.clientY - resizeRef.current.startY;
    const newScale = clampScale(resizeRef.current.startScale + (dx + dy) / 200);
    resizeRef.current.lastScale = newScale;
    setLiveScale(newScale);
  };

  const handleResizePointerUp = (e: React.PointerEvent) => {
    if (!resizeRef.current) return;
    const target = e.currentTarget as HTMLElement;
    if (target.hasPointerCapture(e.pointerId)) {
      target.releasePointerCapture(e.pointerId);
    }
    const finalScale = resizeRef.current.lastScale;
    resizeRef.current = null;
    commitScale(finalScale);
  };

  const style: React.CSSProperties = inCanvas && position
    ? {
        position: 'absolute',
        left: position.x,
        top: position.y,
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 50 : 10,
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
      }
    : {
        transform: CSS.Translate.toString(transform),
        // 清單項目允許瀏覽器捲動，長按才會啟動拖拉
        touchAction: 'manipulation',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
      };

  const controlsVisibility = selected ? 'opacity-100' : 'opacity-0 sm:group-hover:opacity-100';

  if (inCanvas) {
    return (
      <div
        ref={combinedRef}
        style={style}
        data-draggable
        className={`group relative cursor-move ${isDragging ? 'opacity-75' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.();
        }}
        {...listeners}
        {...attributes}
      >
        <div
          className="rounded-lg overflow-hidden"
          style={{ width: 100 * displayScale, height: 100 * displayScale }}
        >
          <img
            src={clothing.imageUrl}
            alt={clothing.category}
            className="w-full h-full object-contain"
            draggable={false}
          />
        </div>
        {/* Remove button */}
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className={`absolute -top-3 -right-3 w-7 h-7 bg-red-500 text-white rounded-full transition-opacity flex items-center justify-center text-sm ${controlsVisibility}`}
          >
            ×
          </button>
        )}
        {/* Resize handle (bottom-right corner) — 外框放大觸控範圍，圖示維持小巧 */}
        {onScaleChange && (
          <div
            onPointerDown={handleResizePointerDown}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            onPointerCancel={handleResizePointerUp}
            className={`absolute -bottom-3 -right-3 w-9 h-9 cursor-nwse-resize transition-opacity flex items-end justify-end p-2 ${controlsVisibility}`}
            style={{ touchAction: 'none' }}
          >
            <svg viewBox="0 0 20 20" className="w-5 h-5 text-gray-600 drop-shadow">
              <path d="M17 3L3 17M17 8L8 17M17 13L13 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
            </svg>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={combinedRef}
      style={style}
      className={`cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-50' : ''}`}
      {...listeners}
      {...attributes}
    >
      <div className="w-20 h-20 rounded-lg overflow-hidden shadow-sm bg-white hover:shadow-md transition-shadow">
        <img
          src={clothing.imageUrl}
          alt={clothing.category}
          className="w-full h-full object-cover"
          draggable={false}
        />
      </div>
      <p className="mt-1 text-xs text-center text-gray-600 truncate w-20">
        {clothing.category}
      </p>
    </div>
  );
}
