import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { ExternalLink } from './ExternalLink.js';
it('ExternalLink renders original currentColor SVG geometry with an accessible title', () => {
  const markup = renderToStaticMarkup(<ExternalLink title="ExternalLink" size={20} />);
  expect(markup).toContain('data-icon="ExternalLink"');
  expect(markup).toContain('stroke="currentColor"');
  expect(markup).toContain('>ExternalLink</title>');
  expect(markup).toContain('width="20"');
});
