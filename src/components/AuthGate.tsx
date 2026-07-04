import { useState, type ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { isFirebaseConfigured } from '../lib/firebase';

export default function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading, signInWithGoogle } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Firebase 未設定時直接放行，讓 HomePage 顯示設定教學
  if (!isFirebaseConfigured()) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-200 border-t-pink-500"></div>
      </div>
    );
  }

  if (!user) {
    const handleSignIn = async () => {
      setSigningIn(true);
      setError(null);
      try {
        await signInWithGoogle();
      } catch (err) {
        console.error('登入失敗:', err);
        setError('登入失敗，請再試一次');
      } finally {
        setSigningIn(false);
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-sm w-full text-center">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">
            魔法衣櫃
          </h1>
          <p className="mt-3 text-gray-600">請先登入，開始整理妳的衣櫃吧！</p>
          <button
            type="button"
            onClick={handleSignIn}
            disabled={signingIn}
            className="mt-6 w-full px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            {signingIn ? '登入中...' : '使用 Google 帳號登入'}
          </button>
          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
