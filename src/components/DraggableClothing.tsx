import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Clothing } from '../types';

interface DraggableClothingProps {
  clothing: Clothing;
  /** 已經穿在畫布上 */
  active?: boolean;
  /** 點一下：穿上／脫下 */
  onTap: () => void;
  size?: 'sm' | 'md';
}

/**
 * 選衣服清單裡的一件衣服：點一下直接穿上，也可以長按拖到畫布指定位置
 */
export default function DraggableClothing({ clothing, active = false, onTap, size = 'md' }: DraggableClothingProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: clothing.id,
    data: { clothing },
  });

  const boxSize = size === 'sm' ? 'w-16 h-16' : 'w-20 h-20';

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        // 清單允許瀏覽器捲動，長按才會啟動拖拉
        touchAction: 'manipulation',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
      className={`shrink-0 cursor-pointer ${isDragging ? 'opacity-40' : ''}`}
      onClick={onTap}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onTap();
        }
      }}
      {...listeners}
      {...attributes}
      role="button"
      aria-pressed={active}
      aria-label={`${clothing.category}${active ? '（已穿上）' : ''}`}
    >
      <div
        className={`relative ${boxSize} rounded-lg overflow-hidden bg-white transition-all ${
          active ? 'ring-2 ring-pink-500 shadow-md' : 'border border-gray-200 hover:shadow-md'
        }`}
      >
        <img
          src={clothing.imageUrl}
          alt={clothing.category}
          className="w-full h-full object-contain p-1"
          draggable={false}
        />
        {active && (
          <span className="absolute top-0.5 right-0.5 w-5 h-5 bg-pink-500 text-white rounded-full flex items-center justify-center">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </span>
        )}
      </div>
      <p className={`mt-1 text-xs text-center truncate ${size === 'sm' ? 'w-16' : 'w-20'} ${active ? 'text-pink-600 font-medium' : 'text-gray-600'}`}>
        {clothing.category}
        {clothing.size && <span className="text-gray-400"> {clothing.size}</span>}
      </p>
    </div>
  );
}
