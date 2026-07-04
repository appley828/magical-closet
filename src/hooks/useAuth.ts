import { useContext } from 'react';
import { AuthContext } from '../contexts/auth-context';

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth 必須在 AuthProvider 內使用');
  }
  return ctx;
}
