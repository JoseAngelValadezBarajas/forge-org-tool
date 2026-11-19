import type { useFeatureDetailPage } from '../useFeatureDetailPage';

export type FeatureDetailModel = ReturnType<typeof useFeatureDetailPage>;

export const titleCase = (value?: string | null) =>
  value ? value.replaceAll('_', ' ') : 'Unknown';
