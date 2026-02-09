import type { Clothing } from '../types';

interface ClothingCardProps {
  clothing: Clothing;
  onClick?: () => void;
  selected?: boolean;
}

export default function ClothingCard({ clothing, onClick, selected }: ClothingCardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer transition-all hover:shadow-md hover:-translate-y-1 ${
        selected ? 'ring-2 ring-pink-400' : ''
      }`}
    >
      <div className="aspect-square overflow-hidden bg-gray-100">
        <img
          src={clothing.imageUrl}
          alt={clothing.category}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-800">{clothing.category}</span>
          <span
            className="w-4 h-4 rounded-full border border-gray-200"
            style={{ backgroundColor: clothing.color }}
            title={clothing.color}
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="bg-gray-100 px-2 py-0.5 rounded">{clothing.size}</span>
          <span>{clothing.material}</span>
        </div>
        {clothing.brand && (
          <p className="mt-1 text-xs text-gray-400">{clothing.brand}</p>
        )}
      </div>
    </div>
  );
}
