"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  children: React.ReactNode;
};

/**
 * Horizontal overflow area that scrolls when the user click-drags the track.
 * Clicks on links/buttons/inputs are left alone; a small move threshold keeps
 * card clicks working.
 */
export function DragScroll({ className, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const state = useRef({
    active: false,
    moved: false,
    startX: 0,
    scrollLeft: 0,
    pointerId: -1,
  });

  function isInteractive(target: EventTarget | null) {
    if (!(target instanceof Element)) return false;
    return Boolean(
      target.closest("a, button, input, select, textarea, label, [role='button'], [data-no-drag]"),
    );
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    if (isInteractive(event.target)) return;
    const el = ref.current;
    if (!el) return;

    state.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      scrollLeft: el.scrollLeft,
      pointerId: event.pointerId,
    };
    el.setPointerCapture(event.pointerId);
    el.classList.add("cursor-grabbing");
    el.classList.remove("cursor-grab");
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    const s = state.current;
    if (!el || !s.active) return;

    const dx = event.clientX - s.startX;
    if (!s.moved && Math.abs(dx) < 4) return;
    s.moved = true;
    el.scrollLeft = s.scrollLeft - dx;
    event.preventDefault();
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    const s = state.current;
    if (!el || !s.active) return;

    if (s.pointerId === event.pointerId && el.hasPointerCapture(event.pointerId)) {
      el.releasePointerCapture(event.pointerId);
    }
    s.active = false;
    el.classList.remove("cursor-grabbing");
    el.classList.add("cursor-grab");

    // Suppress the click that fires after a drag so links aren't opened by accident.
    if (s.moved) {
      const suppress = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        el.removeEventListener("click", suppress, true);
      };
      el.addEventListener("click", suppress, true);
      window.setTimeout(() => el.removeEventListener("click", suppress, true), 0);
    }
  }

  return (
    <div
      ref={ref}
      className={cn(
        "cursor-grab overflow-x-auto pb-4 scrollbar-thin active:cursor-grabbing",
        "select-none [&_a]:select-text [&_button]:select-text",
        className,
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      role="region"
      aria-label="Scrollable board"
    >
      {children}
    </div>
  );
}
