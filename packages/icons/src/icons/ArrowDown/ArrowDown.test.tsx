import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { ArrowDown } from './ArrowDown.js';
it('ArrowDown renders original currentColor SVG geometry with an accessible title', () => {
  const markup = renderToStaticMarkup(<ArrowDown title="ArrowDown" size={20} />);
  expect(markup).toContain('data-icon="ArrowDown"');
  expect(markup).toContain('stroke="currentColor"');
  expect(markup).toContain('>ArrowDown</title>');
  expect(markup).toContain('width="20"');
});
