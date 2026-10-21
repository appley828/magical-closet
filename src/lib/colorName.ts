import { COLOR_PRESETS } from './constants';

function parseHex(hex: string): [number, number, number] | null {
  let h = hex.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(h)) {
    h = h.split('').map((c) => c + c).join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/**
 * 將 hex 色碼轉成好懂的顏色名稱。
 * 與常用色完全相同 → 回傳該色名；否則回傳「近似{最接近的常用色}」。
 */
export function getColorName(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;

  let best = COLOR_PRESETS[0];
  let bestDist = Infinity;
  for (const preset of COLOR_PRESETS) {
    const p = parseHex(preset.value);
    if (!p) continue;
    const dist = (rgb[0] - p[0]) ** 2 + (rgb[1] - p[1]) ** 2 + (rgb[2] - p[2]) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = preset;
    }
  }

  return bestDist === 0 ? best.label : `近似${best.label}`;
}
