"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ExtraForm } from "@/components/ExtraForm";
import { MatchSummary, RoundBoard } from "@/components/RoundBoard";
import { Button, Card, EmptyState, SectionTitle } from "@/components/ui";
import type { Extra } from "@/lib/cost";
import type { Session, SessionRound } from "@/lib/domain";
import { suggestedRoundCount } from "@/lib/domain";
import { pluralise } from "@/lib/format";
import { generateAmericanoSchedule } from "@/lib/rotation";
import { buildNextRound, currentRound, isRoundScored } from "@/lib/session";
import type { MatchResult } from "@/lib/standings";
import { useData } from "../../providers";

export default function SessionPlayPage() {
  const { id } = useParams<{ id: string }>();
  const { sessions, playerName, patchSession } = useData();
  const [addingExtra, setAddingExtra] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const ensured = useRef<string | null>(null);

  const session = sessions.find((s) => s.id === id);

  /**
   * Make sure there's always a round waiting to be played. Americano's whole schedule is generated
   * up front — that's what makes it Americano — while Mexicano's next round can only be built once
   * the previous one has been scored.
   */
  useEffect(() => {
    if (!session || session.status !== "active" || currentRound(session)) return;

    const key = `${session.id}:${session.rounds.length}`;
    if (ensured.current === key) return;
    ensured.current = key;

    const rounds =
      session.mode === "americano" && session.rounds.length === 0
        ? generateAmericanoSchedule({
            players: session.playerIds,
            courts: session.courts,
            rounds: suggestedRoundCount(session.hours),
          }).map<SessionRound>((round) => ({ ...round, results: [] }))
        : [...session.rounds, buildNextRound(session)];

    void patchSession(session.id, { rounds });
  }, [session, patchSession]);

  if (!session) return null;

  const playing = currentRound(session);
  const played = session.rounds.filter(isRoundScored);
  const upcoming = session.rounds.filter((round) => !isRoundScored(round) && round !== playing);

  async function saveScore(round: SessionRound, results: MatchResult[]) {
    if (!session) return;
    await patchSession(session.id, {
      rounds: session.rounds.map((r) => (r.index === round.index ? { ...r, results } : r)),
    });
    setEditingIndex(null);
  }

  async function addExtra(extra: Extra) {
    if (!session) return;
    await patchSession(session.id, { extras: [...session.extras, extra] });
    setAddingExtra(false);
  }

  async function setStatus(status: Session["status"]) {
    if (!session) return;
    await patchSession(session.id, { status });
  }

  return (
    <>
      {addingExtra ? (
        <div className="mb-6">
          <ExtraForm
            playerIds={session.playerIds}
            nameOf={playerName}
            onAdd={addExtra}
            onCancel={() => setAddingExtra(false)}
          />
        </div>
      ) : null}

      {playing ? (
        <section className="mb-8">
          <SectionTitle
            action={
              <Button
                variant="ghost"
                className="h-9 min-h-9 px-3 text-sm"
                onClick={() => setAddingExtra(true)}
              >
                + Extra
              </Button>
            }
          >
            Round {playing.index + 1}
          </SectionTitle>
          <RoundBoard
            key={playing.index}
            round={playing}
            gamesToWin={session.gamesToWin}
            courts={session.courts}
            nameOf={playerName}
            onSave={(results) => saveScore(playing, results)}
          />
        </section>
      ) : session.status === "finished" ? (
        <section className="mb-8">
          <EmptyState icon="✅" title="Session finished">
            {pluralise(played.length, "round")} played. The standings and cost split are final.
          </EmptyState>
        </section>
      ) : null}

      {played.length > 0 ? (
        <section className="mb-8">
          <SectionTitle>Played</SectionTitle>
          <div className="space-y-2">
            {[...played].reverse().map((round) =>
              editingIndex === round.index ? (
                <div key={round.index}>
                  <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">
                    Editing round {round.index + 1}
                  </p>
                  <RoundBoard
                    round={round}
                    gamesToWin={session.gamesToWin}
                    courts={session.courts}
                    nameOf={playerName}
                    onSave={(results) => saveScore(round, results)}
                    saveLabel="Update score"
                  />
                  <Button variant="ghost" className="mt-2 w-full" onClick={() => setEditingIndex(null)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Card key={round.index} className="p-4">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-semibold tracking-wide text-muted uppercase">
                      Round {round.index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingIndex(round.index)}
                      className="text-sm font-semibold text-muted hover:text-ink"
                    >
                      Edit
                    </button>
                  </div>
                  {round.matches.map((match) => (
                    <MatchSummary
                      key={match.court}
                      match={match}
                      result={round.results.find((r) => r.court === match.court)}
                      nameOf={playerName}
                      courts={session.courts}
                    />
                  ))}
                  {round.sittingOut.length > 0 ? (
                    <p className="mt-1.5 text-xs text-muted">
                      Sat out: {round.sittingOut.map(playerName).join(", ")}
                    </p>
                  ) : null}
                </Card>
              ),
            )}
          </div>
        </section>
      ) : null}

      {upcoming.length > 0 ? (
        <section className="mb-8">
          <SectionTitle>Coming up</SectionTitle>
          <Card className="divide-y divide-line p-4">
            {upcoming.map((round) => (
              <div key={round.index} className="py-2 first:pt-0 last:pb-0">
                <span className="text-xs font-semibold tracking-wide text-muted uppercase">
                  Round {round.index + 1}
                </span>
                {round.matches.map((match) => (
                  <MatchSummary key={match.court} match={match} nameOf={playerName} courts={session.courts} />
                ))}
              </div>
            ))}
          </Card>
        </section>
      ) : null}

      <div className="space-y-2">
        {session.status === "active" ? (
          <Button variant="secondary" className="w-full" onClick={() => void setStatus("finished")}>
            Finish session
          </Button>
        ) : (
          <Button variant="secondary" className="w-full" onClick={() => void setStatus("active")}>
            Reopen session
          </Button>
        )}
      </div>
    </>
  );
}
