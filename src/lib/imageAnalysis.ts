/**
 * 圖片分析工具 - 智慧辨識衣服資訊
 */

import { COLOR_PRESETS, CATEGORY_OPTIONS, MATERIAL_OPTIONS } from './constants';

// Gemini API 端點
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export interface ClothingAnalysis {
  category?: string;
  color?: string;
  colorName?: string;
  material?: string;
  brand?: string;
  notes?: string;
}

/**
 * 壓縮圖片用於 AI 分析
 */
async function compressImageForAI(imageDataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxSize = 512; // 限制最大尺寸
      let { width, height } = img;

      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('無法建立 canvas'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => reject(new Error('圖片載入失敗'));
    img.src = imageDataUrl;
  });
}

/**
 * 從圖片中提取主要顏色
 */
export async function extractDominantColor(imageDataUrl: string): Promise<{ hex: string; name: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ hex: '#FFFFFF', name: '白色' });
        return;
      }

      // 縮小圖片以加快處理速度
      const size = 50;
      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(img, 0, 0, size, size);

      const imageData = ctx.getImageData(0, 0, size, size);
      const data = imageData.data;

      // 計算顏色直方圖
      const colorCounts: Record<string, { count: number; r: number; g: number; b: number }> = {};

      for (let i = 0; i < data.length; i += 4) {
        const r = Math.round(data[i] / 32) * 32;
        const g = Math.round(data[i + 1] / 32) * 32;
        const b = Math.round(data[i + 2] / 32) * 32;
        const key = `${r},${g},${b}`;

        if (!colorCounts[key]) {
          colorCounts[key] = { count: 0, r, g, b };
        }
        colorCounts[key].count++;
      }

      // 找出最常見的顏色（排除接近白色和黑色的背景）
      let dominantColor = { r: 255, g: 255, b: 255 };
      let maxCount = 0;

      Object.values(colorCounts).forEach((color) => {
        const brightness = (color.r + color.g + color.b) / 3;
        // 排除太亮（可能是背景）或太暗的顏色
        if (brightness > 30 && brightness < 240 && color.count > maxCount) {
          maxCount = color.count;
          dominantColor = color;
        }
      });

      const hex = rgbToHex(dominantColor.r, dominantColor.g, dominantColor.b);
      const name = findClosestColorName(hex);

      resolve({ hex, name });
    };
    img.onerror = () => {
      resolve({ hex: '#FFFFFF', name: '白色' });
    };
    img.src = imageDataUrl;
  });
}

/**
 * RGB 轉 HEX
 */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/**
 * 找到最接近的預設顏色名稱
 */
function findClosestColorName(hex: string): string {
  const target = hexToRgb(hex);
  if (!target) return '其他';

  let closestName = '其他';
  let minDistance = Infinity;

  COLOR_PRESETS.forEach((preset) => {
    const presetRgb = hexToRgb(preset.value);
    if (presetRgb) {
      const distance = Math.sqrt(
        Math.pow(target.r - presetRgb.r, 2) +
        Math.pow(target.g - presetRgb.g, 2) +
        Math.pow(target.b - presetRgb.b, 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestName = preset.label;
      }
    }
  });

  return closestName;
}

/**
 * HEX 轉 RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * 使用 Gemini API 分析衣服圖片
 */
export async function analyzeClothingWithAI(
  imageDataUrl: string,
  apiKey: string
): Promise<ClothingAnalysis> {
  // 壓縮圖片
  const compressedImage = await compressImageForAI(imageDataUrl);

  // 從 data URL 中提取 base64 資料
  const base64Data = compressedImage.split(',')[1];
  const mimeType = compressedImage.split(';')[0].split(':')[1] || 'image/jpeg';

  const categories = CATEGORY_OPTIONS.map(c => c.value).join('、');
  const materials = MATERIAL_OPTIONS.map(m => m.value).join('、');

  const prompt = `分析這張衣服圖片，回覆 JSON 格式：
{
  "category": "從這些選一個：${categories}",
  "material": "從這些選一個：${materials}，不確定就留空",
  "brand": "看到的品牌，沒有就留空",
  "notes": "簡短描述特徵（繁體中文）"
}
只回覆 JSON。`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Data,
                },
              },
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 500,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('API 錯誤回應:', errorData);
      throw new Error(errorData.error?.message || `API 請求失敗: ${response.status}`);
    }

    const data = await response.json();
    console.log('API 回應:', data);

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // 解析 JSON 回應
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        category: parsed.category || undefined,
        material: parsed.material || undefined,
        brand: parsed.brand || undefined,
        notes: parsed.notes || undefined,
      };
    }

    return {};
  } catch (error) {
    console.error('AI 分析失敗:', error);
    throw error;
  }
}

/**
 * 檢查是否有設定 Gemini API Key
 * 優先使用環境變數，其次使用 localStorage
 */
export function getGeminiApiKey(): string | null {
  // 優先使用環境變數
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey && envKey !== 'YOUR_GEMINI_API_KEY') {
    return envKey;
  }
  // 其次使用 localStorage
  return localStorage.getItem('gemini_api_key');
}

/**
 * 儲存 Gemini API Key
 */
export function setGeminiApiKey(key: string): void {
  localStorage.setItem('gemini_api_key', key);
}

/**
 * 移除 Gemini API Key
 */
export function removeGeminiApiKey(): void {
  localStorage.removeItem('gemini_api_key');
}
