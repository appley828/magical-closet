import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useClothing } from '../hooks/useClothing';
import ClothingGrid from '../components/ClothingGrid';
import FilterBar, { type FilterState } from '../components/FilterBar';
import type { Clothing } from '../types';

export default function HomePage() {
  const { clothes, loading, error, isConfigured } = useClothing();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FilterState>({
    category: '',
    size: '',
    sortBy: 'newest',
  });
  const [search, setSearch] = useState('');

  const filteredClothes = useMemo(() => {
    let result = [...clothes];

    // 搜尋
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.category.toLowerCase().includes(searchLower) ||
          c.brand?.toLowerCase().includes(searchLower) ||
          c.notes?.toLowerCase().includes(searchLower) ||
          c.material.toLowerCase().includes(searchLower)
      );
    }

    // 種類篩選
    if (filters.category) {
      result = result.filter((c) => c.category === filters.category);
    }

    // 尺寸篩選
    if (filters.size) {
      result = result.filter((c) => c.size === filters.size);
    }

    // 排序
    switch (filters.sortBy) {
      case 'newest':
        result.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
        break;
      case 'oldest':
        result.sort((a, b) => a.createdAt.seconds - b.createdAt.seconds);
        break;
      case 'category':
        result.sort((a, b) => a.category.localeCompare(b.category));
        break;
    }

    return result;
  }, [clothes, filters, search]);

  const handleClothingClick = (clothing: Clothing) => {
    navigate(`/clothing/${clothing.id}`);
  };

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-4">
        <div className="max-w-2xl mx-auto pt-16">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <svg
              className="mx-auto h-16 w-16 text-pink-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h2 className="mt-4 text-xl font-semibold text-gray-800">請先設定 Firebase</h2>
            <p className="mt-2 text-gray-600">
              要開始使用魔法衣櫃，請先完成 Firebase 設定：
            </p>
            <ol className="mt-4 text-left text-sm text-gray-600 space-y-2">
              <li>1. 前往 <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-pink-500 underline">Firebase Console</a> 建立專案</li>
              <li>2. 啟用 Firestore 資料庫（不需要 Storage）</li>
              <li>3. 在專案設定中取得網頁應用程式配置</li>
              <li>4. 建立 <code className="bg-gray-100 px-1 rounded">.env</code> 檔案並填入配置</li>
            </ol>
            <pre className="mt-4 text-left text-xs bg-gray-50 p-4 rounded-lg overflow-x-auto">
{`VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=your_app_id`}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">
              魔法衣櫃
            </h1>
            <div className="flex gap-3">
              <Link
                to="/outfit"
                className="px-4 py-2 text-pink-500 border border-pink-300 rounded-lg hover:bg-pink-50 transition-colors"
              >
                搭配衣服
              </Link>
              <Link
                to="/add"
                className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                新增衣服
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* 統計 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <p className="text-3xl font-bold text-pink-500">{clothes.length}</p>
            <p className="text-sm text-gray-500">件衣服</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <p className="text-3xl font-bold text-purple-500">
              {new Set(clothes.map((c) => c.category)).size}
            </p>
            <p className="text-sm text-gray-500">種類別</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <p className="text-3xl font-bold text-blue-500">
              {new Set(clothes.map((c) => c.size)).size}
            </p>
            <p className="text-sm text-gray-500">種尺寸</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <p className="text-3xl font-bold text-green-500">
              {new Set(clothes.map((c) => c.color)).size}
            </p>
            <p className="text-sm text-gray-500">種顏色</p>
          </div>
        </div>

        {/* 篩選 */}
        <FilterBar onFilterChange={setFilters} onSearchChange={setSearch} />

        {/* 錯誤訊息 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* 衣服列表 */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-200 border-t-pink-500"></div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                共 {filteredClothes.length} 件衣服
                {(filters.category || filters.size || search) && (
                  <span>（已篩選）</span>
                )}
              </p>
            </div>
            <ClothingGrid clothes={filteredClothes} onClothingClick={handleClothingClick} />
          </>
        )}
      </main>
    </div>
  );
}
