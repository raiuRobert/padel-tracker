"use client";

import type { Player } from "@/lib/domain";

/** Tap-to-toggle roster list, shared by the group editor and session setup. */
export function PlayerPicker({
  players,
  selected,
  onToggle,
  disabledIds,
}: {
  players: readonly Player[];
  selected: readonly string[];
  onToggle: (id: string) => void;
  /** Ids that can't be picked right now — e.g. the session is already full. */
  disabledIds?: ReadonlySet<string>;
}) {
  return (
    <ul className="grid grid-cols-2 gap-2">
      {players.map((player) => {
        const isSelected = selected.includes(player.id);
        const isDisabled = !isSelected && (disabledIds?.has(player.id) ?? false);
        return (
          <li key={player.id}>
            <button
              type="button"
              aria-pressed={isSelected}
              disabled={isDisabled}
              onClick={() => onToggle(player.id)}
              className={`flex min-h-12 w-full items-center gap-2 rounded-xl border px-3 text-left text-sm
                          font-semibold transition-colors disabled:opacity-35 ${
                            isSelected
                              ? "border-accent bg-accent/15 text-accent"
                              : "border-line bg-raised text-ink"
                          }`}
            >
              <span
                aria-hidden
                className={`flex size-5 shrink-0 items-center justify-center rounded-md border text-[0.65rem] ${
                  isSelected ? "border-accent bg-accent text-accent-ink" : "border-line"
                }`}
              >
                {isSelected ? "✓" : ""}
              </span>
              <span className="truncate">{player.name}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
