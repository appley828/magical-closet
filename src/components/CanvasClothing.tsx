import { useCallback, useEffect, useRef, useState } from 'react';
import type { Clothing } from '../types';
import { ITEM_BASE_SIZE, clampPosition, clampScale } from '../lib/outfitLayout';

interface CanvasClothingProps {
  clothing: Clothing;
  x: number;
  y: number;
  scale: number;
  zIndex: number;
  /** 舞台目前的顯示倍率（螢幕像素 / 邏輯單位） */
  stageScale: number;
  /** 畫布上的雙指捏合正在縮放這件（null 表示沒有） */
  pinchScale: number | null;
  selected: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onScaleChange: (scale: number) => void;
  onRemove: () => void;
}

/**
 * 畫布上的一件衣服。
 * 移動用原生 pointer 事件：手指一按就能拖，不必像清單那樣長按，手機上比較跟手。
 */
export default function CanvasClothing({
  clothing,
  x,
  y,
  scale,
  zIndex,
  stageScale,
  pinchScale,
  selected,
  onSelect,
  onMove,
  onScaleChange,
  onRemove,
}: CanvasClothingProps) {
  // 手勢進行中的即時值：只重繪這一件衣服，結束才寫回外部狀態
  const [livePos, setLivePos] = useState<{ x: number; y: number } | null>(null);
  const [liveScale, setLiveScale] = useState<number | null>(null);
  const pinching = pinchScale !== null;
  const displayScale = pinchScale ?? liveScale ?? scale;
  // 捏合時不跟著第一根手指移動
  const displayPos = (!pinching && livePos) || { x, y };

  const latestRef = useRef({ displayScale, stageScale, pinching });
  useEffect(() => {
    latestRef.current = { displayScale, stageScale, pinching };
  });

  const commitScale = useCallback(
    (newScale: number) => {
      setLiveScale(null);
      onScaleChange(newScale);
    },
    [onScaleChange]
  );

  const nodeRef = useRef<HTMLDivElement | null>(null);

  // ── 拖曳移動 ──
  const pointersRef = useRef(new Set<number>());
  const moveRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    last: { x: number; y: number } | null;
  } | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointersRef.current.add(e.pointerId);
    onSelect();

    // 第二根手指放上來就是捏合縮放，取消移動並回到原位
    if (pointersRef.current.size > 1) {
      moveRef.current = null;
      setLivePos(null);
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    moveRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, originX: x, originY: y, last: null };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const move = moveRef.current;
    if (!move || move.pointerId !== e.pointerId) return;
    if (latestRef.current.pinching) {
      moveRef.current = null;
      setLivePos(null);
      return;
    }
    const k = latestRef.current.stageScale || 1;
    const dx = (e.clientX - move.startX) / k;
    const dy = (e.clientY - move.startY) / k;
    if (!move.last && Math.hypot(dx, dy) < 3) return;
    const next = clampPosition({ x: move.originX + dx, y: move.originY + dy, scale: latestRef.current.displayScale });
    move.last = { x: next.x, y: next.y };
    setLivePos(move.last);
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId);
    const move = moveRef.current;
    if (!move || move.pointerId !== e.pointerId) return;
    moveRef.current = null;
    setLivePos(null);
    if (move.last) {
      onMove(move.last.x, move.last.y);
    }
  };

  // ── Web：選取後可用滾輪／觸控板捏合縮放（原生監聽才能 preventDefault）──
  const wheelCommitTimer = useRef<number | null>(null);
  useEffect(() => {
    const el = nodeRef.current;
    if (!el || !selected) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const newScale = clampScale(latestRef.current.displayScale * Math.exp(-e.deltaY * 0.002));
      setLiveScale(newScale);
      if (wheelCommitTimer.current !== null) {
        window.clearTimeout(wheelCommitTimer.current);
      }
      wheelCommitTimer.current = window.setTimeout(() => {
        wheelCommitTimer.current = null;
        commitScale(newScale);
      }, 200);
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
    };
  }, [selected, commitScale]);

  // ── 角落縮放把手 ──
  const resizeRef = useRef<{ startX: number; startY: number; startScale: number; lastScale: number } | null>(null);

  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeRef.current = { startX: e.clientX, startY: e.clientY, startScale: scale, lastScale: scale };
  };

  const handleResizePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const resize = resizeRef.current;
    if (!resize) return;
    const k = latestRef.current.stageScale || 1;
    const delta = (e.clientX - resize.startX + e.clientY - resize.startY) / k;
    resize.lastScale = clampScale(resize.startScale + delta / (ITEM_BASE_SIZE * 2));
    setLiveScale(resize.lastScale);
  };

  const handleResizePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const resize = resizeRef.current;
    if (!resize) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    resizeRef.current = null;
    commitScale(resize.lastScale);
  };

  const size = ITEM_BASE_SIZE * displayScale;
  // 控制鈕放在縮放後的舞台裡，反向縮放讓它在任何螢幕上都維持手指好按的大小
  const controlScale = 1 / (stageScale || 1);

  return (
    <div
      ref={nodeRef}
      data-canvas-item
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      className={`group absolute cursor-move ${livePos ? 'drop-shadow-xl' : ''}`}
      style={{
        left: displayPos.x,
        top: displayPos.y,
        width: size,
        height: size,
        zIndex: livePos || selected ? 1000 : zIndex,
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
    >
      <img
        src={clothing.imageUrl}
        alt={clothing.category}
        className={`w-full h-full object-contain pointer-events-none ${
          selected ? 'outline-2 outline-dashed outline-pink-400 outline-offset-2 rounded' : ''
        }`}
        draggable={false}
      />

      {selected && (
        <>
          <button
            type="button"
            aria-label="從畫布移除"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="absolute top-0 right-0 w-8 h-8 bg-red-500 text-white rounded-full shadow flex items-center justify-center text-lg leading-none"
            style={{ transform: `translate(50%, -50%) scale(${controlScale})` }}
          >
            ×
          </button>
          <div
            aria-label="拖曳調整大小"
            onPointerDown={handleResizePointerDown}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            onPointerCancel={handleResizePointerUp}
            className="absolute bottom-0 right-0 w-9 h-9 bg-white border-2 border-pink-400 rounded-full shadow cursor-nwse-resize flex items-center justify-center"
            style={{ transform: `translate(50%, 50%) scale(${controlScale})`, touchAction: 'none' }}
          >
            <svg viewBox="0 0 20 20" className="w-4 h-4 text-pink-500">
              <path d="M7 3H3v4M13 17h4v-4M3 3l6 6M17 17l-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
            </svg>
          </div>
        </>
      )}
    </div>
  );
}
