import { useDroppable } from '@dnd-kit/core';
import type { Clothing, OutfitItem } from '../types';
import DraggableClothing from './DraggableClothing';
import GirlMannequin from './GirlMannequin';

interface OutfitCanvasProps {
  items: (OutfitItem & { clothing: Clothing })[];
  onRemoveItem: (clothingId: string) => void;
  onUpdatePosition: (clothingId: string, x: number, y: number) => void;
  onUpdateScale?: (clothingId: string, scale: number) => void;
}

export default function OutfitCanvas({ items, onRemoveItem, onUpdateScale }: OutfitCanvasProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'outfit-canvas',
  });

  return (
    <div
      ref={setNodeRef}
      className={`relative w-full h-[600px] rounded-xl border-2 border-dashed transition-colors overflow-hidden ${
        isOver ? 'border-pink-400 bg-pink-50' : 'border-gray-300 bg-gradient-to-b from-gray-50 to-gray-100'
      }`}
    >
      {/* 模特兒背景 */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <GirlMannequin className="h-[550px] w-auto opacity-60" />
      </div>

      {/* 放置提示 */}
      {items.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-8 pointer-events-none">
          <div className="bg-white/80 backdrop-blur-sm rounded-lg px-4 py-2 shadow-sm">
            <p className="text-gray-500 text-center text-sm">
              從左側拖拉衣服到模特兒身上
            </p>
          </div>
        </div>
      )}

      {/* 衣服項目 */}
      {items.map((item) => (
        <DraggableClothing
          key={`canvas-${item.clothingId}`}
          clothing={item.clothing}
          inCanvas
          position={{ x: item.x, y: item.y }}
          scale={item.scale}
          onRemove={() => onRemoveItem(item.clothingId)}
          onScaleChange={onUpdateScale ? (newScale) => onUpdateScale(item.clothingId, newScale) : undefined}
        />
      ))}

      {/* 參考線提示 */}
      <div className="absolute top-4 left-4 text-xs text-gray-400 bg-white/70 px-2 py-1 rounded">
        提示：拖動衣服到適當位置，懸停可調整大小
      </div>
    </div>
  );
}
