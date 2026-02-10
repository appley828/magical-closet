import { useCallback } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Clothing } from '../types';
import { usePinchZoom } from '../hooks/usePinchZoom';

interface DraggableClothingProps {
  clothing: Clothing;
  inCanvas?: boolean;
  position?: { x: number; y: number };
  scale?: number;
  onRemove?: () => void;
  onScaleChange?: (newScale: number) => void;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 3.0;
const SCALE_STEP = 0.25;

export default function DraggableClothing({
  clothing,
  inCanvas = false,
  position,
  scale = 1,
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

  if (inCanvas) {
    return (
      <div
        ref={combinedRef}
        style={style}
        className={`group relative cursor-move ${isDragging ? 'opacity-75' : ''}`}
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
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center text-sm"
          >
            ×
          </button>
        )}
        {onScaleChange && (
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const newScale = Math.max(MIN_SCALE, scale - SCALE_STEP);
                onScaleChange(newScale);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="w-6 h-6 bg-gray-700 text-white rounded-full flex items-center justify-center text-xs hover:bg-gray-600 shadow"
            >
              −
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const newScale = Math.min(MAX_SCALE, scale + SCALE_STEP);
                onScaleChange(newScale);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="w-6 h-6 bg-gray-700 text-white rounded-full flex items-center justify-center text-xs hover:bg-gray-600 shadow"
            >
              +
            </button>
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
