/**
 * Screenshot content sniffing shared by every client-side storage path.
 *
 * This mirrors `BugAttachmentService._image_type` in the Python API. Both
 * implementations are verified against `contracts/transfer/conformance.json`.
 */
export type ImageContentType = 'image/png' | 'image/jpeg' | 'image/webp';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const MAX_PNG_DIMENSION = 16384;

function startsWith(bytes: Uint8Array, prefix: readonly number[]): boolean {
  return bytes.length >= prefix.length && prefix.every((value, index) => bytes[index] === value);
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.subarray(start, end));
}

export function detectImageType(bytes: Uint8Array): ImageContentType | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (startsWith(bytes, PNG_SIGNATURE) && bytes.length >= 45) {
    const chunkLength = view.getUint32(8, false);
    if (chunkLength !== 13 || ascii(bytes, 12, 16) !== 'IHDR') return null;
    const width = view.getUint32(16, false);
    const height = view.getUint32(20, false);
    if (width < 1 || width > MAX_PNG_DIMENSION || height < 1 || height > MAX_PNG_DIMENSION) {
      return null;
    }
    if (ascii(bytes, bytes.length - 8, bytes.length - 4) !== 'IEND') return null;
    return 'image/png';
  }
  if (
    startsWith(bytes, [0xff, 0xd8, 0xff]) &&
    bytes[bytes.length - 2] === 0xff &&
    bytes[bytes.length - 1] === 0xd9
  ) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 12 &&
    ascii(bytes, 0, 4) === 'RIFF' &&
    ascii(bytes, 8, 12) === 'WEBP' &&
    view.getUint32(4, true) + 8 === bytes.length
  ) {
    return 'image/webp';
  }
  return null;
}
