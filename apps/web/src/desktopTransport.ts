type DesktopInvoke = (command: string, args?: Record<string, unknown>) => Promise<unknown>;

interface DesktopInternals {
  invoke: DesktopInvoke;
}

declare global {
  interface Window {
    __TAURI_INTERNALS__?: DesktopInternals;
  }
}

function desktopInvoke(): DesktopInvoke | undefined {
  return window.__TAURI_INTERNALS__?.invoke;
}

function requestDetails(input: RequestInfo | URL, init?: RequestInit) {
  const request = typeof input === 'string' || input instanceof URL ? undefined : input;
  const rawPath = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const parsed = new URL(rawPath, window.location.origin);
  const path = `${parsed.pathname}${parsed.search}`;
  const method = (init?.method ?? request?.method ?? 'GET').toUpperCase();
  const body = typeof init?.body === 'string' ? init.body : undefined;
  return { method, path, body };
}

function parseDesktopResponse(raw: unknown): Response {
  if (typeof raw !== 'string') throw new Error('Desktop transport returned an invalid response');
  const separator = raw.indexOf('\n');
  if (separator < 1) throw new Error('Desktop transport returned a malformed response');
  const status = Number(raw.slice(0, separator));
  if (!Number.isInteger(status) || status < 100 || status > 599) {
    throw new Error('Desktop transport returned an invalid status');
  }
  return new Response(raw.slice(separator + 1), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function installDesktopTransport(): void {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const details = requestDetails(input, init);
    const invoke = desktopInvoke();
    if (!invoke || !details.path.startsWith('/api/v1/')) {
      return nativeFetch(input, init);
    }
    if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(details.method)) {
      throw new Error(`Desktop transport does not allow ${details.method} requests`);
    }
    if (details.body !== undefined && details.method === 'GET') {
      throw new Error('Desktop transport does not allow GET request bodies');
    }
    const raw = await invoke('desktop_request', details);
    return parseDesktopResponse(raw);
  };
}
