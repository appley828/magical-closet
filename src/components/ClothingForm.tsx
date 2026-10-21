import { useState, useRef } from 'react';
import type { Clothing } from '../types';
import { CATEGORY_OPTIONS, SIZE_OPTIONS, MATERIAL_OPTIONS, COLOR_PRESETS, COLOR_PALETTE, CATEGORY_GROUPS } from '../lib/constants';
import { extractDominantColor, analyzeClothingWithAI, getAnthropicApiKey, setAnthropicApiKey } from '../lib/imageAnalysis';
import { removeImageBackground, blobToDataURL } from '../lib/backgroundRemoval';
import { getColorName } from '../lib/colorName';
import ImageUploader from './ImageUploader';

interface ClothingFormProps {
  initialData?: Partial<Clothing>;
  onSubmit: (data: Omit<Clothing, 'id' | 'createdAt'>, imageFile?: File) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export default function ClothingForm({ initialData, onSubmit, onCancel, isLoading, error }: ClothingFormProps) {
  const [formData, setFormData] = useState({
    category: initialData?.category || '',
    size: initialData?.size || '',
    material: initialData?.material || '',
    color: initialData?.color || '#FFFFFF',
    brand: initialData?.brand || '',
    purchaseDate: initialData?.purchaseDate || '',
    notes: initialData?.notes || '',
    imageUrl: initialData?.imageUrl || '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [customCategory, setCustomCategory] = useState('');
  const [customSize, setCustomSize] = useState('');
  const [customMaterial, setCustomMaterial] = useState('');
  const [showCustomColor, setShowCustomColor] = useState(false);
  const [customHexInput, setCustomHexInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasApiKey, setHasApiKey] = useState(() => !!getAnthropicApiKey());
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  // 去背模型很吃記憶體：舊的去背還在背景跑時（即使已換圖），不允許再開一個
  const [bgJobRunning, setBgJobRunning] = useState(false);
  const [bgRemovalProgress, setBgRemovalProgress] = useState(0);
  // 目前是否採用去背版本
  const [bgRemoved, setBgRemoved] = useState(false);
  // 原圖（新選的照片；編輯模式沒有新選照片時為 null，代表沿用既有 imageUrl）
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string | null>(null);
  // 去背結果快取，切回原圖後可直接再套用
  const [bgCache, setBgCache] = useState<{ file: File; preview: string } | null>(null);

  // 以最新一張圖／最新一次辨識為準，忽略過期的非同步結果
  const imageSeqRef = useRef(0);
  const analysisRunRef = useRef(0);
  // 目前採用的圖片來源（給非同步流程讀最新值，避免舊 closure）
  const currentSourceRef = useRef<string>(initialData?.imageUrl || '');
  // 使用者手動挑過顏色後，自動辨識不再覆蓋
  const colorTouchedRef = useRef(false);

  const detectColor = async (source: string, seq: number) => {
    try {
      const colorResult = await extractDominantColor(source);
      if (seq === imageSeqRef.current) {
        setFormData(prev => ({ ...prev, color: colorResult.hex }));
      }
    } catch (err) {
      console.warn('顏色偵測失敗:', err);
    }
  };

  /** onlyEmpty：選圖後自動辨識只補空白欄位，不覆蓋使用者已填或已改的內容；手動按鈕則全部更新 */
  const runAnalysis = async (source: string, apiKey: string, onlyEmpty = false) => {
    const runId = ++analysisRunRef.current;
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const analysis = await analyzeClothingWithAI(source, apiKey);
      if (runId !== analysisRunRef.current) return;

      // 顏色以目前實際採用的圖片為準
      let colorHex: string | null = null;
      if (source === currentSourceRef.current && !(onlyEmpty && colorTouchedRef.current)) {
        try {
          colorHex = (await extractDominantColor(source)).hex;
        } catch (err) {
          console.warn('顏色偵測失敗:', err);
        }
        if (runId !== analysisRunRef.current) return;
      }

      setFormData(prev => {
        const fill = (current: string, next: string | undefined, valid = true) =>
          next && valid && !(onlyEmpty && current) ? next : current;
        return {
          ...prev,
          color: colorHex ?? prev.color,
          category: fill(prev.category, analysis.category, CATEGORY_OPTIONS.some(c => c.value === analysis.category)),
          material: fill(prev.material, analysis.material, MATERIAL_OPTIONS.some(m => m.value === analysis.material)),
          brand: fill(prev.brand, analysis.brand),
          notes: fill(prev.notes, analysis.notes),
        };
      });
    } catch (err) {
      if (runId !== analysisRunRef.current) return;
      console.error('分析失敗:', err);
      setAnalysisError(err instanceof Error ? err.message : 'AI 分析失敗，請稍後再試');
    } finally {
      if (runId === analysisRunRef.current) setIsAnalyzing(false);
    }
  };

  const handleImageSelect = (file: File) => {
    const seq = ++imageSeqRef.current;
    // 換圖：作廢前一次辨識／去背
    analysisRunRef.current++;
    setIsAnalyzing(false);
    setIsRemovingBg(false);
    setAnalysisError(null);
    setBgRemoved(false);
    setBgCache(null);
    setImageFile(file);
    setOriginalFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      if (seq !== imageSeqRef.current) return;
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      setOriginalPreview(dataUrl);
      currentSourceRef.current = dataUrl;

      detectColor(dataUrl, seq);

      // 有 API Key 才自動辨識；沒有就不彈對話框
      const apiKey = getAnthropicApiKey();
      if (apiKey) runAnalysis(dataUrl, apiKey, true);
    };
    reader.readAsDataURL(file);
  };

  const handleSmartAnalyze = () => {
    const apiKey = getAnthropicApiKey();
    if (!apiKey) {
      setShowApiKeyModal(true);
      return;
    }

    const source = currentSourceRef.current;
    if (!source) {
      setAnalysisError('請先上傳圖片');
      return;
    }
    runAnalysis(source, apiKey);
  };

  // 切換採用的圖片（去背版或原圖）
  const applyImage = (file: File | null, preview: string | null, nobg: boolean) => {
    const seq = ++imageSeqRef.current;
    setImageFile(file);
    setImagePreview(preview);
    setBgRemoved(nobg);
    const source = preview || formData.imageUrl;
    currentSourceRef.current = source;
    if (source) detectColor(source, seq);
  };

  const handleRemoveBackground = async () => {
    // 已有快取就直接套用
    if (bgCache) {
      applyImage(bgCache.file, bgCache.preview, true);
      return;
    }

    const source = originalPreview || formData.imageUrl;
    if (!source) return;

    const seq = imageSeqRef.current;
    setIsRemovingBg(true);
    setBgJobRunning(true);
    setBgRemovalProgress(0);

    try {
      const resultBlob = await removeImageBackground(source, (progress) => {
        if (seq === imageSeqRef.current) setBgRemovalProgress(progress);
      });
      if (seq !== imageSeqRef.current) return; // 期間已換圖

      const dataUrl = await blobToDataURL(resultBlob);
      if (seq !== imageSeqRef.current) return;

      const pngFile = new File([resultBlob], 'clothing-nobg.png', { type: 'image/png' });
      setBgCache({ file: pngFile, preview: dataUrl });
      applyImage(pngFile, dataUrl, true);
    } catch (err) {
      if (seq !== imageSeqRef.current) return;
      console.error('去背失敗:', err);
      setAnalysisError('去背處理失敗，請稍後再試');
    } finally {
      setBgJobRunning(false);
      if (seq === imageSeqRef.current) setIsRemovingBg(false);
    }
  };

  const handleRestoreOriginal = () => {
    applyImage(originalFile, originalPreview, false);
  };

  const handleSaveApiKey = () => {
    const key = apiKeyInput.trim();
    if (!key) return;
    setAnthropicApiKey(key);
    setHasApiKey(true);
    setShowApiKeyModal(false);
    setApiKeyInput('');
    // 儲存後自動分析（直接用剛存的 key 與最新圖片，不依賴舊 closure）
    const source = currentSourceRef.current;
    if (source) runAnalysis(source, key);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalData = {
      ...formData,
      category: formData.category === 'custom' ? customCategory : formData.category,
      size: formData.size === 'custom' ? customSize : formData.size,
      material: formData.material === 'custom' ? customMaterial : formData.material,
    };

    onSubmit(finalData as Omit<Clothing, 'id' | 'createdAt'>, imageFile || undefined);
  };

  const handleColorSelect = (color: string) => {
    colorTouchedRef.current = true;
    setFormData({ ...formData, color });
    setShowCustomColor(false);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 圖片上傳 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            衣服照片 *
          </label>
          <ImageUploader
            onImageSelect={handleImageSelect}
            previewUrl={imagePreview || formData.imageUrl}
          />
        </div>

        {/* 智慧分析 & 去背按鈕 */}
        {(imageFile || formData.imageUrl) && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleSmartAnalyze}
              disabled={isAnalyzing}
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  分析中...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  智慧辨識
                </>
              )}
            </button>
            {bgRemoved ? (
              <div className="flex gap-2">
                <div className="flex-1 px-4 py-3 bg-green-500 text-white rounded-lg flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  已去背完成
                </div>
                <button
                  type="button"
                  onClick={handleRestoreOriginal}
                  className="flex-1 px-4 py-3 border border-purple-300 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 010 10H9M3 10l4-4M3 10l4 4" />
                  </svg>
                  還原原圖
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleRemoveBackground}
                disabled={isRemovingBg || bgJobRunning}
                className="w-full px-4 py-3 text-white rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
              >
                {isRemovingBg ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    去背中... {bgRemovalProgress}%
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {bgCache ? '套用去背' : '自動去背'}
                  </>
                )}
              </button>
            )}
            {!hasApiKey && (
              <p className="text-xs text-gray-500 text-center">
                首次使用需設定 Anthropic API Key
              </p>
            )}
            {analysisError && (
              <p className="text-sm text-red-500 text-center">{analysisError}</p>
            )}
          </div>
        )}

        {/* 種類 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            種類 *
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            required
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300"
          >
            <option value="">請選擇種類</option>
            {CATEGORY_GROUPS.map((group) => (
              <optgroup key={group} label={group}>
                {CATEGORY_OPTIONS.filter((opt) => opt.group === group).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </optgroup>
            ))}
            <option value="custom">其他（自訂）</option>
          </select>
          {formData.category === 'custom' && (
            <input
              type="text"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              placeholder="請輸入種類"
              required
              className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
          )}
        </div>

        {/* 尺寸 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            尺寸 *
          </label>
          <select
            value={formData.size}
            onChange={(e) => setFormData({ ...formData, size: e.target.value })}
            required
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300"
          >
            <option value="">請選擇尺寸</option>
            {SIZE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
            <option value="custom">其他（自訂）</option>
          </select>
          {formData.size === 'custom' && (
            <input
              type="text"
              value={customSize}
              onChange={(e) => setCustomSize(e.target.value)}
              placeholder="請輸入尺寸"
              required
              className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
          )}
        </div>

        {/* 材質 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            材質 *
          </label>
          <select
            value={formData.material}
            onChange={(e) => setFormData({ ...formData, material: e.target.value })}
            required
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300"
          >
            <option value="">請選擇材質</option>
            {MATERIAL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
            <option value="custom">其他（自訂）</option>
          </select>
          {formData.material === 'custom' && (
            <input
              type="text"
              value={customMaterial}
              onChange={(e) => setCustomMaterial(e.target.value)}
              placeholder="請輸入材質"
              required
              className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
          )}
        </div>

        {/* 顏色 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            顏色 *
          </label>
          {/* 常用顏色 */}
          <div className="flex flex-wrap gap-2 mb-2">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => handleColorSelect(preset.value)}
                className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                  formData.color === preset.value
                    ? 'border-pink-400 ring-2 ring-pink-200'
                    : 'border-gray-200'
                }`}
                style={{ backgroundColor: preset.value }}
                title={preset.label}
              />
            ))}
            <button
              type="button"
              onClick={() => setShowCustomColor(!showCustomColor)}
              className={`w-8 h-8 rounded-full border-2 border-dashed flex items-center justify-center transition-colors ${
                showCustomColor
                  ? 'border-pink-400 text-pink-400 bg-pink-50'
                  : 'border-gray-300 text-gray-400 hover:border-pink-300 hover:text-pink-400'
              }`}
              title="更多顏色"
            >
              {showCustomColor ? '−' : '+'}
            </button>
          </div>

          {/* 展開色板 */}
          {showCustomColor && (
            <div className="border border-gray-200 rounded-lg p-3 mb-2 space-y-2">
              {COLOR_PALETTE.map((row) => (
                <div key={row.group} className="flex items-center gap-1">
                  <span className="text-xs text-gray-400 w-12 shrink-0 text-right pr-1">{row.group}</span>
                  <div className="flex gap-1 flex-wrap">
                    {row.colors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => handleColorSelect(color)}
                        className={`w-7 h-7 rounded border transition-transform hover:scale-125 ${
                          formData.color === color
                            ? 'border-pink-400 ring-2 ring-pink-200'
                            : 'border-gray-200'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              ))}
              {/* 自訂色碼輸入 */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-400">自訂色碼</span>
                <input
                  type="text"
                  value={customHexInput}
                  onChange={(e) => setCustomHexInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const hex = customHexInput.startsWith('#') ? customHexInput : `#${customHexInput}`;
                      if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                        handleColorSelect(hex.toUpperCase());
                        setCustomHexInput('');
                      }
                    }
                  }}
                  placeholder="#FF5733"
                  className="w-24 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-pink-300"
                />
                <button
                  type="button"
                  onClick={() => {
                    const hex = customHexInput.startsWith('#') ? customHexInput : `#${customHexInput}`;
                    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                      handleColorSelect(hex.toUpperCase());
                      setCustomHexInput('');
                    }
                  }}
                  className="px-2 py-1 text-xs bg-pink-100 text-pink-600 rounded hover:bg-pink-200 transition-colors"
                >
                  確定
                </button>
              </div>
            </div>
          )}

          {/* 已選顏色預覽 */}
          <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
            <span>已選擇：</span>
            <span
              className="w-5 h-5 rounded border border-gray-200"
              style={{ backgroundColor: formData.color }}
            />
            <span className="text-gray-700">{getColorName(formData.color)}</span>
            <span className="text-xs text-gray-400">{formData.color}</span>
          </div>
        </div>

        {/* 品牌（選填） */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            品牌
          </label>
          <input
            type="text"
            value={formData.brand}
            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
            placeholder="例如：Uniqlo、H&M"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300"
          />
        </div>

        {/* 購買日期（選填） */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            購買日期
          </label>
          <input
            type="date"
            value={formData.purchaseDate}
            onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300"
          />
        </div>

        {/* 備註（選填） */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            備註
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="任何想記錄的事項..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none"
          />
        </div>

        {/* 儲存錯誤（緊貼儲存按鈕上方，手機按下後立即可見） */}
        {error && (
          <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* 按鈕 */}
        <div className="flex gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading || (!imageFile && !formData.imageUrl)}
            className="flex-1 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '儲存中...' : '儲存'}
          </button>
        </div>
      </form>

      {/* API Key 設定對話框 */}
      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-800">設定 Anthropic API Key</h3>
            <p className="mt-2 text-sm text-gray-600">
              智慧辨識功能使用 Anthropic Claude API。請前往{' '}
              <a
                href="https://platform.claude.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-pink-500 underline"
              >
                Claude Platform Console
              </a>{' '}
              取得 API Key（依用量計費）。
            </p>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="輸入 API Key"
              className="mt-4 w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setShowApiKeyModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveApiKey}
                disabled={!apiKeyInput.trim()}
                className="flex-1 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-50"
              >
                儲存並分析
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
