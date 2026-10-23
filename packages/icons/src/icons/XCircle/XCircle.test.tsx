import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { XCircle } from './XCircle.js';
it('XCircle renders original currentColor SVG geometry with an accessible title', () => {
  const markup = renderToStaticMarkup(<XCircle title="XCircle" size={20} />);
  expect(markup).toContain('data-icon="XCircle"');
  expect(markup).toContain('stroke="currentColor"');
  expect(markup).toContain('>XCircle</title>');
  expect(markup).toContain('width="20"');
});
