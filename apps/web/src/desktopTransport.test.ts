// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { installDesktopTransport } from './desktopTransport';

const originalFetch = window.fetch;

afterEach(() => {
  window.fetch = originalFetch;
  delete (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
  vi.restoreAllMocks();
});

describe('Desktop transport bridge', () => {
  it('delegates API requests to the authenticated Tauri command and preserves responses', async () => {
    const invoke = vi.fn().mockResolvedValue('201\n{"id":"project-1"}');
    Object.defineProperty(window, '__TAURI_INTERNALS__', {
      configurable: true,
      value: { invoke },
    });

    installDesktopTransport();
    const response = await fetch('/api/v1/workspaces/w1/projects', {
      method: 'POST',
      body: '{"name":"Forge"}',
    });

    expect(invoke).toHaveBeenCalledWith('desktop_request', {
      method: 'POST',
      path: '/api/v1/workspaces/w1/projects',
      body: '{"name":"Forge"}',
    });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ id: 'project-1' });
  });

  it('leaves browser transport unchanged when Tauri is unavailable', async () => {
    const browserFetch = vi.fn().mockResolvedValue(new Response('{"status":"ok"}'));
    window.fetch = browserFetch;

    installDesktopTransport();
    await fetch('/api/v1/health');

    expect(browserFetch).toHaveBeenCalledWith('/api/v1/health', undefined);
  });

  it('rejects the local API transport in the Android shell without invoking Desktop IPC', async () => {
    const invoke = vi.fn();
    const browserFetch = vi.fn();
    window.fetch = browserFetch;
    Object.defineProperty(window, '__TAURI_INTERNALS__', {
      configurable: true,
      value: { invoke },
    });

    installDesktopTransport('android');

    await expect(fetch('/api/v1/workspaces')).rejects.toThrow(
      'Local SQLite transport is unavailable on Android; configure Supabase storage.',
    );
    expect(invoke).not.toHaveBeenCalled();
    expect(browserFetch).not.toHaveBeenCalled();
  });

  it('preserves query strings and rejects methods outside the Rust policy', async () => {
    const invoke = vi.fn().mockResolvedValue('200\n[]');
    Object.defineProperty(window, '__TAURI_INTERNALS__', {
      configurable: true,
      value: { invoke },
    });

    installDesktopTransport();
    await fetch('/api/v1/workspaces/w1/projects?search=forge&status=active');

    expect(invoke).toHaveBeenCalledWith('desktop_request', {
      method: 'GET',
      path: '/api/v1/workspaces/w1/projects?search=forge&status=active',
      body: undefined,
    });

    await expect(fetch('/api/v1/workspaces', { method: 'PUT' })).rejects.toThrow(
      'Desktop transport does not allow PUT requests',
    );
  });
});
