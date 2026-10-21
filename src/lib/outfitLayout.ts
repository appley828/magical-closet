/**
 * 搭配畫布的座標系統
 * 所有位置都存成固定大小「舞台」上的邏輯座標（400 x 600），顯示時再依螢幕寬度等比縮放，
 * 這樣在電腦存的搭配用手機打開，衣服仍會在人台上同一個位置。
 */

import { CATEGORY_OPTIONS } from './constants';
import type { OutfitItem } from '../types';

export const STAGE_WIDTH = 400;
export const STAGE_HEIGHT = 600;
/** 衣服在 scale = 1 時的邊長（邏輯單位） */
export const ITEM_BASE_SIZE = 100;
/** 人台／小孩照片在舞台上佔的範圍 */
export const FIGURE_TOP = 20;
export const FIGURE_HEIGHT = 560;

/** 目前的座標版本；舊版存的是畫布像素座標 */
export const STAGE_VERSION = 2;

export const MIN_SCALE = 0.4;
export const MAX_SCALE = 4;

export type FigureMode = 'dressform' | 'child';

export type PlacementGroup = '上衣' | '下身' | '洋裝' | '配件' | '鞋子' | '其他';

export function getCategoryGroup(category: string): PlacementGroup {
  return CATEGORY_OPTIONS.find((opt) => opt.value === category)?.group ?? '其他';
}

/** 疊放順序：數字大的蓋在上面（褲裙 < 洋裝 < 上衣 < 配件） */
const LAYER_ORDER: Record<PlacementGroup, number> = {
  鞋子: 0,
  下身: 1,
  洋裝: 2,
  其他: 2,
  上衣: 3,
  配件: 4,
};

export function getLayer(category: string): number {
  return LAYER_ORDER[getCategoryGroup(category)];
}

/** 各類衣服的預設位置：top 是佔人形高度的比例，scale 是預設大小 */
type Anchors = Record<PlacementGroup, { top: number; scale: number }>;

// 人台沒有頭和腳：上衣貼肩、褲裙接腰、鞋子放底座
const DRESSFORM_ANCHORS: Anchors = {
  上衣: { top: 0.06, scale: 1.8 },
  下身: { top: 0.3, scale: 1.8 },
  洋裝: { top: 0.06, scale: 2.4 },
  配件: { top: 0.0, scale: 0.8 },
  鞋子: { top: 0.86, scale: 0.8 },
  其他: { top: 0.2, scale: 1.5 },
};

/** 寫實比例小孩的脖子位置（佔身高比例），沒量到時用這個 */
export const DEFAULT_NECK_RATIO = 0.2;
const REFERENCE_BODY = 1 - 0.21;

/**
 * 小孩照片依「脖子位置」推算各部位：脖子以下的身體比例大致固定，
 * 寫實照片和 Q 版大頭插畫只差在頭佔多少，衣服大小也跟著身體長度縮放。
 */
function childAnchors(neckRatio: number): Anchors {
  const n = neckRatio;
  const body = 1 - n;
  const k = body / REFERENCE_BODY;
  return {
    上衣: { top: n - 0.01, scale: 1.6 * k },
    下身: { top: n + 0.29 * body, scale: 1.8 * k },
    洋裝: { top: n - 0.01, scale: 2.4 * k },
    // 帽子的帽緣約在圖片下方 3/4，往上提一點才會戴在額頭而不是蓋住眼睛；頭越大帽子越大
    配件: { top: -0.08, scale: Math.max(0.8, n * 4.6) },
    鞋子: { top: 0.91, scale: 0.7 * k },
    其他: { top: n + 0.1, scale: 1.5 * k },
  };
}

/** 依種類算出衣服放到人形上的預設位置 */
export function getDefaultPlacement(category: string, mode: FigureMode, neckRatio = DEFAULT_NECK_RATIO) {
  const group = getCategoryGroup(category);
  const anchors = mode === 'child' ? childAnchors(neckRatio) : DRESSFORM_ANCHORS;
  let { top, scale } = anchors[group];
  // 圍巾圍在脖子，不是戴在頭上
  if (category === '圍巾') {
    top = mode === 'child' ? neckRatio - 0.04 : 0.02;
    scale = 1;
  }
  const size = ITEM_BASE_SIZE * scale;
  return clampPosition(
    { x: STAGE_WIDTH / 2 - size / 2, y: FIGURE_TOP + FIGURE_HEIGHT * top, scale },
  );
}

/** 至少留一半在舞台內，避免整件拖出界外找不回來 */
export function clampPosition<T extends { x: number; y: number; scale: number }>(item: T): T {
  const size = ITEM_BASE_SIZE * item.scale;
  return {
    ...item,
    x: Math.min(Math.max(item.x, -size / 2), STAGE_WIDTH - size / 2),
    y: Math.min(Math.max(item.y, -size / 2), STAGE_HEIGHT - size / 2),
  };
}

export function clampScale(value: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
}

/**
 * 舊版搭配存的是畫布像素座標（高 600、寬度隨螢幕而變、人台置中）。
 * 高度剛好等於舞台高度，y 不用換；x 不知道當時畫布多寬，
 * 就以所有衣服的水平中心當作人台中心，平移到舞台中央。
 */
export function normalizeOutfitItems(items: OutfitItem[], stageVersion?: number): OutfitItem[] {
  if (stageVersion === STAGE_VERSION || items.length === 0) return items;
  const centers = items.map((item) => item.x + (ITEM_BASE_SIZE * item.scale) / 2);
  const meanCenter = centers.reduce((sum, c) => sum + c, 0) / centers.length;
  const offset = STAGE_WIDTH / 2 - meanCenter;
  return items.map((item) => clampPosition({ ...item, x: item.x + offset }));
}
