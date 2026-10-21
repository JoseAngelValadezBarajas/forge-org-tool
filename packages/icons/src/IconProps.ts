import type { SVGProps } from 'react';

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'color' | 'title'> {
  /** Rendered width and height; number values are interpreted as CSS pixels. */
  size?: number | string;
  /** Makes this icon an image with this accessible name. */
  title?: string;
  /** Optional stable id for the rendered title element. */
  titleId?: string;
}
