import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useClothing } from '../hooks/useClothing';
import ClothingForm from '../components/ClothingForm';
import type { Clothing } from '../types';

export default function ClothingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { clothes, updateClothing, deleteClothing, loading } = useClothing();
  const [clothing, setClothing] = useState<Clothing | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!loading && id) {
      const found = clothes.find((c) => c.id === id);
      if (found) {
        setClothing(found);
      } else {
        navigate('/');
      }
    }
  }, [clothes, id, loading, navigate]);

  const handleUpdate = async (data: Omit<Clothing, 'id' | 'createdAt'>, imageFile?: File) => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    try {
      await updateClothing(id, data, imageFile);
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating clothing:', err);
      setError('更新衣服時發生錯誤，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !clothing) return;

    setIsLoading(true);
    setError(null);

    try {
      await deleteClothing(id);
      navigate('/');
    } catch (err) {
      console.error('Error deleting clothing:', err);
      setError('刪除衣服時發生錯誤，請稍後再試');
      setIsLoading(false);
    }
  };

  if (loading || !clothing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-200 border-t-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-xl font-semibold text-gray-800">
                {isEditing ? '編輯衣服' : '衣服詳情'}
              </h1>
            </div>
            {!isEditing && (
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 text-pink-500 border border-pink-300 rounded-lg hover:bg-pink-50 transition-colors"
                >
                  編輯
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 text-red-500 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                >
                  刪除
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {isEditing ? (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <ClothingForm
              initialData={clothing}
              onSubmit={handleUpdate}
              onCancel={() => setIsEditing(false)}
              isLoading={isLoading}
            />
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {/* 圖片 */}
            <div className="aspect-square bg-gray-100">
              <img
                src={clothing.imageUrl}
                alt={clothing.category}
                className="w-full h-full object-contain"
              />
            </div>

            {/* 詳細資訊 */}
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">{clothing.category}</h2>
                <span
                  className="w-8 h-8 rounded-full border-2 border-gray-200"
                  style={{ backgroundColor: clothing.color }}
                  title={clothing.color}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">尺寸</p>
                  <p className="font-medium">{clothing.size}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">材質</p>
                  <p className="font-medium">{clothing.material}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">顏色</p>
                  <p className="font-medium">{clothing.color}</p>
                </div>
                {clothing.brand && (
                  <div>
                    <p className="text-sm text-gray-500">品牌</p>
                    <p className="font-medium">{clothing.brand}</p>
                  </div>
                )}
                {clothing.purchaseDate && (
                  <div>
                    <p className="text-sm text-gray-500">購買日期</p>
                    <p className="font-medium">{clothing.purchaseDate}</p>
                  </div>
                )}
              </div>

              {clothing.notes && (
                <div>
                  <p className="text-sm text-gray-500">備註</p>
                  <p className="mt-1 text-gray-700">{clothing.notes}</p>
                </div>
              )}

              <div className="pt-4 border-t text-sm text-gray-400">
                新增於 {clothing.createdAt?.toDate?.()?.toLocaleDateString('zh-TW') || '未知'}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 刪除確認對話框 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-800">確定要刪除嗎？</h3>
            <p className="mt-2 text-gray-600">
              刪除後將無法復原，確定要刪除這件衣服嗎？
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {isLoading ? '刪除中...' : '確定刪除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
