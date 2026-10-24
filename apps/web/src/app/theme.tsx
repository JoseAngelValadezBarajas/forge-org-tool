import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useSystemTheme, type SystemTheme } from '@corefoundry-labs/forge-ui';

export type ThemeMode = SystemTheme | 'system';
export type ResolvedTheme = SystemTheme;

interface ThemeContextValue {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemeMode) => void;
}

interface ThemeProviderProps {
  children: ReactNode;
  initialTheme?: ThemeMode;
  storageKey?: string | null;
  applyToDocument?: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = 'forge-theme';

function readTheme(storageKey: string | null, fallback: ThemeMode): ThemeMode {
  if (!storageKey || typeof window === 'undefined') return fallback;
  try {
    const stored = window.localStorage.getItem(storageKey);
    return stored === 'dark' || stored === 'light' || stored === 'system' ? stored : fallback;
  } catch {
    return fallback;
  }
}

export function ThemeProvider({
  children,
  initialTheme = 'dark',
  storageKey = STORAGE_KEY,
  applyToDocument = false,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeMode>(() => readTheme(storageKey, initialTheme));
  const systemTheme = useSystemTheme();

  const setTheme = useCallback(
    (nextTheme: ThemeMode) => {
      setThemeState(nextTheme);
      if (!storageKey || typeof window === 'undefined') return;
      try {
        window.localStorage.setItem(storageKey, nextTheme);
      } catch {
        // Theme changes remain available when browser storage is blocked.
      }
    },
    [storageKey],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme: theme === 'system' ? systemTheme : theme,
      setTheme,
    }),
    [theme, systemTheme, setTheme],
  );

  const resolvedTheme = theme === 'system' ? systemTheme : theme;
  useEffect(() => {
    if (applyToDocument && typeof document !== 'undefined') {
      document.documentElement.dataset.theme = resolvedTheme;
    }
  }, [applyToDocument, resolvedTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used within ThemeProvider');
  return value;
}
