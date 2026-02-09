import { useState } from 'react';
import { CATEGORY_OPTIONS, SIZE_OPTIONS, CATEGORY_GROUPS } from '../lib/constants';

interface FilterBarProps {
  onFilterChange: (filters: FilterState) => void;
  onSearchChange: (search: string) => void;
}

export interface FilterState {
  category: string;
  size: string;
  sortBy: 'newest' | 'oldest' | 'category';
}

export default function FilterBar({ onFilterChange, onSearchChange }: FilterBarProps) {
  const [filters, setFilters] = useState<FilterState>({
    category: '',
    size: '',
    sortBy: 'newest',
  });
  const [search, setSearch] = useState('');

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    onSearchChange(value);
  };

  const clearFilters = () => {
    const defaultFilters: FilterState = { category: '', size: '', sortBy: 'newest' };
    setFilters(defaultFilters);
    setSearch('');
    onFilterChange(defaultFilters);
    onSearchChange('');
  };

  const hasActiveFilters = filters.category || filters.size || search;

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
      {/* 搜尋 */}
      <div className="relative">
        <input
          type="text"
          placeholder="搜尋衣服..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* 篩選選項 */}
      <div className="flex flex-wrap gap-3">
        {/* 種類篩選 */}
        <select
          value={filters.category}
          onChange={(e) => handleFilterChange('category', e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
        >
          <option value="">所有種類</option>
          {CATEGORY_GROUPS.map((group) => (
            <optgroup key={group} label={group}>
              {CATEGORY_OPTIONS.filter((opt) => opt.group === group).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        {/* 尺寸篩選 */}
        <select
          value={filters.size}
          onChange={(e) => handleFilterChange('size', e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
        >
          <option value="">所有尺寸</option>
          {SIZE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* 排序 */}
        <select
          value={filters.sortBy}
          onChange={(e) => handleFilterChange('sortBy', e.target.value as FilterState['sortBy'])}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
        >
          <option value="newest">最新新增</option>
          <option value="oldest">最早新增</option>
          <option value="category">依種類</option>
        </select>

        {/* 清除篩選 */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-2 text-sm text-pink-500 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-colors"
          >
            清除篩選
          </button>
        )}
      </div>
    </div>
  );
}
