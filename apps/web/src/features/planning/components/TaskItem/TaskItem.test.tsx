import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import type { Task } from '@forge-org/api-client';
import { TaskItem } from './TaskItem';

const task: Task = {
  id: 't1',
  feature_id: 'f1',
  title: 'Add tests',
  description: null,
  position: 0,
  status: 'todo',
  created_at: '',
  updated_at: '',
};

describe('TaskItem', () => {
  it('reports task status changes and disables reorder controls at list boundaries', () => {
    const change = vi.fn();
    const moveUp = vi.fn();
    const moveDown = vi.fn();
    render(
      <TaskItem
        task={task}
        onStatusChange={change}
        onMoveUp={moveUp}
        onMoveDown={moveDown}
        isFirst
        isLast
      />,
    );
    fireEvent.change(screen.getByLabelText('Status for Add tests'), { target: { value: 'done' } });
    expect(change).toHaveBeenCalledWith('done');
    expect(screen.getByRole('button', { name: 'Move Add tests up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Add tests down' })).toBeDisabled();
  });
});
