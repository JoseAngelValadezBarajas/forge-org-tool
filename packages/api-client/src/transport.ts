import { apiErrorFromResponse } from './errors.js';

export type ApiRequest = { path: `/api/v1/${string}`; signal?: AbortSignal };

export type ApiRequestHandler = {
  getJson<T>(request: ApiRequest): Promise<T>;
  getBlob(request: ApiRequest): Promise<Blob>;
  sendJson<T>(path: `/api/v1/${string}`, init: RequestInit): Promise<T>;
  preflight?: () => Promise<{ schemaVersion: string }>;
};

const localHandler: ApiRequestHandler = {
  async getJson<T>(request: ApiRequest): Promise<T> {
    const response = await fetch(request.path, {
      signal: request.signal,
      credentials: 'same-origin',
    });
    if (!response.ok) throw await apiErrorFromResponse(response);
    return response.json() as Promise<T>;
  },

  async getBlob(request: ApiRequest): Promise<Blob> {
    const response = await fetch(request.path, {
      signal: request.signal,
      credentials: 'same-origin',
    });
    if (!response.ok) throw await apiErrorFromResponse(response);
    return response.blob();
  },

  async sendJson<T>(path: `/api/v1/${string}`, init: RequestInit): Promise<T> {
    const response = await fetch(path, {
      ...init,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
    if (!response.ok) throw await apiErrorFromResponse(response);
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  },
};

let activeHandler: ApiRequestHandler = localHandler;

export function setApiRequestHandler(handler: ApiRequestHandler): void {
  activeHandler = handler;
}

export function resetApiRequestHandler(): void {
  activeHandler = localHandler;
}

export async function getApiJson<T>(request: ApiRequest): Promise<T> {
  return activeHandler.getJson<T>(request);
}

export async function getApiBlob(request: ApiRequest): Promise<Blob> {
  return activeHandler.getBlob(request);
}

export async function sendJson<T>(path: `/api/v1/${string}`, init: RequestInit): Promise<T> {
  return activeHandler.sendJson<T>(path, init);
}
