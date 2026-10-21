import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { ArrowUp } from './ArrowUp.js';
it('ArrowUp renders original currentColor SVG geometry with an accessible title', () => {
  const markup = renderToStaticMarkup(<ArrowUp title="ArrowUp" size={20} />);
  expect(markup).toContain('data-icon="ArrowUp"');
  expect(markup).toContain('stroke="currentColor"');
  expect(markup).toContain('>ArrowUp</title>');
  expect(markup).toContain('width="20"');
});
