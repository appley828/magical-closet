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
export async function compressImageToBase64(
  file: File,
  options?: { preserveTransparency?: boolean }
): Promise<string> {
  const preserveTransparency = options?.preserveTransparency ?? false;

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
        const format = preserveTransparency ? 'image/png' : 'image/jpeg';
        const base64 = canvas.toDataURL(format, preserveTransparency ? undefined : QUALITY);
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

/** Firestore 單筆文件上限 1MB，留一點空間給其他欄位 */
const FIGURE_MAX_DATA_URL_LENGTH = 900_000;
const FIGURE_MAX_HEIGHT = 900;

/**
 * 長邊超過 maxSide 就縮小。手機原圖動輒 2400 萬像素，
 * 超過 iOS Safari 的 canvas 面積上限，去背前先縮小才不會失敗。
 */
export async function downscaleImage(source: Blob, maxSide = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(source);
  const ratio = maxSide / Math.max(bitmap.width, bitmap.height);
  if (ratio >= 1) return source;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * ratio);
  canvas.height = Math.round(bitmap.height * ratio);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('無法建立 canvas context');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('圖片縮小失敗'))), source.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.92)
  );
}

export interface FigureImage {
  dataUrl: string;
  /** 脖子在人形高度中的比例（0 = 頭頂、1 = 腳底），用來把衣服自動放到肩膀、腰的位置 */
  neckRatio: number;
}

/**
 * 找脖子：從身體中線往左右延伸、連續不透明的那一段寬度，取頭部下方最窄的一列。
 * 只量中線那一段，垂在兩側的馬尾、長髮（和脖子之間有空隙）就不會被算進去。
 * 寫實比例約 0.2，Q 版大頭約 0.33；找不到合理值就用 0.2。
 */
function estimateNeckRatio(data: Uint8ClampedArray, width: number, minY: number, maxY: number, minX: number, maxX: number) {
  const height = maxY - minY + 1;
  const cx = Math.round((minX + maxX) / 2);
  const opaque = (x: number, y: number) => data[(y * width + x) * 4 + 3] > 128;
  let bestY = -1;
  let bestWidth = Infinity;
  for (let y = minY + Math.round(height * 0.1); y <= minY + Math.round(height * 0.45); y++) {
    if (!opaque(cx, y)) continue;
    let left = cx;
    while (left > minX && opaque(left - 1, y)) left--;
    let right = cx;
    while (right < maxX && opaque(right + 1, y)) right++;
    const runWidth = right - left + 1;
    if (runWidth < bestWidth) {
      bestWidth = runWidth;
      bestY = y;
    }
  }
  if (bestY < 0) return 0.2;
  return Math.min(0.42, Math.max(0.12, (bestY - minY) / height));
}

/**
 * 整理小孩全身照：裁掉去背後四周的透明邊（讓頭頂、腳底剛好貼齊），
 * 再縮到 Firestore 放得下的透明 PNG。
 */
export async function prepareFigureImage(source: Blob): Promise<FigureImage> {
  const bitmap = await createImageBitmap(source);
  const full = document.createElement('canvas');
  full.width = bitmap.width;
  full.height = bitmap.height;
  const fullCtx = full.getContext('2d');
  if (!fullCtx) throw new Error('無法建立 canvas context');
  fullCtx.drawImage(bitmap, 0, 0);

  // 找出不透明像素的範圍
  const { data, width, height } = fullCtx.getImageData(0, 0, full.width, full.height);
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 16) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) throw new Error('照片裡找不到人物');
  const neckRatio = estimateNeckRatio(data, width, minY, maxY, minX, maxX);
  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;

  let ratio = Math.min(1, FIGURE_MAX_HEIGHT / cropH);
  for (;;) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(cropW * ratio));
    canvas.height = Math.max(1, Math.round(cropH * ratio));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('無法建立 canvas context');
    ctx.drawImage(full, minX, minY, cropW, cropH, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    if (dataUrl.length <= FIGURE_MAX_DATA_URL_LENGTH || canvas.height < 200) {
      return { dataUrl, neckRatio };
    }
    ratio *= 0.8;
  }
}

/** 圖片四邊大多是透明的 → 已經去過背，不必再跑一次去背模型 */
export async function isAlreadyCutout(source: Blob): Promise<boolean> {
  if (source.type && source.type !== 'image/png' && source.type !== 'image/webp') return false;
  const bitmap = await createImageBitmap(source);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  ctx.drawImage(bitmap, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let transparent = 0;
  let total = 0;
  const sample = (x: number, y: number) => {
    total++;
    if (data[(y * width + x) * 4 + 3] < 16) transparent++;
  };
  for (let x = 0; x < width; x += 4) {
    sample(x, 0);
    sample(x, height - 1);
  }
  for (let y = 0; y < height; y += 4) {
    sample(0, y);
    sample(width - 1, y);
  }
  return transparent / total > 0.8;
}
