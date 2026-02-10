import { useCallback, useRef } from 'react';
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

  const { setRef: setPinchRef } = usePinchZoom({
    currentScale: scale,
    onScaleChange: onScaleChange ?? (() => {}),
    minScale: MIN_SCALE,
    maxScale: MAX_SCALE,
  });

  const combinedRef = useCallback(
    (node: HTMLElement | null) => {
      setNodeRef(node);
      setPinchRef(node);
    },
    [setNodeRef, setPinchRef]
  );

  // Resize handle state
  const resizeRef = useRef<{ startX: number; startY: number; startScale: number } | null>(null);

  const handleResizePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    resizeRef.current = { startX: e.clientX, startY: e.clientY, startScale: scale };
  };

  const handleResizePointerMove = (e: React.PointerEvent) => {
    if (!resizeRef.current || !onScaleChange) return;
    const dx = e.clientX - resizeRef.current.startX;
    const dy = e.clientY - resizeRef.current.startY;
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, resizeRef.current.startScale + (dx + dy) / 200));
    onScaleChange(newScale);
  };

  const handleResizePointerUp = (e: React.PointerEvent) => {
    if (!resizeRef.current) return;
    const target = e.currentTarget as HTMLElement;
    target.releasePointerCapture(e.pointerId);
    resizeRef.current = null;
  };

  const style = inCanvas && position
    ? {
        position: 'absolute' as const,
        left: position.x,
        top: position.y,
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 50 : 10,
        touchAction: 'none' as const,
      }
    : {
        transform: CSS.Translate.toString(transform),
        touchAction: 'none' as const,
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
          style={{ width: 100 * scale, height: 100 * scale }}
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
            className={`absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full transition-opacity flex items-center justify-center text-sm ${controlsVisibility}`}
          >
            ×
          </button>
        )}
        {/* Resize handle (bottom-right corner) */}
        {onScaleChange && (
          <div
            onPointerDown={handleResizePointerDown}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            className={`absolute -bottom-1.5 -right-1.5 w-5 h-5 cursor-nwse-resize transition-opacity ${controlsVisibility}`}
          >
            <svg viewBox="0 0 20 20" className="w-full h-full text-gray-600 drop-shadow">
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
