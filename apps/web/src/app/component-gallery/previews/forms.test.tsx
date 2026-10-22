// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { renderFormPreview } from './forms';

describe('form category previews', () => {
  afterEach(cleanup);

  it('renders labeled input states and returns null for unrelated IDs', () => {
    render(renderFormPreview('input'));
    expect(screen.getByLabelText('Input preview')).toBeInTheDocument();
    expect(renderFormPreview('card')).toBeNull();
  });

  it('renders validation and disabled select states accessibly', () => {
    render(renderFormPreview('select'));
    expect(screen.getByLabelText('Default select')).toBeInTheDocument();
    expect(screen.getByLabelText('Invalid select')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Disabled select')).toBeDisabled();
  });
});
