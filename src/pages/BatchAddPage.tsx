import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useClothing } from '../hooks/useClothing';
import { CATEGORY_OPTIONS, CATEGORY_GROUPS, SIZE_OPTIONS, MATERIAL_OPTIONS } from '../lib/constants';
import { extractDominantColor, analyzeClothingWithAI, getAnthropicApiKey, setAnthropicApiKey } from '../lib/imageAnalysis';
import { removeImageBackground, blobToDataURL } from '../lib/backgroundRemoval';
import { downscaleImage } from '../lib/imageUtils';

const MAX_ITEMS = 6;
// 同時送 Claude 辨識的張數；去背很吃記憶體，固定一次一張
const AI_CONCURRENCY = 2;

type JobState = 'idle' | 'queued' | 'running' | 'done' | 'error';

interface BatchItem {
  id: string;
  /** 已縮小的原圖 */
  original: Blob;
  originalUrl: string;
  cutout: { blob: Blob; url: string } | null;
  useCutout: boolean;
  category: string;
  size: string;
  material: string;
  color: string;
  brand: string;
  notes: string;
  /** 使用者手動挑過顏色後，自動偵測不再覆蓋 */
  colorTouched: boolean;
  analysis: JobState;
  bg: JobState;
  bgProgress: number;
  error: string | null;
  saving: boolean;
}

type ItemPatch = Partial<BatchItem> | ((item: BatchItem) => Partial<BatchItem>);

const fieldClass = 'w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300';
// 去背後的透明圖用棋盤格底，看得出哪裡是透明
const checkerboard = {
  backgroundColor: '#fff',
  backgroundImage: 'conic-gradient(#eee 25%, #fff 0 50%, #eee 0 75%, #fff 0)',
  backgroundSize: '16px 16px',
};

const currentUrl = (item: BatchItem) => (item.useCutout && item.cutout ? item.cutout.url : item.originalUrl);

export default function BatchAddPage() {
  const navigate = useNavigate();
  const { addClothing } = useClothing();
  const [items, setItems] = useState<BatchItem[]>([]);
  const [batchSize, setBatchSize] = useState('');
  const [isReading, setIsReading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(() => !!getAnthropicApiKey());
  const [apiKeyInput, setApiKeyInput] = useState('');

  // 非同步流程讀最新的 items，避免舊 closure
  const itemsRef = useRef<BatchItem[]>([]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const aiQueueRef = useRef<string[]>([]);
  const aiRunningRef = useRef(0);
  const bgQueueRef = useRef<string[]>([]);
  const bgRunningRef = useRef(false);

  const patchItem = useCallback((id: string, patch: ItemPatch) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, ...(typeof patch === 'function' ? patch(item) : patch) } : item
    ));
  }, []);

  const findItem = (id: string) => itemsRef.current.find(item => item.id === id);

  const detectColor = useCallback(async (id: string, source: string) => {
    try {
      const { hex } = await extractDominantColor(source);
      patchItem(id, item => (item.colorTouched || currentUrl(item) !== source ? {} : { color: hex }));
    } catch (err) {
      console.warn('顏色偵測失敗:', err);
    }
  }, [patchItem]);

  // ---- AI 辨識：最多同時 AI_CONCURRENCY 張，只補空白欄位 ----
  const pumpAi = useCallback(() => {
    while (aiRunningRef.current < AI_CONCURRENCY && aiQueueRef.current.length > 0) {
      const id = aiQueueRef.current.shift()!;
      const item = findItem(id);
      const apiKey = getAnthropicApiKey();
      if (!item || !apiKey) continue;

      aiRunningRef.current++;
      patchItem(id, { analysis: 'running', error: null });
      analyzeClothingWithAI(item.originalUrl, apiKey)
        .then(analysis => {
          patchItem(id, cur => {
            const fill = (current: string, next: string | undefined, valid = true) =>
              next && valid && !current ? next : current;
            return {
              analysis: 'done',
              category: fill(cur.category, analysis.category, CATEGORY_OPTIONS.some(c => c.value === analysis.category)),
              material: fill(cur.material, analysis.material, MATERIAL_OPTIONS.some(m => m.value === analysis.material)),
              brand: fill(cur.brand, analysis.brand),
              notes: fill(cur.notes, analysis.notes),
            };
          });
        })
        .catch(err => {
          console.error('分析失敗:', err);
          patchItem(id, { analysis: 'error', error: err instanceof Error ? err.message : 'AI 分析失敗' });
        })
        .finally(() => {
          aiRunningRef.current--;
          pumpAi();
        });
    }
  }, [patchItem]);

  const queueAnalysis = useCallback((ids: string[]) => {
    if (!getAnthropicApiKey()) return;
    for (const id of ids) {
      if (!aiQueueRef.current.includes(id)) aiQueueRef.current.push(id);
    }
    setItems(prev => prev.map(item => (ids.includes(item.id) && item.analysis !== 'running' ? { ...item, analysis: 'queued' } : item)));
    pumpAi();
  }, [pumpAi]);

  // ---- 去背：一次只跑一張，其餘排隊 ----
  const pumpBg = useCallback(async () => {
    if (bgRunningRef.current) return;
    const id = bgQueueRef.current.shift();
    if (!id) return;
    const item = findItem(id);
    if (!item) {
      pumpBg();
      return;
    }

    bgRunningRef.current = true;
    patchItem(id, { bg: 'running', bgProgress: 0, error: null });
    try {
      const blob = await removeImageBackground(item.original, progress => patchItem(id, { bgProgress: progress }));
      const url = await blobToDataURL(blob);
      patchItem(id, { bg: 'done', cutout: { blob, url }, useCutout: true });
      detectColor(id, url);
    } catch (err) {
      console.error('去背失敗:', err);
      patchItem(id, { bg: 'error', error: '去背處理失敗，請稍後再試' });
    } finally {
      bgRunningRef.current = false;
      pumpBg();
    }
  }, [patchItem, detectColor]);

  const queueBackground = (ids: string[]) => {
    const targets = ids.filter(id => {
      const item = findItem(id);
      return item && !item.cutout && item.bg !== 'queued' && item.bg !== 'running';
    });
    bgQueueRef.current.push(...targets);
    setItems(prev => prev.map(item => (targets.includes(item.id) ? { ...item, bg: 'queued' } : item)));
    pumpBg();
  };

  const toggleCutout = (item: BatchItem, useCutout: boolean) => {
    patchItem(item.id, { useCutout });
    const source = useCutout && item.cutout ? item.cutout.url : item.originalUrl;
    detectColor(item.id, source);
  };

  // ---- 選照片：逐張縮小再讀進來，避免手機一次塞好幾張原圖 ----
  const handleFiles = async (fileList: FileList | null) => {
    const files = Array.from(fileList || []).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;

    const slots = MAX_ITEMS - itemsRef.current.length;
    const accepted = files.slice(0, Math.max(0, slots));
    setNotice(files.length > accepted.length ? `一次最多 ${MAX_ITEMS} 張，已略過 ${files.length - accepted.length} 張` : null);
    if (accepted.length === 0) return;

    setIsReading(true);
    const added: string[] = [];
    for (const file of accepted) {
      try {
        const original = await downscaleImage(file);
        const originalUrl = await blobToDataURL(original);
        const id = crypto.randomUUID();
        const item: BatchItem = {
          id, original, originalUrl,
          cutout: null, useCutout: false,
          category: '', size: batchSize, material: '', color: '#FFFFFF', brand: '', notes: '',
          colorTouched: false,
          analysis: 'idle', bg: 'idle', bgProgress: 0, error: null, saving: false,
        };
        itemsRef.current = [...itemsRef.current, item];
        setItems(prev => [...prev, item]);
        added.push(id);
        detectColor(id, originalUrl);
      } catch (err) {
        console.error('讀取照片失敗:', err);
        setNotice(`「${file.name}」無法讀取，已略過`);
      }
    }
    setIsReading(false);
    queueAnalysis(added);
  };

  const removeItem = (id: string) => {
    aiQueueRef.current = aiQueueRef.current.filter(x => x !== id);
    bgQueueRef.current = bgQueueRef.current.filter(x => x !== id);
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleBatchSize = (size: string) => {
    setBatchSize(size);
    setItems(prev => prev.map(item => ({ ...item, size })));
  };

  const handleSaveApiKey = () => {
    const key = apiKeyInput.trim();
    if (!key) return;
    setAnthropicApiKey(key);
    setHasApiKey(true);
    setApiKeyInput('');
    queueAnalysis(itemsRef.current.filter(item => item.analysis !== 'done').map(item => item.id));
  };

  const bgBusy = items.some(item => item.bg === 'queued' || item.bg === 'running');
  const missingCategory = items.some(item => !item.category);

  const handleSaveAll = async () => {
    if (missingCategory) {
      setShowErrors(true);
      return;
    }
    setIsSaving(true);
    let failed = 0;
    // 逐筆存，存好的從清單移除；失敗的留著可以再按一次
    for (const item of itemsRef.current) {
      patchItem(item.id, { saving: true, error: null });
      try {
        const useCutout = item.useCutout && item.cutout;
        const imageFile = useCutout
          ? new File([item.cutout!.blob], 'clothing-nobg.png', { type: 'image/png' })
          : new File([item.original], 'clothing.jpg', { type: item.original.type || 'image/jpeg' });
        await addClothing({
          imageUrl: '',
          category: item.category,
          size: item.size,
          material: item.material,
          color: item.color,
          brand: item.brand,
          purchaseDate: '',
          notes: item.notes,
        }, imageFile);
        removeItem(item.id);
      } catch (err) {
        console.error('Error adding clothing:', err);
        failed++;
        patchItem(item.id, { saving: false, error: '儲存失敗，請再試一次' });
      }
    }
    setIsSaving(false);
    if (failed === 0) navigate('/');
  };

  const remaining = MAX_ITEMS - items.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/add" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-semibold text-gray-800">一次新增多件</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* 選照片 & 共用尺寸 */}
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
          {remaining > 0 && (
            <label className={`relative block border-2 border-dashed border-gray-300 hover:border-pink-300 rounded-lg p-6 text-center transition-colors ${isReading ? 'opacity-50' : 'cursor-pointer'}`}>
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={isReading}
                onChange={(e) => {
                  handleFiles(e.target.files);
                  e.target.value = '';
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <p className="text-sm text-gray-600">
                <span className="font-medium text-pink-500">{isReading ? '讀取照片中...' : '點擊選擇照片'}</span>
                {!isReading && `（可多選，還能加 ${remaining} 張）`}
              </p>
            </label>
          )}
          {notice && <p className="text-sm text-orange-500">{notice}</p>}

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 shrink-0">尺寸（套用全部）</label>
            <select value={batchSize} onChange={(e) => handleBatchSize(e.target.value)} className={fieldClass}>
              <option value="">未填</option>
              {SIZE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>

          {!hasApiKey && (
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="輸入 Anthropic API Key 即可自動辨識"
                className={fieldClass}
              />
              <button
                type="button"
                onClick={handleSaveApiKey}
                disabled={!apiKeyInput.trim()}
                className="shrink-0 px-3 py-1.5 text-sm bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-50"
              >
                儲存
              </button>
            </div>
          )}

          {items.length > 1 && (
            <button
              type="button"
              onClick={() => queueBackground(items.map(item => item.id))}
              disabled={items.every(item => item.cutout || item.bg === 'queued' || item.bg === 'running')}
              className="w-full px-4 py-2 text-sm text-white rounded-lg transition-all disabled:opacity-50 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
            >
              全部去背（一張一張處理）
            </button>
          )}
        </div>

        {/* 每件衣服一張卡片 */}
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`bg-white rounded-xl shadow-sm p-4 ${showErrors && !item.category ? 'ring-2 ring-red-300' : ''}`}
          >
            <div className="flex gap-3">
              <div className="w-28 shrink-0 space-y-2">
                <div className="aspect-square rounded-lg overflow-hidden border border-gray-100" style={item.useCutout ? checkerboard : undefined}>
                  <img src={currentUrl(item)} alt={`第 ${index + 1} 件`} className="w-full h-full object-contain" />
                </div>
                {item.bg === 'running' ? (
                  <p className="text-xs text-center text-blue-500">去背中 {item.bgProgress}%</p>
                ) : item.bg === 'queued' ? (
                  <p className="text-xs text-center text-gray-400">排隊去背中</p>
                ) : item.cutout ? (
                  <button
                    type="button"
                    onClick={() => toggleCutout(item, !item.useCutout)}
                    className="w-full px-2 py-1 text-xs border border-purple-300 text-purple-600 rounded-lg hover:bg-purple-50"
                  >
                    {item.useCutout ? '還原原圖' : '套用去背'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => queueBackground([item.id])}
                    className="w-full px-2 py-1 text-xs text-white rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                  >
                    去背
                  </button>
                )}
              </div>

              <div className="flex-1 min-w-0 grid grid-cols-2 gap-2">
                <select
                  value={item.category}
                  onChange={(e) => patchItem(item.id, { category: e.target.value })}
                  className={`${fieldClass} col-span-2 ${showErrors && !item.category ? 'border-red-300' : ''}`}
                >
                  <option value="">{item.analysis === 'running' || item.analysis === 'queued' ? '辨識中...' : '種類 *'}</option>
                  {CATEGORY_GROUPS.map(group => (
                    <optgroup key={group} label={group}>
                      {CATEGORY_OPTIONS.filter(opt => opt.group === group).map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <select value={item.size} onChange={(e) => patchItem(item.id, { size: e.target.value })} className={fieldClass}>
                  <option value="">尺寸</option>
                  {SIZE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.value}</option>)}
                </select>
                <select value={item.material} onChange={(e) => patchItem(item.id, { material: e.target.value })} className={fieldClass}>
                  <option value="">材質</option>
                  {MATERIAL_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="color"
                    value={item.color}
                    onChange={(e) => patchItem(item.id, { color: e.target.value.toUpperCase(), colorTouched: true })}
                    className="w-8 h-8 rounded border border-gray-200 cursor-pointer"
                  />
                  顏色
                </label>
                <input
                  type="text"
                  value={item.brand}
                  onChange={(e) => patchItem(item.id, { brand: e.target.value })}
                  placeholder="品牌"
                  className={fieldClass}
                />
                <textarea
                  value={item.notes}
                  onChange={(e) => patchItem(item.id, { notes: e.target.value })}
                  placeholder="備註"
                  rows={2}
                  className={`${fieldClass} col-span-2 resize-none`}
                />
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-xs text-red-500 min-w-0">{item.error}</p>
              <div className="flex gap-3 shrink-0">
                {hasApiKey && item.analysis !== 'running' && item.analysis !== 'queued' && (
                  <button type="button" onClick={() => queueAnalysis([item.id])} className="text-xs text-purple-500 hover:underline">
                    重新辨識
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  disabled={item.bg === 'running' || item.saving}
                  className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-50"
                >
                  移除
                </button>
              </div>
            </div>
          </div>
        ))}

        {items.length > 0 && (
          <div className="sticky bottom-0 bg-gradient-to-t from-purple-50 pt-2 pb-4 space-y-1">
            {showErrors && missingCategory && <p className="text-sm text-red-500 text-center">還有衣服沒選種類</p>}
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving || bgBusy || isReading}
              className="w-full px-4 py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? '儲存中...' : bgBusy ? '等待去背完成...' : `全部儲存（${items.length} 件）`}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
