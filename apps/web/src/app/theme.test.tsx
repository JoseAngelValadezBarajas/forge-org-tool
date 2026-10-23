import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider, useTheme } from './theme';

function ThemeProbe() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  return (
    <div data-testid="theme-root" data-theme={resolvedTheme}>
      <label>
        Appearance
        <select value={theme} onChange={(event) => setTheme(event.target.value as typeof theme)}>
          <option value="dark">Dark</option>
          <option value="light">Light</option>
          <option value="system">System</option>
        </select>
      </label>
      <output>{resolvedTheme}</output>
    </div>
  );
}

function renderTheme() {
  return render(
    <ThemeProvider>
      <ThemeProbe />
    </ThemeProvider>,
  );
}

describe('application theme state', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('restores and persists an explicit light preference', () => {
    localStorage.setItem('forge-theme', 'light');
    renderTheme();

    expect(screen.getByTestId('theme-root')).toHaveAttribute('data-theme', 'light');
    fireEvent.change(screen.getByRole('combobox', { name: 'Appearance' }), {
      target: { value: 'dark' },
    });
    expect(localStorage.getItem('forge-theme')).toBe('dark');
    expect(screen.getByTestId('theme-root')).toHaveAttribute('data-theme', 'dark');
  });

  it('follows system appearance changes only while System is selected', () => {
    let systemIsDark = false;
    const listeners = new Set<(event: MediaQueryListEvent) => void>();
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        get matches() {
          return systemIsDark;
        },
        addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) =>
          listeners.add(listener),
        removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) =>
          listeners.delete(listener),
      })),
    );
    renderTheme();

    systemIsDark = true;
    act(() => listeners.forEach((listener) => listener({ matches: true } as MediaQueryListEvent)));
    expect(screen.getByTestId('theme-root')).toHaveAttribute('data-theme', 'dark');
    fireEvent.change(screen.getByRole('combobox', { name: 'Appearance' }), {
      target: { value: 'system' },
    });
    expect(screen.getByTestId('theme-root')).toHaveAttribute('data-theme', 'dark');
    systemIsDark = false;
    act(() => listeners.forEach((listener) => listener({ matches: false } as MediaQueryListEvent)));
    expect(screen.getByTestId('theme-root')).toHaveAttribute('data-theme', 'light');

    fireEvent.change(screen.getByRole('combobox', { name: 'Appearance' }), {
      target: { value: 'light' },
    });
    systemIsDark = true;
    act(() => listeners.forEach((listener) => listener({ matches: true } as MediaQueryListEvent)));
    expect(screen.getByTestId('theme-root')).toHaveAttribute('data-theme', 'light');
  });

  it('defaults to Dark and remains usable when preference storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });
    renderTheme();

    expect(screen.getByTestId('theme-root')).toHaveAttribute('data-theme', 'dark');
    fireEvent.change(screen.getByRole('combobox', { name: 'Appearance' }), {
      target: { value: 'light' },
    });
    expect(screen.getByTestId('theme-root')).toHaveAttribute('data-theme', 'light');
  });
});
