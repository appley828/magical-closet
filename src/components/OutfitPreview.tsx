import type { Clothing, OutfitItem } from '../types';
import FigureBackground from './FigureBackground';
import { STAGE_WIDTH, STAGE_HEIGHT, ITEM_BASE_SIZE, type FigureMode } from '../lib/outfitLayout';

interface OutfitPreviewProps {
  items: OutfitItem[];
  clothes: Clothing[];
  figureMode: FigureMode;
  figurePhotoUrl?: string | null;
  /** 預覽的顯示高度（px） */
  height: number;
}

/** 歷史搭配的縮圖：把整套搭配照實際位置縮小畫出來 */
export default function OutfitPreview({ items, clothes, figureMode, figurePhotoUrl, height }: OutfitPreviewProps) {
  const k = height / STAGE_HEIGHT;

  return (
    <div className="relative overflow-hidden rounded-lg bg-gradient-to-b from-white to-pink-50" style={{ width: STAGE_WIDTH * k, height }}>
      <div
        className="absolute top-0 left-0 pointer-events-none"
        style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT, transform: `scale(${k})`, transformOrigin: 'top left' }}
      >
        <FigureBackground mode={figureMode} photoUrl={figurePhotoUrl} />
        {items.map((item) => {
          const clothing = clothes.find((c) => c.id === item.clothingId);
          if (!clothing) return null;
          const size = ITEM_BASE_SIZE * item.scale;
          return (
            <img
              key={item.clothingId}
              src={clothing.imageUrl}
              alt={clothing.category}
              className="absolute object-contain"
              style={{ left: item.x, top: item.y, width: size, height: size }}
            />
          );
        })}
      </div>
    </div>
  );
}
