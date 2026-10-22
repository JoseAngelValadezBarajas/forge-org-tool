import type { CatalogItem } from './types';

export const foundationCatalog: CatalogItem[] = [
  {
    id: 'tokens',
    name: 'Semantic tokens',
    section: 'Foundations and tokens',
    owner: '@forge-org/tokens',
    status: 'IMPLEMENTED_NOT_REVIEWED',
    figma: 'Page 02: Foundations and Tokens',
    variants: 'dark, light',
    states: 'theme selection',
    accessibility: 'Color is paired with text labels in previews.',
    deviations: 'Figma variable reconciliation is pending.',
  },
];
