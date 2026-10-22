import { actionCatalogIds } from './actions';
import { foundationCatalog } from './foundations';
import { feedbackOverlayCatalogIds } from './feedback-overlays';
import { formCatalogIds } from './forms';
import { navigationCatalogIds } from './navigation';
import { productPatternCatalogIds } from './product-patterns';
import { surfacesDataCatalogIds } from './surfaces-data';
import type { CatalogSection } from './types';

export const catalogSections: CatalogSection[] = [
  'Foundations and tokens',
  'Core UI primitives',
  'Generic shared compositions',
  'Product-specific components',
  'Icon library',
];

export const catalogFamilies = {
  Foundations: foundationCatalog.map((item) => item.id),
  Actions: actionCatalogIds,
  Forms: formCatalogIds,
  Navigation: navigationCatalogIds,
  'Surfaces and data': surfacesDataCatalogIds,
  'Feedback and overlays': feedbackOverlayCatalogIds,
  'Product patterns': productPatternCatalogIds,
  Icons: ['icons'],
} as const;

const familyEntries = Object.entries(catalogFamilies).flatMap(([family, ids]) =>
  ids.map((id) => [id, family] as const),
);

export const catalogFamilyById = new Map<string, string>(familyEntries);
