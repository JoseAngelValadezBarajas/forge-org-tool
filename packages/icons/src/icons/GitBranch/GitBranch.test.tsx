import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { GitBranch } from './GitBranch.js';
it('GitBranch renders original currentColor SVG geometry with an accessible title', () => {
  const markup = renderToStaticMarkup(<GitBranch title="GitBranch" size={20} />);
  expect(markup).toContain('data-icon="GitBranch"');
  expect(markup).toContain('stroke="currentColor"');
  expect(markup).toContain('>GitBranch</title>');
  expect(markup).toContain('width="20"');
});
