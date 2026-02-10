import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { DndContext, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useClothing } from '../hooks/useClothing';
import { useOutfits } from '../hooks/useOutfits';
import DraggableClothing from '../components/DraggableClothing';
import OutfitCanvas from '../components/OutfitCanvas';
import type { Clothing, OutfitItem } from '../types';
import { CATEGORY_GROUPS, getCategoriesByGroup, OCCASION_OPTIONS } from '../lib/constants';

interface CanvasItem extends OutfitItem {
  clothing: Clothing;
}

export default function OutfitPage() {
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 5 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 5 },
  });
  const sensors = useSensors(mouseSensor, touchSensor);

  const { clothes, loading: clothesLoading } = useClothing();
  const { outfits, addOutfit, deleteOutfit, loading: outfitsLoading } = useOutfits();

  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>([]);
  const [activeClothing, setActiveClothing] = useState<Clothing | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [outfitName, setOutfitName] = useState('');
  const [outfitOccasion, setOutfitOccasion] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedOutfits, setShowSavedOutfits] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const filteredClothes = useMemo(() => {
    if (!selectedCategory) return clothes;
    return clothes.filter((c) => c.category === selectedCategory);
  }, [clothes, selectedCategory]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const clothingId = String(active.id).replace('canvas-', '');
    const clothing = clothes.find((c) => c.id === clothingId);
    if (clothing) {
      setActiveClothing(clothing);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event;
    setActiveClothing(null);

    if (!over) return;

    const activeId = String(active.id);
    const isFromCanvas = activeId.startsWith('canvas-');
    const clothingId = activeId.replace('canvas-', '');

    if (over.id === 'outfit-canvas') {
      if (isFromCanvas) {
        // 在畫布內移動
        setCanvasItems((prev) =>
          prev.map((item) =>
            item.clothingId === clothingId
              ? { ...item, x: item.x + delta.x, y: item.y + delta.y }
              : item
          )
        );
      } else {
        // 從列表拖到畫布
        const clothing = clothes.find((c) => c.id === clothingId);
        if (clothing && !canvasItems.find((item) => item.clothingId === clothingId)) {
          const rect = document.getElementById('outfit-canvas')?.getBoundingClientRect();
          const x = rect ? Math.min(Math.max(delta.x + 100, 0), rect.width - 100) : 100;
          const y = rect ? Math.min(Math.max(delta.y + 100, 0), rect.height - 100) : 100;

          setCanvasItems((prev) => [
            ...prev,
            {
              clothingId,
              x,
              y,
              scale: 1,
              clothing,
            },
          ]);
        }
      }
    }
  };

  const handleRemoveItem = (clothingId: string) => {
    setCanvasItems((prev) => prev.filter((item) => item.clothingId !== clothingId));
  };

  const handleUpdatePosition = (clothingId: string, x: number, y: number) => {
    setCanvasItems((prev) =>
      prev.map((item) => (item.clothingId === clothingId ? { ...item, x, y } : item))
    );
  };

  const handleUpdateScale = (clothingId: string, scale: number) => {
    setCanvasItems((prev) =>
      prev.map((item) => (item.clothingId === clothingId ? { ...item, scale } : item))
    );
  };

  const handleSaveOutfit = async () => {
    if (!outfitName.trim()) {
      setError('請輸入搭配名稱');
      return;
    }

    if (canvasItems.length === 0) {
      setError('請至少加入一件衣服');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await addOutfit({
        name: outfitName,
        items: canvasItems.map(({ clothingId, x, y, scale }) => ({
          clothingId,
          x,
          y,
          scale,
        })),
        occasion: outfitOccasion || undefined,
      });

      setSuccessMessage('搭配已儲存！');
      setOutfitName('');
      setOutfitOccasion('');
      setCanvasItems([]);

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error saving outfit:', err);
      setError('儲存搭配時發生錯誤');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearCanvas = () => {
    setCanvasItems([]);
  };

  const handleLoadOutfit = (outfit: typeof outfits[0]) => {
    const items: CanvasItem[] = [];
    outfit.items.forEach((item) => {
      const clothing = clothes.find((c) => c.id === item.clothingId);
      if (clothing) {
        items.push({
          ...item,
          clothing,
        });
      }
    });
    setCanvasItems(items);
    setOutfitName(outfit.name);
    setOutfitOccasion(outfit.occasion || '');
    setShowSavedOutfits(false);
  };

  const handleDeleteOutfit = async (outfitId: string) => {
    try {
      await deleteOutfit(outfitId);
    } catch (err) {
      console.error('Error deleting outfit:', err);
    }
  };

  const loading = clothesLoading || outfitsLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-xl font-semibold text-gray-800">搭配衣服</h1>
            </div>
            <button
              onClick={() => setShowSavedOutfits(true)}
              className="px-4 py-2 text-pink-500 border border-pink-300 rounded-lg hover:bg-pink-50 transition-colors"
            >
              查看歷史搭配 ({outfits.length})
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-200 border-t-pink-500"></div>
          </div>
        ) : (
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 左側：衣服選擇區 */}
              <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
                <h2 className="font-semibold text-gray-800">選擇衣服</h2>

                {/* 種類篩選 */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                >
                  <option value="">所有種類</option>
                  {CATEGORY_GROUPS.map((group) => (
                    <optgroup key={group} label={group}>
                      {getCategoriesByGroup(group).map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>

                {/* 衣服列表 */}
                <div className="grid grid-cols-3 gap-3 max-h-[400px] overflow-y-auto">
                  {filteredClothes.map((clothing) => (
                    <DraggableClothing key={clothing.id} clothing={clothing} />
                  ))}
                </div>

                {filteredClothes.length === 0 && (
                  <p className="text-center text-gray-400 py-4">沒有找到衣服</p>
                )}
              </div>

              {/* 右側：搭配畫布 */}
              <div className="lg:col-span-2 space-y-4">
                {/* 訊息 */}
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}
                {successMessage && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                    {successMessage}
                  </div>
                )}

                {/* 畫布 */}
                <div id="outfit-canvas">
                  <OutfitCanvas
                    items={canvasItems}
                    onRemoveItem={handleRemoveItem}
                    onUpdatePosition={handleUpdatePosition}
                    onUpdateScale={handleUpdateScale}
                  />
                </div>

                {/* 儲存表單 */}
                <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        搭配名稱
                      </label>
                      <input
                        type="text"
                        value={outfitName}
                        onChange={(e) => setOutfitName(e.target.value)}
                        placeholder="例如：春季休閒風"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        場合
                      </label>
                      <select
                        value={outfitOccasion}
                        onChange={(e) => setOutfitOccasion(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300"
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
                  <div className="flex gap-3">
                    <button
                      onClick={handleClearCanvas}
                      className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      清空畫布
                    </button>
                    <button
                      onClick={handleSaveOutfit}
                      disabled={isSaving}
                      className="flex-1 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors disabled:opacity-50"
                    >
                      {isSaving ? '儲存中...' : '儲存搭配'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 拖拉覆蓋層 */}
            <DragOverlay>
              {activeClothing && (
                <div className="w-20 h-20 rounded-lg overflow-hidden shadow-lg bg-white opacity-80">
                  <img
                    src={activeClothing.imageUrl}
                    alt={activeClothing.category}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </main>

      {/* 歷史搭配對話框 */}
      {showSavedOutfits && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">歷史搭配</h3>
              <button
                onClick={() => setShowSavedOutfits(false)}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {outfits.map((outfit) => (
                    <div
                      key={outfit.id}
                      className="border rounded-lg p-4 hover:border-pink-300 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{outfit.name}</h4>
                          {outfit.occasion && (
                            <p className="text-sm text-gray-500">{outfit.occasion}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteOutfit(outfit.id)}
                          className="text-red-400 hover:text-red-500"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      <div className="flex gap-1 flex-wrap mb-3">
                        {outfit.items.slice(0, 4).map((item) => {
                          const clothing = clothes.find((c) => c.id === item.clothingId);
                          return clothing ? (
                            <div
                              key={item.clothingId}
                              className="w-12 h-12 rounded overflow-hidden bg-gray-100"
                            >
                              <img
                                src={clothing.imageUrl}
                                alt={clothing.category}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : null;
                        })}
                        {outfit.items.length > 4 && (
                          <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center text-sm text-gray-500">
                            +{outfit.items.length - 4}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleLoadOutfit(outfit)}
                        className="w-full px-3 py-1.5 text-sm text-pink-500 border border-pink-300 rounded hover:bg-pink-50 transition-colors"
                      >
                        載入搭配
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
