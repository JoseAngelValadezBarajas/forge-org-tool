import { apiErrorFromResponse } from './errors';

export type ApiRequest = { path: `/api/v1/${string}`; signal?: AbortSignal };

export async function getApiJson<T>(request: ApiRequest): Promise<T> {
  const response = await fetch(request.path, {
    signal: request.signal,
    credentials: 'same-origin',
  });
  if (!response.ok) throw await apiErrorFromResponse(response);
  return response.json() as Promise<T>;
}

export async function sendJson<T>(path: `/api/v1/${string}`, init: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  if (!response.ok) throw await apiErrorFromResponse(response);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
