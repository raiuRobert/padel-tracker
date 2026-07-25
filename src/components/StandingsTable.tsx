"use client";

import { useI18n } from "@/i18n";
import type { StandingsRow } from "@/lib/standings";
import { useFlipList } from "./useFlipList";

/**
 * Wins and losses as a coloured tick/cross chip.
 *
 * These used to be a letter next to the number — "9V 5Î" in Romanian — which meant the one character
 * carrying the meaning was the easiest thing on the row to misread, and it changed per language. A
 * tick and a cross need no translating and the colour does most of the work at a glance.
 */
function Tally({ kind, count }: { kind: "win" | "loss"; count: number }) {
  const { n } = useI18n();
  const win = kind === "win";
  // Fully worded and correctly counted, so the tooltip and the screen reader both read "1 victorie"
  // rather than the number and a bare plural noun stuck together.
  const label = n(kind, count);

  return (
    <span
      title={label}
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-bold tabular-nums ${
        win ? "bg-accent/15 text-accent" : "bg-danger/15 text-danger"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {win ? <path d="M4 12.5 9.5 18 20 6.5" /> : <path d="M6 6l12 12M18 6L6 18" />}
      </svg>
      {/* The number carries the meaning visually; the label carries it for everyone else. */}
      <span aria-hidden>{count}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

/**
 * The leaderboard, read as a scoreboard: points are the loudest thing on the row and everything
 * else is supporting detail. A list rather than a table, because five numeric columns don't fit a
 * phone and only one of them ever gets argued about.
 *
 * Rows slide when the order changes and the points figure bumps when it ticks up, so a score
 * arriving from someone else's phone is something you notice rather than something you'd have to
 * diff against memory.
 */
export function StandingsTable({
  rows,
  nameOf,
}: {
  rows: readonly StandingsRow[];
  nameOf: (id: string) => string;
}) {
  const { n } = useI18n();
  const listRef = useFlipList<HTMLOListElement>();
  const leader = rows[0]?.points ?? 0;

  return (
    <ol ref={listRef} className="space-y-1">
      {rows.map((row, index) => {
        const first = index === 0 && row.points > 0;
        return (
          <li
            key={row.playerId}
            data-flip-key={row.playerId}
            style={{ "--stagger": index } as React.CSSProperties}
            className={`rise-in flex items-center gap-3 rounded-lg px-3 py-3 transition-colors duration-300 ${
              first ? "bg-accent/10" : "bg-surface"
            }`}
          >
            <span
              className={`score-figure w-5 shrink-0 text-center text-sm ${
                first ? "text-accent" : "text-muted"
              }`}
            >
              {index + 1}
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold tracking-tight">{nameOf(row.playerId)}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                <Tally kind="win" count={row.points} />
                <Tally kind="loss" count={row.losses} />
                <span className="text-muted tabular-nums">
                  {n("roundsPlayed", row.roundsPlayed)}
                  {row.sitOuts > 0 ? ` · ${n("sitOut", row.sitOuts)}` : ""}
                </span>
              </div>
              {/* A bar makes the gap at the top of the table legible at a glance. */}
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-raised" aria-hidden>
                <div
                  className={`bar-grow h-full rounded-full ${first ? "bg-accent" : "bg-muted/50"}`}
                  style={{ transform: `scaleX(${leader > 0 ? row.points / leader : 0})` }}
                />
              </div>
            </div>

            {/*
              Keyed on the value so React swaps the element when the score changes, which replays
              the bump. Cheaper and steadier than tracking the previous value in state.
            */}
            <span
              key={row.points}
              className={`bump-in score-figure shrink-0 text-3xl ${first ? "text-accent" : "text-ink"}`}
            >
              {row.points}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
