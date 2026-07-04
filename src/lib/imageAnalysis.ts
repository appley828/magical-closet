/**
 * 圖片分析工具 - 智慧辨識衣服資訊
 */

import Anthropic from '@anthropic-ai/sdk';
import { COLOR_PRESETS, CATEGORY_OPTIONS, MATERIAL_OPTIONS } from './constants';

const ANTHROPIC_MODEL = 'claude-haiku-4-5';

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
 * 使用 Anthropic Claude API 分析衣服圖片
 */
export async function analyzeClothingWithAI(
  imageDataUrl: string,
  apiKey: string
): Promise<ClothingAnalysis> {
  // 壓縮圖片（輸出固定為 JPEG data URL）
  const compressedImage = await compressImageForAI(imageDataUrl);
  const base64Data = compressedImage.split(',')[1];

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

  // 個人前端應用，API Key 由使用者自行提供並存於本機
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  try {
    const response = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: base64Data,
              },
            },
            { type: 'text', text: prompt },
          ],
        },
      ],
    });

    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

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
    if (error instanceof Anthropic.AuthenticationError) {
      throw new Error('API Key 無效或已過期，請重新設定');
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new Error('API 用量已達上限，請稍後再試');
    }
    if (error instanceof Anthropic.APIError) {
      throw new Error(`API 請求失敗: ${error.message}`);
    }
    throw error;
  }
}

/**
 * 檢查是否有設定 Anthropic API Key
 * 優先使用環境變數，其次使用 localStorage
 */
export function getAnthropicApiKey(): string | null {
  // 優先使用環境變數
  const envKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (envKey && envKey !== 'YOUR_ANTHROPIC_API_KEY') {
    return envKey;
  }
  // 其次使用 localStorage
  return localStorage.getItem('anthropic_api_key');
}

/**
 * 儲存 Anthropic API Key
 */
export function setAnthropicApiKey(key: string): void {
  localStorage.setItem('anthropic_api_key', key);
}

/**
 * 移除 Anthropic API Key
 */
export function removeAnthropicApiKey(): void {
  localStorage.removeItem('anthropic_api_key');
}
