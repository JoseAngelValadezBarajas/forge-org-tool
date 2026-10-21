import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { Layers } from './Layers.js';
it('Layers renders original currentColor SVG geometry with an accessible title', () => {
  const markup = renderToStaticMarkup(<Layers title="Layers" size={20} />);
  expect(markup).toContain('data-icon="Layers"');
  expect(markup).toContain('stroke="currentColor"');
  expect(markup).toContain('>Layers</title>');
  expect(markup).toContain('width="20"');
});
