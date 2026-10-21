import { useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';

interface UserMenuProps {
  user: User;
  onSignOut: () => void;
}

export default function UserMenu({ user, onSignOut }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointer = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('touchstart', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('touchstart', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const name = user.displayName ?? user.email ?? '使用者';
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="帳號選單"
        className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden bg-pink-100 text-pink-600 font-semibold ring-2 ring-transparent hover:ring-pink-200 focus:outline-none focus:ring-pink-300 transition"
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        ) : (
          initial
        )}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20"
        >
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-800 truncate">{name}</p>
            {user.displayName && user.email && (
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            )}
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            className="w-full text-left px-4 min-h-[44px] text-sm text-gray-600 hover:bg-pink-50 hover:text-pink-500 transition-colors"
          >
            登出
          </button>
        </div>
      )}
    </div>
  );
}
