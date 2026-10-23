import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { ArrowLeft } from './ArrowLeft.js';
it('ArrowLeft renders original currentColor SVG geometry with an accessible title', () => {
  const markup = renderToStaticMarkup(<ArrowLeft title="ArrowLeft" size={20} />);
  expect(markup).toContain('data-icon="ArrowLeft"');
  expect(markup).toContain('stroke="currentColor"');
  expect(markup).toContain('>ArrowLeft</title>');
  expect(markup).toContain('width="20"');
});
