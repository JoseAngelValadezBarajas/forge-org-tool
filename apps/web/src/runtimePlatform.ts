export type ForgeRuntimePlatform = 'browser' | 'desktop' | 'android';

export function getForgeRuntimePlatform(): ForgeRuntimePlatform {
  const tauri = typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__);
  if (!tauri) return 'browser';
  const userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  return /android/i.test(userAgent) ? 'android' : 'desktop';
}
