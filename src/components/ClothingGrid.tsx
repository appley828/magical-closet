import type { Clothing } from '../types';
import ClothingCard from './ClothingCard';

interface ClothingGridProps {
  clothes: Clothing[];
  onClothingClick?: (clothing: Clothing) => void;
  selectedIds?: string[];
  emptyMessage?: string;
}

export default function ClothingGrid({
  clothes,
  onClothingClick,
  selectedIds = [],
  emptyMessage = '還沒有衣服，快來新增吧！'
}: ClothingGridProps) {
  if (clothes.length === 0) {
    return (
      <div className="text-center py-16">
        <svg
          className="mx-auto h-16 w-16 text-gray-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
        <p className="mt-4 text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {clothes.map((clothing) => (
        <ClothingCard
          key={clothing.id}
          clothing={clothing}
          onClick={() => onClothingClick?.(clothing)}
          selected={selectedIds.includes(clothing.id)}
        />
      ))}
    </div>
  );
}
