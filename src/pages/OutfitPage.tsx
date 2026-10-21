import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { DndContext, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useClothing } from '../hooks/useClothing';
import { useOutfits } from '../hooks/useOutfits';
import { useChildProfile } from '../hooks/useChildProfile';
import { useMediaQuery, useViewportHeight } from '../hooks/useViewport';
import ClothingPicker from '../components/ClothingPicker';
import OutfitCanvas, { STAGE_ELEMENT_ID } from '../components/OutfitCanvas';
import OutfitPreview from '../components/OutfitPreview';
import ChildPhotoModal from '../components/ChildPhotoModal';
import type { Clothing, OutfitItem, OutfitWithPositions } from '../types';
import { OCCASION_OPTIONS } from '../lib/constants';
import {
  STAGE_WIDTH,
  STAGE_VERSION,
  ITEM_BASE_SIZE,
  clampPosition,
  clampScale,
  getDefaultPlacement,
  getLayer,
  normalizeOutfitItems,
  type FigureMode,
} from '../lib/outfitLayout';

interface CanvasItem extends OutfitItem {
  clothing: Clothing;
}

const FIGURE_MODE_KEY = 'outfit-figure-mode';

function loadFigureMode(): FigureMode {
  try {
    return localStorage.getItem(FIGURE_MODE_KEY) === 'child' ? 'child' : 'dressform';
  } catch {
    return 'dressform';
  }
}

function defaultOutfitName() {
  const now = new Date();
  return `${now.getMonth() + 1}/${now.getDate()} 的搭配`;
}

export default function OutfitPage() {
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 4 },
  });
  // 清單：長按 200ms 才啟動拖拉，快速滑動交給瀏覽器捲動、輕點則是直接穿上
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 8 },
  });
  const sensors = useSensors(mouseSensor, touchSensor);

  const { clothes, loading: clothesLoading } = useClothing();
  const { outfits, addOutfit, updateOutfit, deleteOutfit, loading: outfitsLoading } = useOutfits();
  const { photoUrl: childPhotoUrl, neckRatio, savePhoto, removePhoto } = useChildProfile();

  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const viewportHeight = useViewportHeight();
  // 手機要扣掉頂部標題列、人形切換列與底部衣服抽屜，讓畫布一眼看得完
  const canvasMaxHeight = Math.max(280, viewportHeight - (isDesktop ? 150 : 330));

  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [activeClothing, setActiveClothing] = useState<Clothing | null>(null);
  const [figureMode, setFigureMode] = useState<FigureMode>(loadFigureMode);
  const [showChildModal, setShowChildModal] = useState(false);

  const [outfitName, setOutfitName] = useState('');
  const [outfitOccasion, setOutfitOccasion] = useState('');
  const [editingOutfitId, setEditingOutfitId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [showSavedOutfits, setShowSavedOutfits] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const activeIds = useMemo(() => new Set(canvasItems.map((item) => item.clothingId)), [canvasItems]);
  const effectiveFigureMode: FigureMode = figureMode === 'child' && childPhotoUrl ? 'child' : 'dressform';

  // ── 人形切換 ──
  const changeFigureMode = (mode: FigureMode) => {
    setFigureMode(mode);
    try {
      localStorage.setItem(FIGURE_MODE_KEY, mode);
    } catch {
      // 無痕模式等情況存不了，只是下次要重選
    }
    if (mode === 'child' && !childPhotoUrl) {
      setShowChildModal(true);
    }
  };

  // ── 畫布操作 ──
  /** 依疊放順序插入：上衣蓋住褲裙、配件在最上面 */
  const insertByLayer = (items: CanvasItem[], newItem: CanvasItem) => {
    const layer = getLayer(newItem.clothing.category);
    const index = items.findIndex((item) => getLayer(item.clothing.category) > layer);
    return index === -1 ? [...items, newItem] : [...items.slice(0, index), newItem, ...items.slice(index)];
  };

  const putOn = (clothing: Clothing, position?: { x: number; y: number; scale: number }) => {
    const placement = position ?? getDefaultPlacement(clothing.category, effectiveFigureMode, neckRatio);
    setCanvasItems((prev) => insertByLayer(prev, { clothingId: clothing.id, clothing, ...placement }));
    setSelectedItemId(clothing.id);
  };

  const handleToggleClothing = (clothing: Clothing) => {
    if (activeIds.has(clothing.id)) {
      handleRemoveItem(clothing.id);
    } else {
      putOn(clothing);
    }
  };

  const handleRemoveItem = (clothingId: string) => {
    setCanvasItems((prev) => prev.filter((item) => item.clothingId !== clothingId));
    setSelectedItemId((current) => (current === clothingId ? null : current));
  };

  const updateItem = (clothingId: string, patch: Partial<OutfitItem>) => {
    setCanvasItems((prev) =>
      prev.map((item) => (item.clothingId === clothingId ? clampPosition({ ...item, ...patch }) : item))
    );
  };

  /** 以中心點為準縮放，按鈕縮放時衣服不會往右下角跑 */
  const scaleItemBy = (clothingId: string, factor: number) => {
    setCanvasItems((prev) =>
      prev.map((item) => {
        if (item.clothingId !== clothingId) return item;
        const scale = clampScale(item.scale * factor);
        const delta = (ITEM_BASE_SIZE * (scale - item.scale)) / 2;
        return clampPosition({ ...item, scale, x: item.x - delta, y: item.y - delta });
      })
    );
  };

  const moveLayer = (clothingId: string, direction: -1 | 1) => {
    setCanvasItems((prev) => {
      const index = prev.findIndex((item) => item.clothingId === clothingId);
      const target = index + direction;
      if (index === -1 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  /** 全部依種類重新排到人形對應位置（換成小孩照片後特別好用） */
  const handleAutoArrange = () => {
    setCanvasItems((prev) =>
      prev.map((item) => ({ ...item, ...getDefaultPlacement(item.clothing.category, effectiveFigureMode, neckRatio) }))
    );
  };

  const handleClearCanvas = () => {
    setCanvasItems([]);
    setSelectedItemId(null);
    setEditingOutfitId(null);
    setOutfitName('');
    setOutfitOccasion('');
  };

  // ── 拖拉（清單 → 畫布）──
  const handleDragStart = (event: DragStartEvent) => {
    const clothing = clothes.find((c) => c.id === String(event.active.id));
    if (clothing) setActiveClothing(clothing);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveClothing(null);
    const { active, over } = event;
    if (over?.id !== 'outfit-canvas') return;

    const clothing = clothes.find((c) => c.id === String(active.id));
    const dropped = active.rect.current.translated;
    const stageRect = document.getElementById(STAGE_ELEMENT_ID)?.getBoundingClientRect();
    if (!clothing) return;
    if (!dropped || !stageRect) {
      if (!activeIds.has(clothing.id)) putOn(clothing);
      return;
    }

    // 放開的位置換算成舞台座標，衣服中心對準手指／游標放開處
    const k = stageRect.width / STAGE_WIDTH;
    const centerX = (dropped.left + dropped.width / 2 - stageRect.left) / k;
    const centerY = (dropped.top + dropped.height / 2 - stageRect.top) / k;
    const existing = canvasItems.find((item) => item.clothingId === clothing.id);
    const scale = existing?.scale ?? getDefaultPlacement(clothing.category, effectiveFigureMode, neckRatio).scale;
    const size = ITEM_BASE_SIZE * scale;
    const position = clampPosition({ x: centerX - size / 2, y: centerY - size / 2, scale });

    if (existing) {
      updateItem(clothing.id, position);
      setSelectedItemId(clothing.id);
    } else {
      putOn(clothing, position);
    }
  };

  // ── 儲存／載入 ──
  const flashSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleSaveOutfit = async (asNew = false) => {
    if (canvasItems.length === 0) {
      setError('請至少穿上一件衣服');
      return;
    }

    setIsSaving(true);
    setError(null);

    const name = outfitName.trim() || defaultOutfitName();
    const data = {
      name,
      items: canvasItems.map(({ clothingId, x, y, scale }) => ({ clothingId, x, y, scale })),
      stageVersion: STAGE_VERSION,
      occasion: outfitOccasion,
    };

    try {
      if (editingOutfitId && !asNew) {
        await updateOutfit(editingOutfitId, data);
        flashSuccess('搭配已更新！');
      } else {
        const id = await addOutfit(data);
        setEditingOutfitId(id);
        flashSuccess('搭配已儲存！');
      }
      setOutfitName(name);
    } catch (err) {
      console.error('Error saving outfit:', err);
      setError('儲存搭配時發生錯誤');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadOutfit = (outfit: OutfitWithPositions) => {
    if (canvasItems.length > 0 && editingOutfitId !== outfit.id && !window.confirm('目前畫布上的搭配會被取代，確定要載入嗎？')) {
      return;
    }
    const items: CanvasItem[] = [];
    normalizeOutfitItems(outfit.items, outfit.stageVersion).forEach((item) => {
      const clothing = clothes.find((c) => c.id === item.clothingId);
      if (clothing) items.push({ ...item, clothing });
    });
    setCanvasItems(items);
    setSelectedItemId(null);
    setEditingOutfitId(outfit.id);
    setOutfitName(outfit.name);
    setOutfitOccasion(outfit.occasion || '');
    setError(null);
    setShowSavedOutfits(false);
  };

  const handleDeleteOutfit = async (outfitId: string) => {
    // 第一次點是「確認刪除？」，再點一次才真的刪
    if (pendingDeleteId !== outfitId) {
      setPendingDeleteId(outfitId);
      return;
    }
    setPendingDeleteId(null);
    try {
      await deleteOutfit(outfitId);
      if (editingOutfitId === outfitId) setEditingOutfitId(null);
    } catch (err) {
      console.error('Error deleting outfit:', err);
    }
  };

  const loading = clothesLoading || outfitsLoading;
  const selectedItem = canvasItems.find((item) => item.clothingId === selectedItemId);
  const selectedIndex = selectedItem ? canvasItems.indexOf(selectedItem) : -1;

  const toolbarButton =
    'flex flex-col items-center justify-center min-w-11 h-11 px-2 text-xs text-gray-600 rounded-lg hover:bg-pink-50 active:bg-pink-100 disabled:opacity-30';

  const toolbar = selectedItem ? (
    <div className="flex items-center justify-center gap-0.5 bg-white rounded-xl shadow-sm border border-pink-100 px-1">
      <button type="button" className={toolbarButton} onClick={() => scaleItemBy(selectedItem.clothingId, 1 / 1.15)}>
        <span className="text-lg leading-none">－</span>縮小
      </button>
      <button type="button" className={toolbarButton} onClick={() => scaleItemBy(selectedItem.clothingId, 1.15)}>
        <span className="text-lg leading-none">＋</span>放大
      </button>
      <button
        type="button"
        className={toolbarButton}
        disabled={selectedIndex <= 0}
        onClick={() => moveLayer(selectedItem.clothingId, -1)}
      >
        <span className="text-lg leading-none">↓</span>往後
      </button>
      <button
        type="button"
        className={toolbarButton}
        disabled={selectedIndex >= canvasItems.length - 1}
        onClick={() => moveLayer(selectedItem.clothingId, 1)}
      >
        <span className="text-lg leading-none">↑</span>往前
      </button>
      <button
        type="button"
        className={`${toolbarButton} text-red-500 hover:bg-red-50`}
        onClick={() => handleRemoveItem(selectedItem.clothingId)}
      >
        <span className="text-lg leading-none">✕</span>脫下
      </button>
    </div>
  ) : null;

  const segmentButton = (mode: FigureMode, label: string) => (
    <button
      type="button"
      onClick={() => changeFigureMode(mode)}
      className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
        figureMode === mode ? 'bg-white text-pink-600 shadow-sm font-medium' : 'text-gray-500'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Link to="/" aria-label="回首頁" className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-lg sm:text-xl font-semibold text-gray-800">搭配衣服</h1>
            </div>
            <button
              type="button"
              onClick={() => setShowSavedOutfits(true)}
              className="px-3 py-2 text-sm sm:text-base text-pink-500 border border-pink-300 rounded-lg hover:bg-pink-50 transition-colors"
            >
              歷史搭配 ({outfits.length})
            </button>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-200 border-t-pink-500"></div>
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <main className="max-w-7xl mx-auto px-4 py-3 pb-48 lg:py-6 lg:pb-6">
            <div className="lg:grid lg:grid-cols-3 lg:gap-6">
              {/* 桌機：左側選衣服面板 */}
              {isDesktop && (
                <aside className="bg-white rounded-xl shadow-sm p-4 self-start sticky top-20">
                  <h2 className="font-semibold text-gray-800 mb-3">選擇衣服</h2>
                  <ClothingPicker clothes={clothes} activeIds={activeIds} onToggle={handleToggleClothing} variant="panel" />
                </aside>
              )}

              <section className="lg:col-span-2 space-y-3">
                {/* 選了衣服時這一列換成操作工具列：不蓋在畫布上，臉和衣服都不會被擋住 */}
                {toolbar ?? (
                <div className="flex items-center justify-between gap-2 min-h-11">
                  <div className="flex items-center gap-1">
                    <div className="inline-flex bg-gray-100 rounded-lg p-1">
                      {segmentButton('dressform', '人台')}
                      {segmentButton('child', '小孩照片')}
                    </div>
                    {figureMode === 'child' && (
                      <button
                        type="button"
                        onClick={() => setShowChildModal(true)}
                        className="px-2 py-1.5 text-sm text-pink-500 hover:bg-pink-50 rounded-lg"
                      >
                        {childPhotoUrl ? '換照片' : '設定照片'}
                      </button>
                    )}
                  </div>
                  {canvasItems.length > 0 && (
                    <button
                      type="button"
                      onClick={handleAutoArrange}
                      className="px-2 py-1.5 text-sm text-gray-500 hover:text-pink-500 hover:bg-pink-50 rounded-lg"
                    >
                      自動排好
                    </button>
                  )}
                </div>
                )}

                <OutfitCanvas
                  items={canvasItems}
                  figureMode={effectiveFigureMode}
                  figurePhotoUrl={childPhotoUrl}
                  maxHeight={canvasMaxHeight}
                  selectedItemId={selectedItemId}
                  onSelectItem={setSelectedItemId}
                  onMoveItem={(id, x, y) => updateItem(id, { x, y })}
                  onScaleItem={(id, scale) => updateItem(id, { scale })}
                  onRemoveItem={handleRemoveItem}
                />

                {/* 儲存表單 */}
                <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">搭配名稱</label>
                      <input
                        type="text"
                        value={outfitName}
                        onChange={(e) => setOutfitName(e.target.value)}
                        placeholder={`留空會自動命名為「${defaultOutfitName()}」`}
                        className="w-full px-3 py-2 text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">場合</label>
                      <select
                        value={outfitOccasion}
                        onChange={(e) => setOutfitOccasion(e.target.value)}
                        className="w-full px-3 py-2 text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300"
                      >
                        <option value="">選擇場合</option>
                        {OCCASION_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
                  )}
                  {successMessage && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                      {successMessage}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleClearCanvas}
                      className="px-4 py-2.5 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {editingOutfitId ? '新搭配' : '清空'}
                    </button>
                    {editingOutfitId && (
                      <button
                        type="button"
                        onClick={() => handleSaveOutfit(true)}
                        disabled={isSaving}
                        className="px-4 py-2.5 text-pink-500 border border-pink-300 rounded-lg hover:bg-pink-50 transition-colors disabled:opacity-50"
                      >
                        另存新搭配
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleSaveOutfit()}
                      disabled={isSaving}
                      className="flex-1 min-w-32 px-4 py-2.5 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors disabled:opacity-50"
                    >
                      {isSaving ? '儲存中...' : editingOutfitId ? '儲存變更' : '儲存搭配'}
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </main>

          {/* 手機：底部固定的衣服抽屜，畫布永遠在上方看得到 */}
          {!isDesktop && (
            <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-gray-100 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <ClothingPicker clothes={clothes} activeIds={activeIds} onToggle={handleToggleClothing} variant="tray" />
            </div>
          )}

          {/* 拖拉中的縮圖 */}
          <DragOverlay>
            {activeClothing && (
              <div className="w-20 h-20 rounded-lg overflow-hidden shadow-lg bg-white/80">
                <img src={activeClothing.imageUrl} alt={activeClothing.category} className="w-full h-full object-contain" />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* 歷史搭配 */}
      {showSavedOutfits && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[2000] sm:p-4">
          <div className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">歷史搭配</h3>
              <button
                type="button"
                aria-label="關閉"
                onClick={() => {
                  setShowSavedOutfits(false);
                  setPendingDeleteId(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {outfits.length === 0 ? (
                <p className="text-center text-gray-400 py-8">還沒有儲存任何搭配</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {outfits.map((outfit) => (
                    <div
                      key={outfit.id}
                      className={`border rounded-xl p-2 transition-colors ${
                        editingOutfitId === outfit.id ? 'border-pink-400' : 'hover:border-pink-300'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleLoadOutfit(outfit)}
                        className="w-full flex justify-center"
                        aria-label={`載入搭配：${outfit.name}`}
                      >
                        <OutfitPreview
                          items={normalizeOutfitItems(outfit.items, outfit.stageVersion)}
                          clothes={clothes}
                          figureMode={effectiveFigureMode}
                          figurePhotoUrl={childPhotoUrl}
                          height={180}
                        />
                      </button>
                      <div className="mt-2 flex items-start justify-between gap-1">
                        <div className="min-w-0">
                          <h4 className="font-medium text-sm truncate">{outfit.name}</h4>
                          {outfit.occasion && <p className="text-xs text-gray-500">{outfit.occasion}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteOutfit(outfit.id)}
                          className={`shrink-0 rounded-lg px-2 py-1 text-xs transition-colors ${
                            pendingDeleteId === outfit.id
                              ? 'bg-red-500 text-white'
                              : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                          }`}
                          aria-label={pendingDeleteId === outfit.id ? '確認刪除' : '刪除搭配'}
                        >
                          {pendingDeleteId === outfit.id ? '確認刪除' : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showChildModal && (
        <ChildPhotoModal
          currentPhotoUrl={childPhotoUrl}
          onSave={savePhoto}
          onRemove={async () => {
            await removePhoto();
            changeFigureMode('dressform');
          }}
          onClose={() => setShowChildModal(false)}
        />
      )}
    </div>
  );
}
