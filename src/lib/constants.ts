import type { CategoryOption, ClothingSize, ClothingMaterial } from '../types';

export const CATEGORY_OPTIONS: CategoryOption[] = [
  // 上衣
  { group: '上衣', value: 'T恤', label: 'T恤' },
  { group: '上衣', value: '襯衫', label: '襯衫' },
  { group: '上衣', value: '毛衣', label: '毛衣' },
  { group: '上衣', value: '外套', label: '外套' },
  { group: '上衣', value: '背心', label: '背心' },
  { group: '上衣', value: '連帽衫', label: '連帽衫' },
  // 下身
  { group: '下身', value: '長褲', label: '長褲' },
  { group: '下身', value: '短褲', label: '短褲' },
  { group: '下身', value: '裙子', label: '裙子' },
  { group: '下身', value: '牛仔褲', label: '牛仔褲' },
  { group: '下身', value: '運動褲', label: '運動褲' },
  // 洋裝
  { group: '洋裝', value: '連身裙', label: '連身裙' },
  { group: '洋裝', value: '吊帶裙', label: '吊帶裙' },
  // 配件
  { group: '配件', value: '帽子', label: '帽子' },
  { group: '配件', value: '圍巾', label: '圍巾' },
  { group: '配件', value: '髮飾', label: '髮飾' },
  // 鞋子
  { group: '鞋子', value: '運動鞋', label: '運動鞋' },
  { group: '鞋子', value: '涼鞋', label: '涼鞋' },
  { group: '鞋子', value: '靴子', label: '靴子' },
  { group: '鞋子', value: '皮鞋', label: '皮鞋' },
];

export const SIZE_OPTIONS: { value: ClothingSize; label: string }[] = [
  { value: '130', label: '130 (8-9歲)' },
  { value: '140', label: '140 (9-10歲)' },
  { value: '150', label: '150 (10-11歲)' },
];

export const MATERIAL_OPTIONS: { value: ClothingMaterial; label: string }[] = [
  { value: '棉', label: '棉' },
  { value: '聚酯纖維', label: '聚酯纖維' },
  { value: '尼龍', label: '尼龍' },
  { value: '羊毛', label: '羊毛' },
  { value: '牛仔布', label: '牛仔布' },
  { value: '針織', label: '針織' },
  { value: '混紡', label: '混紡' },
];

export const COLOR_PRESETS = [
  { value: '#FFFFFF', label: '白色' },
  { value: '#000000', label: '黑色' },
  { value: '#808080', label: '灰色' },
  { value: '#FF0000', label: '紅色' },
  { value: '#FFC0CB', label: '粉色' },
  { value: '#FFA500', label: '橘色' },
  { value: '#FFFF00', label: '黃色' },
  { value: '#008000', label: '綠色' },
  { value: '#0000FF', label: '藍色' },
  { value: '#000080', label: '深藍' },
  { value: '#800080', label: '紫色' },
  { value: '#A52A2A', label: '棕色' },
  { value: '#F5F5DC', label: '米色' },
  { value: '#FFD700', label: '金色' },
  { value: '#C0C0C0', label: '銀色' },
];

// Comprehensive color palette organized by hue rows (light → dark)
export const COLOR_PALETTE: { group: string; colors: string[] }[] = [
  {
    group: '紅色系',
    colors: ['#FFCDD2', '#EF9A9A', '#E57373', '#EF5350', '#F44336', '#E53935', '#D32F2F', '#B71C1C'],
  },
  {
    group: '橘色系',
    colors: ['#FFE0B2', '#FFCC80', '#FFB74D', '#FFA726', '#FF9800', '#FB8C00', '#F57C00', '#E65100'],
  },
  {
    group: '黃色系',
    colors: ['#FFF9C4', '#FFF176', '#FFEE58', '#FFEB3B', '#FDD835', '#FBC02D', '#F9A825', '#F57F17'],
  },
  {
    group: '綠色系',
    colors: ['#C8E6C9', '#A5D6A7', '#81C784', '#66BB6A', '#4CAF50', '#43A047', '#2E7D32', '#1B5E20'],
  },
  {
    group: '藍色系',
    colors: ['#BBDEFB', '#90CAF9', '#64B5F6', '#42A5F5', '#2196F3', '#1E88E5', '#1565C0', '#0D47A1'],
  },
  {
    group: '紫色系',
    colors: ['#E1BEE7', '#CE93D8', '#BA68C8', '#AB47BC', '#9C27B0', '#8E24AA', '#7B1FA2', '#4A148C'],
  },
  {
    group: '粉色系',
    colors: ['#F8BBD0', '#F48FB1', '#F06292', '#EC407A', '#E91E63', '#D81B60', '#C2185B', '#880E4F'],
  },
  {
    group: '棕色系',
    colors: ['#D7CCC8', '#BCAAA4', '#A1887F', '#8D6E63', '#795548', '#6D4C41', '#5D4037', '#3E2723'],
  },
  {
    group: '灰色系',
    colors: ['#FFFFFF', '#F5F5F5', '#E0E0E0', '#BDBDBD', '#9E9E9E', '#757575', '#424242', '#000000'],
  },
];

export const OCCASION_OPTIONS = [
  '日常',
  '學校',
  '運動',
  '派對',
  '正式場合',
  '戶外活動',
  '睡衣',
];

export const CATEGORY_GROUPS = ['上衣', '下身', '洋裝', '配件', '鞋子'] as const;

export const getCategoriesByGroup = (group: string) => {
  return CATEGORY_OPTIONS.filter((opt) => opt.group === group);
};
