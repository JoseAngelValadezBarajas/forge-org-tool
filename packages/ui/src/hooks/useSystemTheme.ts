import { useSyncExternalStore } from 'react';

export type SystemTheme = 'dark' | 'light';

const SYSTEM_THEME_QUERY = '(prefers-color-scheme: dark)';

function getSystemTheme(): SystemTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'dark';
  return window.matchMedia(SYSTEM_THEME_QUERY).matches ? 'dark' : 'light';
}

function subscribeToSystemTheme(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  const query = window.matchMedia(SYSTEM_THEME_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/** Resolves the operating-system color scheme without managing app preferences or storage. */
export function useSystemTheme(): SystemTheme {
  return useSyncExternalStore(subscribeToSystemTheme, getSystemTheme, () => 'dark');
}
