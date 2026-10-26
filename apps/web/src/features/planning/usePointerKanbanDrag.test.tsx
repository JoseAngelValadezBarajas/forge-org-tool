import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { usePointerKanbanDrag } from './usePointerKanbanDrag';

function Harness({ onDrop }: { onDrop: (id: string, status: string) => void }) {
  const drag = usePointerKanbanDrag({ onDrop });
  return (
    <>
      <div
        data-testid="source"
        data-dragging={drag.draggingId === 'epic-1' ? 'true' : undefined}
        onPointerDown={(event) => drag.start('epic-1', event)}
      />
      <div data-kanban-status="ready" data-testid="target" />
    </>
  );
}

describe('usePointerKanbanDrag', () => {
  it('drops a card after the pointer crosses the drag threshold', () => {
    const onDrop = vi.fn();
    const target = document.createElement('div');
    target.dataset.kanbanStatus = 'ready';
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: vi.fn().mockReturnValue(target),
    });

    render(<Harness onDrop={onDrop} />);
    fireEvent.pointerDown(screen.getByTestId('source'), {
      button: 0,
      clientX: 10,
      clientY: 10,
    });
    fireEvent.pointerMove(document, { clientX: 20, clientY: 20 });
    fireEvent.pointerUp(document, { clientX: 20, clientY: 20 });

    expect(onDrop).toHaveBeenCalledWith('epic-1', 'ready');
    vi.restoreAllMocks();
  });
});
