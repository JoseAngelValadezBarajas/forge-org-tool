import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { ArrowRight } from './ArrowRight.js';
it('ArrowRight renders original currentColor SVG geometry with an accessible title', () => {
  const markup = renderToStaticMarkup(<ArrowRight title="ArrowRight" size={20} />);
  expect(markup).toContain('data-icon="ArrowRight"');
  expect(markup).toContain('stroke="currentColor"');
  expect(markup).toContain('>ArrowRight</title>');
  expect(markup).toContain('width="20"');
});
