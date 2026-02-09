import { useState, useEffect } from 'react';
import type { Clothing } from '../types';
import { CATEGORY_OPTIONS, SIZE_OPTIONS, MATERIAL_OPTIONS, COLOR_PRESETS, COLOR_PALETTE, CATEGORY_GROUPS } from '../lib/constants';
import { extractDominantColor, analyzeClothingWithAI, getGeminiApiKey, setGeminiApiKey } from '../lib/imageAnalysis';
import ImageUploader from './ImageUploader';

interface ClothingFormProps {
  initialData?: Partial<Clothing>;
  onSubmit: (data: Omit<Clothing, 'id' | 'createdAt'>, imageFile?: File) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export default function ClothingForm({ initialData, onSubmit, onCancel, isLoading }: ClothingFormProps) {
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
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    setHasApiKey(!!getGeminiApiKey());
  }, []);

  const handleImageSelect = async (file: File) => {
    setImageFile(file);
    setAnalysisError(null);

    // 建立預覽
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);

      // 自動偵測顏色
      try {
        const colorResult = await extractDominantColor(dataUrl);
        setFormData(prev => ({ ...prev, color: colorResult.hex }));
      } catch (err) {
        console.warn('顏色偵測失敗:', err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSmartAnalyze = async () => {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      setShowApiKeyModal(true);
      return;
    }

    const imageSource = imagePreview || formData.imageUrl;
    if (!imageSource) {
      setAnalysisError('請先上傳圖片');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      // 先偵測顏色
      const colorResult = await extractDominantColor(imageSource);

      // 使用 AI 分析
      const analysis = await analyzeClothingWithAI(imageSource, apiKey);

      // 更新表單
      setFormData(prev => ({
        ...prev,
        color: colorResult.hex,
        category: analysis.category && CATEGORY_OPTIONS.some(c => c.value === analysis.category)
          ? analysis.category
          : prev.category,
        material: analysis.material && MATERIAL_OPTIONS.some(m => m.value === analysis.material)
          ? analysis.material
          : prev.material,
        brand: analysis.brand || prev.brand,
        notes: analysis.notes || prev.notes,
      }));

    } catch (err) {
      console.error('分析失敗:', err);
      setAnalysisError(err instanceof Error ? err.message : 'AI 分析失敗，請稍後再試');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      setGeminiApiKey(apiKeyInput.trim());
      setHasApiKey(true);
      setShowApiKeyModal(false);
      setApiKeyInput('');
      // 儲存後自動分析
      setTimeout(handleSmartAnalyze, 100);
    }
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

        {/* 智慧分析按鈕 */}
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
            {!hasApiKey && (
              <p className="text-xs text-gray-500 text-center">
                首次使用需設定 Gemini API Key（免費）
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
            <span>{formData.color}</span>
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
            <h3 className="text-lg font-semibold text-gray-800">設定 Gemini API Key</h3>
            <p className="mt-2 text-sm text-gray-600">
              智慧辨識功能使用 Google Gemini API（免費）。請前往{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-pink-500 underline"
              >
                Google AI Studio
              </a>{' '}
              取得免費 API Key。
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
