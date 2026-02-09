/**
 * 背景去除工具
 * 使用 @imgly/background-removal 在瀏覽器端進行去背處理
 */

import { removeBackground } from '@imgly/background-removal';

/**
 * 去除圖片背景，回傳透明 PNG Blob
 */
export async function removeImageBackground(
  source: string | File | Blob,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const blob = await removeBackground(source, {
    progress: (_key: string, current: number, total: number) => {
      if (onProgress && total > 0) {
        onProgress(Math.round((current / total) * 100));
      }
    },
  });
  return blob;
}

/**
 * 將 Blob 轉換為 Data URL
 */
export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Blob 轉換失敗'));
    reader.readAsDataURL(blob);
  });
}
