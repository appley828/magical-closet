import { useSyncExternalStore } from 'react';

function subscribeResize(callback: () => void) {
  window.addEventListener('resize', callback);
  return () => window.removeEventListener('resize', callback);
}

/** 視窗高度（px），手機轉向或網址列收合時會更新 */
export function useViewportHeight() {
  return useSyncExternalStore(subscribeResize, () => window.innerHeight);
}

/** 是否符合 media query，例如 '(min-width: 1024px)' */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (callback) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', callback);
      return () => mql.removeEventListener('change', callback);
    },
    () => window.matchMedia(query).matches
  );
}
