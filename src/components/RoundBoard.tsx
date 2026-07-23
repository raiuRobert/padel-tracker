"use client";

import { useState } from "react";
import type { SessionRound } from "@/lib/domain";
import { formatPair } from "@/lib/format";
import type { Match } from "@/lib/rotation/types";
import type { MatchResult } from "@/lib/standings";
import { Button, Card } from "./ui";

/**
 * A round, with score entry. Built for tapping while standing on a court: every target is a large
 * button, entering a score is two taps, and nothing depends on hovering or dragging.
 */

type Scores = Record<number, { a?: number; b?: number }>;

function initialScores(round: SessionRound): Scores {
  const scores: Scores = {};
  for (const match of round.matches) {
    const result = round.results.find((r) => r.court === match.court);
    scores[match.court] = { a: result?.teamAGames, b: result?.teamBGames };
  }
  return scores;
}

function TeamLine({ names, side }: { names: readonly string[]; side: "a" | "b" }) {
  return (
    <span className={`font-semibold ${side === "a" ? "text-team-a" : "text-team-b"}`}>
      {formatPair(names)}
    </span>
  );
}

/** Row of tappable game counts. Two taps — one per team — records a whole rotation. */
function ScorePicker({
  max,
  value,
  onChange,
  side,
  label,
}: {
  max: number;
  value: number | undefined;
  onChange: (value: number) => void;
  side: "a" | "b";
  label: string;
}) {
  const tone = side === "a" ? "border-team-a bg-team-a/20 text-team-a" : "border-team-b bg-team-b/20 text-team-b";
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
      {Array.from({ length: max + 1 }, (_, games) => {
        const selected = value === games;
        return (
          <button
            key={games}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(games)}
            className={`h-11 min-w-11 flex-1 rounded-lg border text-base font-bold transition-colors ${
              selected ? tone : "border-line bg-raised text-muted"
            }`}
          >
            {games}
          </button>
        );
      })}
    </div>
  );
}

export function MatchSummary({
  match,
  result,
  nameOf,
  courts,
}: {
  match: Match;
  result?: MatchResult;
  nameOf: (id: string) => string;
  courts: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="min-w-0 truncate">
        {courts > 1 ? <span className="mr-2 text-xs text-muted">C{match.court}</span> : null}
        <TeamLine names={match.teamA.map(nameOf)} side="a" />
        <span className="mx-1.5 text-muted">v</span>
        <TeamLine names={match.teamB.map(nameOf)} side="b" />
      </span>
      <span className="shrink-0 font-mono font-bold tabular-nums">
        {result ? `${result.teamAGames}–${result.teamBGames}` : "–"}
      </span>
    </div>
  );
}

export function RoundBoard({
  round,
  gamesToWin,
  courts,
  nameOf,
  onSave,
  saveLabel = "Save round",
}: {
  round: SessionRound;
  gamesToWin: number;
  courts: number;
  nameOf: (id: string) => string;
  onSave: (results: MatchResult[]) => Promise<void> | void;
  saveLabel?: string;
}) {
  const [scores, setScores] = useState<Scores>(() => initialScores(round));
  const [saving, setSaving] = useState(false);

  const complete = round.matches.every((match) => {
    const score = scores[match.court];
    return score?.a !== undefined && score?.b !== undefined;
  });

  const set = (court: number, side: "a" | "b", games: number) =>
    setScores((current) => ({ ...current, [court]: { ...current[court], [side]: games } }));

  async function save() {
    if (!complete) return;
    setSaving(true);
    try {
      await onSave(
        round.matches.map((match) => ({
          court: match.court,
          teamAGames: scores[match.court].a!,
          teamBGames: scores[match.court].b!,
        })),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-4">
      {round.sittingOut.length > 0 ? (
        <p className="mb-4 rounded-lg bg-raised px-3 py-2 text-sm text-muted">
          <span className="font-semibold text-ink">Sitting out:</span>{" "}
          {round.sittingOut.map(nameOf).join(", ")}
        </p>
      ) : null}

      <div className="space-y-5">
        {round.matches.map((match) => (
          <div key={match.court}>
            {courts > 1 ? (
              <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">
                Court {match.court}
              </p>
            ) : null}

            <div className="mb-2 flex items-center justify-between gap-2 text-base">
              <TeamLine names={match.teamA.map(nameOf)} side="a" />
            </div>
            <ScorePicker
              max={gamesToWin}
              value={scores[match.court]?.a}
              onChange={(games) => set(match.court, "a", games)}
              side="a"
              label={`Games for ${formatPair(match.teamA.map(nameOf))}`}
            />

            <div className="my-2 flex items-center justify-between gap-2 text-base">
              <TeamLine names={match.teamB.map(nameOf)} side="b" />
            </div>
            <ScorePicker
              max={gamesToWin}
              value={scores[match.court]?.b}
              onChange={(games) => set(match.court, "b", games)}
              side="b"
              label={`Games for ${formatPair(match.teamB.map(nameOf))}`}
            />
          </div>
        ))}
      </div>

      <Button className="mt-5 w-full" disabled={!complete || saving} onClick={() => void save()}>
        {saving ? "Saving…" : saveLabel}
      </Button>
    </Card>
  );
}
