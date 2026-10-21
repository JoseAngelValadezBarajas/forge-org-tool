import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { CheckCircle } from './CheckCircle.js';
it('CheckCircle renders original currentColor SVG geometry with an accessible title', () => {
  const markup = renderToStaticMarkup(<CheckCircle title="CheckCircle" size={20} />);
  expect(markup).toContain('data-icon="CheckCircle"');
  expect(markup).toContain('stroke="currentColor"');
  expect(markup).toContain('>CheckCircle</title>');
  expect(markup).toContain('width="20"');
});
