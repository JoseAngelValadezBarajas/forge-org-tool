import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';

type PointerDrag = {
  id: string;
  x: number;
  y: number;
  target: HTMLElement;
};

type PointerKanbanDragOptions<TStatus extends string> = {
  onDrop: (id: string, status: TStatus) => void;
  threshold?: number;
};

export function usePointerKanbanDrag<TStatus extends string>({
  onDrop,
  threshold = 6,
}: PointerKanbanDragOptions<TStatus>) {
  const pending = useRef<PointerDrag | null>(null);
  const dragging = useRef(false);
  const suppressClick = useRef(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const start = useCallback((id: string, event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    if (
      (event.target as HTMLElement).closest(
        'button,input,select,textarea,summary,[contenteditable="true"]',
      )
    ) {
      return;
    }
    pending.current = { id, x: event.clientX, y: event.clientY, target: event.currentTarget };
    dragging.current = false;
  }, []);

  useEffect(() => {
    const handlePointerMove = (event: globalThis.PointerEvent) => {
      const source = pending.current;
      if (!source) return;
      const distance = Math.hypot(event.clientX - source.x, event.clientY - source.y);
      if (!dragging.current && distance < threshold) return;
      if (!dragging.current) {
        source.target.setPointerCapture?.(event.pointerId);
        dragging.current = true;
        suppressClick.current = true;
        setDraggingId(source.id);
      }
      event.preventDefault();
    };

    const finish = (event: globalThis.PointerEvent) => {
      const source = pending.current;
      if (!source) return;
      if (dragging.current) {
        const element = document.elementFromPoint(event.clientX, event.clientY);
        const status = element?.closest<HTMLElement>('[data-kanban-status]')?.dataset.kanbanStatus;
        if (status) onDrop(source.id, status as TStatus);
        event.preventDefault();
      }
      pending.current = null;
      dragging.current = false;
      setDraggingId(null);
    };

    const cancel = () => {
      pending.current = null;
      dragging.current = false;
      setDraggingId(null);
    };

    const preventClickAfterDrag = (event: MouseEvent) => {
      if (!suppressClick.current) return;
      suppressClick.current = false;
      event.preventDefault();
      event.stopPropagation();
    };

    document.addEventListener('pointermove', handlePointerMove, { passive: false });
    document.addEventListener('pointerup', finish, { passive: false });
    document.addEventListener('pointercancel', cancel);
    document.addEventListener('click', preventClickAfterDrag, true);
    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', finish);
      document.removeEventListener('pointercancel', cancel);
      document.removeEventListener('click', preventClickAfterDrag, true);
    };
  }, [onDrop, threshold]);

  return { draggingId, start };
}
