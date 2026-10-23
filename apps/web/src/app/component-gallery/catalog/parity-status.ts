import type { CatalogStatus } from './types';

export function catalogStatus(status: string): CatalogStatus {
  if (status === 'NOT_IMPLEMENTED') return 'NOT_IMPLEMENTED';
  if (status === 'PARTIAL') return 'PARTIAL_NOT_REVIEWED';
  return 'IMPLEMENTED_NOT_REVIEWED';
}

export const visualReviewDisclaimer = 'Human Figma visual review pending.';
