"use client";

import type { Player } from "@/lib/domain";

/**
 * Tap-to-toggle roster list, shared by the group editor and session setup.
 *
 * The badge shows the order someone was picked in, not just a tick. That matters for 8-player
 * sessions, where consecutive picks become the opening pairs — the order is real information, so
 * it's on screen rather than hidden.
 */
export function PlayerPicker({
  players,
  selected,
  onToggle,
  disabledIds,
  showOrder = false,
}: {
  players: readonly Player[];
  selected: readonly string[];
  onToggle: (id: string) => void;
  /** Ids that can't be picked right now — e.g. the session is already full. */
  disabledIds?: ReadonlySet<string>;
  showOrder?: boolean;
}) {
  return (
    <ul className="grid grid-cols-2 gap-1.5">
      {players.map((player) => {
        const position = selected.indexOf(player.id);
        const isSelected = position !== -1;
        const isDisabled = !isSelected && (disabledIds?.has(player.id) ?? false);
        return (
          <li key={player.id}>
            <button
              type="button"
              aria-pressed={isSelected}
              disabled={isDisabled}
              onClick={() => onToggle(player.id)}
              className={`flex min-h-12 w-full items-center gap-2 rounded-lg px-3 text-left text-sm
                          font-bold transition-colors disabled:opacity-30 ${
                            isSelected ? "bg-accent text-accent-ink" : "bg-raised text-ink"
                          }`}
            >
              <span
                aria-hidden
                className={`score-figure flex size-6 shrink-0 items-center justify-center rounded text-[0.7rem] ${
                  isSelected ? "bg-accent-ink/20" : "bg-surface text-muted"
                }`}
              >
                {isSelected ? (showOrder ? position + 1 : "✓") : ""}
              </span>
              <span className="truncate">{player.name}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
