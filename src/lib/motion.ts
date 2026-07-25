/**
 * Motion helpers. Pure — no React — so the same rules apply wherever animation is driven from.
 *
 * CSS handles most of the app's animation; this exists for the cases CSS can't express, chiefly
 * animating an element from where it *used to* be after a list reorders.
 */

/** Someone who has asked their device for less motion gets none of it. Checked at call time. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Kept in step with `--ease-out-quart` in globals.css, for JS-driven animations. */
export const EASE_OUT_QUART = "cubic-bezier(0.25, 1, 0.5, 1)";

/** Long enough to follow a row across the table, short enough not to delay the next tap. */
export const REORDER_MS = 420;
