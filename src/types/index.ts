import { Timestamp } from 'firebase/firestore';

export type ClothingCategory =
  // 上衣
  | 'T恤' | '襯衫' | '毛衣' | '外套' | '背心' | '連帽衫'
  // 下身
  | '長褲' | '短褲' | '裙子' | '牛仔褲' | '運動褲'
  // 洋裝
  | '連身裙' | '吊帶裙'
  // 配件
  | '帽子' | '圍巾' | '髮飾'
  // 鞋子
  | '運動鞋' | '涼鞋' | '靴子' | '皮鞋'
  // 其他
  | string;

export type ClothingSize = '120' | '130' | '140' | '150' | '160' | 'S' | 'M' | 'L' | string;

export type ClothingMaterial = '棉' | '聚酯纖維' | '尼龍' | '羊毛' | '牛仔布' | '針織' | '混紡' | string;

export interface Clothing {
  id: string;
  imageUrl: string;
  category: ClothingCategory;
  size: ClothingSize;
  material: ClothingMaterial;
  color: string;
  brand?: string;
  purchaseDate?: string;
  notes?: string;
  createdAt: Timestamp;
}

export interface Outfit {
  id: string;
  name: string;
  clothingIds: string[];
  occasion?: string;
  createdAt: Timestamp;
}

export interface OutfitItem {
  clothingId: string;
  x: number;
  y: number;
  scale: number;
}

export interface OutfitWithPositions {
  id: string;
  name: string;
  items: OutfitItem[];
  occasion?: string;
  createdAt: Timestamp;
}

export type CategoryGroup = '上衣' | '下身' | '洋裝' | '配件' | '鞋子';

export interface CategoryOption {
  group: CategoryGroup;
  value: ClothingCategory;
  label: string;
}
