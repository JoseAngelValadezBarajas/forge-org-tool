import { useRef } from 'react';
import { AlertTriangle, Plus, Search, type IconProps } from '@forge-org/icons';

function IconConsumerExample() {
  const svgRef = useRef<SVGSVGElement>(null);
  const genericProps: IconProps = { size: '1.25rem', title: 'Add item', ref: svgRef };

  return (
    <>
      <Plus {...genericProps} />
      <Search aria-label="Search" size={20} />
      <AlertTriangle title="Review required" focusable="false" />
    </>
  );
}

export const consumerExample = <IconConsumerExample />;

// The icon API always follows surrounding text color rather than a custom color prop.
// @ts-expect-error color is intentionally not part of IconProps.
export const invalidColor = <Plus color="red" />;
