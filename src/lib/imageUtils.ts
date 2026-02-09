/**
 * 圖片壓縮工具
 * 將圖片壓縮並轉換為 Base64 字串，存入 Firestore
 */

const MAX_WIDTH = 800;
const MAX_HEIGHT = 800;
const QUALITY = 0.7;

/**
 * 壓縮圖片並轉換為 Base64
 */
export async function compressImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // 計算縮放比例
        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('無法建立 canvas context'));
          return;
        }

        // 繪製並壓縮
        ctx.drawImage(img, 0, 0, width, height);
        const base64 = canvas.toDataURL('image/jpeg', QUALITY);
        resolve(base64);
      };
      img.onerror = () => reject(new Error('圖片載入失敗'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('檔案讀取失敗'));
    reader.readAsDataURL(file);
  });
}

/**
 * 檢查是否為 Base64 圖片
 */
export function isBase64Image(str: string): boolean {
  return str.startsWith('data:image/');
}
