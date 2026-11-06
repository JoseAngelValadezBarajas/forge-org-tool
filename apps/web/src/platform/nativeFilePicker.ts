import { isTauri } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';

/**
 * Platform adapter: the native screenshot picker exists only inside the Tauri host.
 * Features call this instead of importing any `@tauri-apps/*` package themselves.
 */
export type NativeScreenshot = { file: File } | { error: string };

const CONTENT_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

export function isNativeFilePickerAvailable(): boolean {
  return isTauri();
}

/** Resolves to `null` when the user cancels. Rejects when the host cannot read the file. */
export async function pickNativeScreenshot(): Promise<NativeScreenshot | null> {
  const selected = await open({
    multiple: false,
    directory: false,
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
  });
  if (!selected || Array.isArray(selected)) return null;

  const fileName = selected.split(/[\\/]/).pop() || 'screenshot';
  const contentType = CONTENT_TYPES[fileName.split('.').pop()?.toLowerCase() ?? ''];
  if (!contentType) return { error: 'Choose a PNG, JPEG, or WebP screenshot.' };

  const selectedBytes = await readFile(selected);
  const bytes = new Uint8Array(selectedBytes.length);
  bytes.set(selectedBytes);
  return { file: new File([bytes.buffer], fileName, { type: contentType }) };
}
