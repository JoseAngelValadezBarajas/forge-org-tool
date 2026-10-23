export type CatalogSection =
  | 'Foundations and tokens'
  | 'Core UI primitives'
  | 'Generic shared compositions'
  | 'Product-specific components'
  | 'Icon library';

export type CatalogStatus = 'IMPLEMENTED_NOT_REVIEWED' | 'PARTIAL_NOT_REVIEWED' | 'NOT_IMPLEMENTED';

export interface CatalogItem {
  id: string;
  name: string;
  section: CatalogSection;
  owner: string;
  status: CatalogStatus;
  figma: string;
  variants: string;
  states: string;
  accessibility: string;
  deviations: string;
  hostStatus?: 'AVAILABLE';
}

export interface PreviewProps {
  item: CatalogItem;
  onIncrement: () => void;
  count: number;
}
