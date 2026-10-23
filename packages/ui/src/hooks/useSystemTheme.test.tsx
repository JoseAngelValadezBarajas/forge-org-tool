import { act, cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSystemTheme } from './useSystemTheme';

function ThemeProbe() {
  return <output aria-label="Resolved system theme">{useSystemTheme()}</output>;
}

describe('useSystemTheme', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('resolves the current operating-system theme and observes later changes', () => {
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

    render(<ThemeProbe />);
    expect(screen.getByLabelText('Resolved system theme')).toHaveTextContent('light');

    systemIsDark = true;
    act(() => listeners.forEach((listener) => listener({ matches: true } as MediaQueryListEvent)));
    expect(screen.getByLabelText('Resolved system theme')).toHaveTextContent('dark');
  });

  it('uses dark when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);

    render(<ThemeProbe />);

    expect(screen.getByLabelText('Resolved system theme')).toHaveTextContent('dark');
  });
});
