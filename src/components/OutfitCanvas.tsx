import { useCallback, useEffect, useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { Clothing, OutfitItem } from '../types';
import CanvasClothing from './CanvasClothing';
import FigureBackground from './FigureBackground';
import { usePinchZoom } from '../hooks/usePinchZoom';
import { STAGE_WIDTH, STAGE_HEIGHT, MIN_SCALE, MAX_SCALE, type FigureMode } from '../lib/outfitLayout';

interface OutfitCanvasProps {
  items: (OutfitItem & { clothing: Clothing })[];
  figureMode: FigureMode;
  figurePhotoUrl?: string | null;
  /** 舞台最多能佔的螢幕高度（px），手機上要扣掉底部衣服抽屜 */
  maxHeight: number;
  selectedItemId: string | null;
  onSelectItem: (clothingId: string | null) => void;
  onMoveItem: (clothingId: string, x: number, y: number) => void;
  onScaleItem: (clothingId: string, scale: number) => void;
  onRemoveItem: (clothingId: string) => void;
}

export const STAGE_ELEMENT_ID = 'outfit-stage';

export default function OutfitCanvas({
  items,
  figureMode,
  figurePhotoUrl,
  maxHeight,
  selectedItemId,
  onSelectItem,
  onMoveItem,
  onScaleItem,
  onRemoveItem,
}: OutfitCanvasProps) {
  const { setNodeRef, isOver } = useDroppable({ id: 'outfit-canvas' });

  // 依容器寬度與可用高度算出舞台縮放倍率
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(STAGE_WIDTH);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // 雙指捏合綁在整個畫布上：兩指不必都按在衣服上（小件的鞋子、髮飾幾乎不可能），
  // 只要有選取的衣服，在畫布任何地方捏合都會縮放它
  const selectedItem = items.find((item) => item.clothingId === selectedItemId);
  const [pinchScale, setPinchScale] = useState<number | null>(null);
  const commitPinch = useCallback(
    (scale: number) => {
      setPinchScale(null);
      if (selectedItemId) onScaleItem(selectedItemId, scale);
    },
    [selectedItemId, onScaleItem]
  );
  const { setRef: setPinchRef } = usePinchZoom({
    enabled: !!selectedItem,
    currentScale: selectedItem?.scale ?? 1,
    onLiveScale: setPinchScale,
    onCommitScale: commitPinch,
    minScale: MIN_SCALE,
    maxScale: MAX_SCALE,
  });

  const stageScale = Math.max(0.5, Math.min(containerWidth / STAGE_WIDTH, maxHeight / STAGE_HEIGHT, 1.15));

  return (
    <div
      ref={(node) => {
        containerRef.current = node;
        setNodeRef(node);
        setPinchRef(node);
      }}
      onPointerDown={(e) => {
        // 點畫布空白處取消選取
        if (!(e.target as HTMLElement).closest('[data-canvas-item]')) {
          onSelectItem(null);
        }
      }}
      className={`relative w-full rounded-xl border-2 border-dashed transition-colors overflow-hidden ${
        isOver ? 'border-pink-400 bg-pink-50' : 'border-gray-200 bg-gradient-to-b from-white to-pink-50/60'
      }`}
      style={{ height: STAGE_HEIGHT * stageScale }}
    >
      {/* 固定大小的舞台，整個等比縮放到螢幕上 */}
      <div
        id={STAGE_ELEMENT_ID}
        className="absolute top-0 left-1/2"
        style={{
          width: STAGE_WIDTH,
          height: STAGE_HEIGHT,
          transform: `translateX(-50%) scale(${stageScale})`,
          transformOrigin: 'top center',
        }}
      >
        <FigureBackground mode={figureMode} photoUrl={figurePhotoUrl} />

        {items.map((item, index) => (
          <CanvasClothing
            key={item.clothingId}
            clothing={item.clothing}
            x={item.x}
            y={item.y}
            scale={item.scale}
            zIndex={index + 1}
            stageScale={stageScale}
            pinchScale={selectedItemId === item.clothingId ? pinchScale : null}
            selected={selectedItemId === item.clothingId}
            onSelect={() => onSelectItem(item.clothingId)}
            onMove={(x, y) => onMoveItem(item.clothingId, x, y)}
            onScaleChange={(scale) => onScaleItem(item.clothingId, scale)}
            onRemove={() => onRemoveItem(item.clothingId)}
          />
        ))}
      </div>

      {items.length === 0 && (
        <div className="absolute inset-x-0 bottom-6 flex justify-center pointer-events-none">
          <p className="bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm text-sm text-gray-500">
            點一下衣服，就會穿到{figureMode === 'child' ? '身上' : '人台上'}
          </p>
        </div>
      )}
    </div>
  );
}
