import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
  afterEach(cleanup);
  it('offers compact completion while retaining the in-progress status choice', () => {
    const change = vi.fn();
    render(
      <TaskItem
        task={task}
        compact
        onStatusChange={change}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'Complete Add tests' }));
    expect(change).toHaveBeenCalledWith('done');
    fireEvent.change(screen.getByLabelText('Status for Add tests'), {
      target: { value: 'in_progress' },
    });
    expect(change).toHaveBeenCalledWith('in_progress');
  });
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
