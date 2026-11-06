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
import {
  applyTheme,
  createTheme,
  presets,
  type Theme as ForgeTheme,
} from '@corefoundry-labs/forge-tokens/theme-v2';

export type ThemeMode = SystemTheme | 'system' | 'high-contrast';
/** Light/dark family used by the V1 token set (`data-theme`). */
export type ResolvedTheme = SystemTheme;

interface ThemeContextValue {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  /** Theme Engine V2 theme generated from the Forge preset for the active mode. */
  forgeTheme: ForgeTheme;
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
    return stored === 'dark' ||
      stored === 'light' ||
      stored === 'system' ||
      stored === 'high-contrast'
      ? stored
      : fallback;
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

  // High contrast is a V2 mode; V1 tokens keep following their dark family.
  const resolvedTheme: ResolvedTheme =
    theme === 'system' ? systemTheme : theme === 'high-contrast' ? 'dark' : theme;
  const forgeTheme = useMemo(
    () => createTheme({ ...presets.forge, mode: theme === 'system' ? systemTheme : theme }),
    [theme, systemTheme],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, forgeTheme, setTheme }),
    [theme, resolvedTheme, forgeTheme, setTheme],
  );

  useEffect(() => {
    if (applyToDocument && typeof document !== 'undefined') {
      document.documentElement.dataset.theme = resolvedTheme;
      document.documentElement.dataset.cfThemeMode = forgeTheme.mode;
      applyTheme(document.documentElement, forgeTheme);
    }
  }, [applyToDocument, resolvedTheme, forgeTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used within ThemeProvider');
  return value;
}
