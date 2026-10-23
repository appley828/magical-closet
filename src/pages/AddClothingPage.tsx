import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useClothing } from '../hooks/useClothing';
import ClothingForm from '../components/ClothingForm';
import type { Clothing } from '../types';

export default function AddClothingPage() {
  const navigate = useNavigate();
  const { addClothing } = useClothing();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: Omit<Clothing, 'id' | 'createdAt'>, imageFile?: File) => {
    setIsLoading(true);
    setError(null);

    try {
      await addClothing(data, imageFile);
      navigate('/');
    } catch (err) {
      console.error('Error adding clothing:', err);
      setError('新增衣服時發生錯誤，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-semibold text-gray-800">新增衣服</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        <Link
          to="/add/batch"
          className="mb-4 block px-4 py-3 bg-white rounded-xl shadow-sm text-sm text-center text-pink-500 hover:bg-pink-50 transition-colors"
        >
          一次有很多件？改用批次新增（最多 6 張照片）
        </Link>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <ClothingForm
            onSubmit={handleSubmit}
            onCancel={() => navigate('/')}
            isLoading={isLoading}
            error={error}
          />
        </div>
      </main>
    </div>
  );
}
