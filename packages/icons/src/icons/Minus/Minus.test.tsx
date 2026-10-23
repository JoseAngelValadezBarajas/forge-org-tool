import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { Minus } from './Minus.js';
it('Minus renders original currentColor SVG geometry with an accessible title', () => {
  const markup = renderToStaticMarkup(<Minus title="Minus" size={20} />);
  expect(markup).toContain('data-icon="Minus"');
  expect(markup).toContain('stroke="currentColor"');
  expect(markup).toContain('>Minus</title>');
  expect(markup).toContain('width="20"');
});
