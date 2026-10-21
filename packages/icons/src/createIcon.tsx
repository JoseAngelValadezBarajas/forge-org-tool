import { forwardRef, useId } from 'react';
import type { IconProps } from './IconProps.js';

export function createIcon(name: string, path: string, className: string) {
  const Icon = forwardRef<SVGSVGElement, IconProps>(function Icon(
    { size = 24, width, height, title, titleId, children, ...svgProps },
    ref,
  ) {
    const generatedTitleId = useId();
    const accessibleTitleId = titleId ?? generatedTitleId;
    const isNamed = Boolean(title || svgProps['aria-label'] || svgProps['aria-labelledby']);
    return (
      <svg
        {...svgProps}
        ref={ref}
        className={[className, svgProps.className].filter(Boolean).join(' ')}
        width={width ?? size}
        height={height ?? size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        color="currentColor"
        focusable="false"
        role={isNamed ? 'img' : undefined}
        aria-hidden={isNamed ? undefined : true}
        aria-labelledby={title ? accessibleTitleId : svgProps['aria-labelledby']}
        data-icon={name}
      >
        {title ? <title id={accessibleTitleId}>{title}</title> : null}
        <path d={path} />
        {children}
      </svg>
    );
  });
  Icon.displayName = name;
  return Icon;
}
