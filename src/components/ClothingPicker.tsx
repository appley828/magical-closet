import { useMemo, useState } from 'react';
import type { Clothing } from '../types';
import DraggableClothing from './DraggableClothing';
import { getCategoryGroup, type PlacementGroup } from '../lib/outfitLayout';

interface ClothingPickerProps {
  clothes: Clothing[];
  activeIds: Set<string>;
  onToggle: (clothing: Clothing) => void;
  /** tray：手機底部橫向抽屜；panel：桌機左側面板 */
  variant: 'tray' | 'panel';
}

const GROUP_ORDER: PlacementGroup[] = ['上衣', '下身', '洋裝', '鞋子', '配件', '其他'];

export default function ClothingPicker({ clothes, activeIds, onToggle, variant }: ClothingPickerProps) {
  const [group, setGroup] = useState<PlacementGroup | ''>('');

  // 只列出實際有衣服的分類
  const groups = useMemo(() => {
    const present = new Set(clothes.map((c) => getCategoryGroup(c.category)));
    return GROUP_ORDER.filter((g) => present.has(g));
  }, [clothes]);

  const filtered = useMemo(
    () => (group ? clothes.filter((c) => getCategoryGroup(c.category) === group) : clothes),
    [clothes, group]
  );

  const chips = (
    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {(['', ...groups] as const).map((g) => (
        <button
          key={g || 'all'}
          type="button"
          onClick={() => setGroup(g)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-sm transition-colors ${
            group === g ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-pink-50'
          }`}
        >
          {g || '全部'}
        </button>
      ))}
    </div>
  );

  const empty = <p className="text-center text-sm text-gray-400 py-4 w-full">衣櫃裡還沒有衣服</p>;

  if (variant === 'tray') {
    return (
      <div className="space-y-2">
        {chips}
        <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filtered.length === 0
            ? empty
            : filtered.map((clothing) => (
                <DraggableClothing
                  key={clothing.id}
                  clothing={clothing}
                  size="sm"
                  active={activeIds.has(clothing.id)}
                  onTap={() => onToggle(clothing)}
                />
              ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {chips}
      <div className="grid grid-cols-3 xl:grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto p-1">
        {filtered.length === 0
          ? empty
          : filtered.map((clothing) => (
              <DraggableClothing
                key={clothing.id}
                clothing={clothing}
                active={activeIds.has(clothing.id)}
                onTap={() => onToggle(clothing)}
              />
            ))}
      </div>
      <p className="text-xs text-gray-400">點一下穿上／脫下，也可以拖到畫布上指定位置</p>
    </div>
  );
}
