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
        <div className="bg-white rounded-xl shadow-sm p-6">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          <ClothingForm
            onSubmit={handleSubmit}
            onCancel={() => navigate('/')}
            isLoading={isLoading}
          />
        </div>
      </main>
    </div>
  );
}
