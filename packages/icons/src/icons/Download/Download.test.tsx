import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { Download } from './Download.js';
it('Download renders original currentColor SVG geometry with an accessible title', () => {
  const markup = renderToStaticMarkup(<Download title="Download" size={20} />);
  expect(markup).toContain('data-icon="Download"');
  expect(markup).toContain('stroke="currentColor"');
  expect(markup).toContain('>Download</title>');
  expect(markup).toContain('width="20"');
});
