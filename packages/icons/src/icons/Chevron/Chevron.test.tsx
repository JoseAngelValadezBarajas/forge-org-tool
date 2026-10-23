import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { Chevron } from './Chevron.js';
it('Chevron renders original currentColor SVG geometry with an accessible title', () => {
  const markup = renderToStaticMarkup(<Chevron title="Chevron" size={20} />);
  expect(markup).toContain('data-icon="Chevron"');
  expect(markup).toContain('stroke="currentColor"');
  expect(markup).toContain('>Chevron</title>');
  expect(markup).toContain('width="20"');
});
