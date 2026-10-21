import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { ChevronRight } from './ChevronRight.js';
it('ChevronRight renders original currentColor SVG geometry with an accessible title', () => {
  const markup = renderToStaticMarkup(<ChevronRight title="ChevronRight" size={20} />);
  expect(markup).toContain('data-icon="ChevronRight"');
  expect(markup).toContain('stroke="currentColor"');
  expect(markup).toContain('>ChevronRight</title>');
  expect(markup).toContain('width="20"');
});
