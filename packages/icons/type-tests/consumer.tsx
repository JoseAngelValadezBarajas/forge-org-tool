import { useRef } from 'react';
import { AlertTriangle, Plus, Search, type IconProps } from '@forge-org/icons';

const svgRef = useRef<SVGSVGElement>(null);
const genericProps: IconProps = { size: '1.25rem', title: 'Add item', ref: svgRef };

export const consumerExample = (
  <>
    <Plus {...genericProps} />
    <Search aria-label="Search" size={20} />
    <AlertTriangle title="Review required" focusable="false" />
  </>
);

// The icon API always follows surrounding text color rather than a custom color prop.
// @ts-expect-error color is intentionally not part of IconProps.
export const invalidColor = <Plus color="red" />;
