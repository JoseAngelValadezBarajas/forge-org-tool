import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { Info } from './Info.js';
it('Info renders original currentColor SVG geometry with an accessible title', () => {
  const markup = renderToStaticMarkup(<Info title="Info" size={20} />);
  expect(markup).toContain('data-icon="Info"');
  expect(markup).toContain('stroke="currentColor"');
  expect(markup).toContain('>Info</title>');
  expect(markup).toContain('width="20"');
});
