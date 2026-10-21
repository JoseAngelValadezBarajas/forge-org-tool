import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { Upload } from './Upload.js';
it('Upload renders original currentColor SVG geometry with an accessible title', () => {
  const markup = renderToStaticMarkup(<Upload title="Upload" size={20} />);
  expect(markup).toContain('data-icon="Upload"');
  expect(markup).toContain('stroke="currentColor"');
  expect(markup).toContain('>Upload</title>');
  expect(markup).toContain('width="20"');
});
