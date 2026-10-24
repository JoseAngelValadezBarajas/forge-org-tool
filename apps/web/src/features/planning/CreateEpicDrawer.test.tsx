import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CreateEpicDrawer } from './CreateEpicDrawer';

describe('CreateEpicDrawer', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('focuses the title without scrolling the drawer past its heading', () => {
    const focus = vi.spyOn(HTMLInputElement.prototype, 'focus');

    render(
      <CreateEpicDrawer
        projectName="FormiAI"
        title=""
        onTitleChange={vi.fn()}
        description=""
        onDescriptionChange={vi.fn()}
        priority="medium"
        onPriorityChange={vi.fn()}
        tags=""
        onTagsChange={vi.fn()}
        workspaceTags={[]}
        tagCatalogError=""
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'New Epic' })).toBeVisible();
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });
});
