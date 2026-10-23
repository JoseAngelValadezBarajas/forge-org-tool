import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { Folder } from './Folder.js';
it('Folder renders original currentColor SVG geometry with an accessible title', () => {
  const markup = renderToStaticMarkup(<Folder title="Folder" size={20} />);
  expect(markup).toContain('data-icon="Folder"');
  expect(markup).toContain('stroke="currentColor"');
  expect(markup).toContain('>Folder</title>');
  expect(markup).toContain('width="20"');
});
