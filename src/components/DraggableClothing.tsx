import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Clothing } from '../types';

interface DraggableClothingProps {
  clothing: Clothing;
  inCanvas?: boolean;
  position?: { x: number; y: number };
  scale?: number;
  onRemove?: () => void;
}

export default function DraggableClothing({
  clothing,
  inCanvas = false,
  position,
  scale = 1,
  onRemove,
}: DraggableClothingProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: inCanvas ? `canvas-${clothing.id}` : clothing.id,
    data: { clothing, inCanvas },
  });

  const style = inCanvas && position
    ? {
        position: 'absolute' as const,
        left: position.x,
        top: position.y,
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 50 : 10,
      }
    : {
        transform: CSS.Translate.toString(transform),
      };

  if (inCanvas) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`group relative cursor-move ${isDragging ? 'opacity-75' : ''}`}
        {...listeners}
        {...attributes}
      >
        <div
          className="rounded-lg overflow-hidden shadow-lg bg-white"
          style={{ width: 100 * scale, height: 100 * scale }}
        >
          <img
            src={clothing.imageUrl}
            alt={clothing.category}
            className="w-full h-full object-cover"
            draggable={false}
          />
        </div>
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-sm"
          >
            ×
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
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
