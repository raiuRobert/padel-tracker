"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";
import { EASE_OUT_QUART, prefersReducedMotion, REORDER_MS } from "@/lib/motion";

/**
 * Animates list items sliding to new positions when the list reorders — the FLIP technique (First,
 * Last, Invert, Play) that GSAP's Flip plugin popularised.
 *
 * The DOM has already jumped to the new order by the time we can see it, so instead of animating
 * *to* the new position we measure how far each row moved, offset it back to where it was, and let
 * it travel to zero. The payoff is that when a friend's score arrives and the leaderboard
 * reshuffles, you can see *who* overtook *whom* rather than the table blinking into a new order.
 *
 * Usage: put the returned ref on the list container and a `data-flip-key` on each child.
 *
 * Items are found by querying the container rather than by collecting a ref per row. Per-row ref
 * callbacks have to cope with React attaching and detaching them, and any bookkeeping cleaned up on
 * detach takes the remembered positions with it — which silently turns every reorder into a
 * no-op. A single container ref has no such lifecycle to get wrong.
 */
export function useFlipList<T extends HTMLElement = HTMLElement>(): RefObject<T | null> {
  const container = useRef<T | null>(null);
  const tops = useRef(new Map<string, number>());

  useLayoutEffect(() => {
    const root = container.current;
    if (!root) return;

    const previous = tops.current;
    const next = new Map<string, number>();

    // Measure every row before animating any of them, so reads aren't interleaved with writes that
    // would force extra layout passes.
    const moved: { node: HTMLElement; delta: number }[] = [];
    for (const node of root.querySelectorAll<HTMLElement>("[data-flip-key]")) {
      const key = node.dataset.flipKey;
      if (!key) continue;
      const top = node.getBoundingClientRect().top;
      next.set(key, top);
      const before = previous.get(key);
      if (before === undefined) continue;
      const delta = before - top;
      // Sub-pixel shifts aren't worth an animation.
      if (Math.abs(delta) > 1) moved.push({ node, delta });
    }

    tops.current = next;
    if (prefersReducedMotion()) return;

    for (const { node, delta } of moved) {
      node.animate(
        [{ transform: `translate3d(0, ${delta}px, 0)` }, { transform: "translate3d(0, 0, 0)" }],
        { duration: REORDER_MS, easing: EASE_OUT_QUART },
      );
    }
  });

  return container;
}
