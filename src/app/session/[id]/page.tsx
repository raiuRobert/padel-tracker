"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ExtraForm } from "@/components/ExtraForm";
import { MatchSummary, RoundBoard } from "@/components/RoundBoard";
import { Button, Card, EmptyState, SectionTitle } from "@/components/ui";
import { useI18n } from "@/i18n";
import type { Extra } from "@/lib/cost";
import type { Session, SessionRound } from "@/lib/domain";
import { plannedRoundCount } from "@/lib/domain";
import { generateAmericanoSchedule } from "@/lib/rotation";
import { buildNextRound, currentRound, isRoundScored, startsWithCourtSwap } from "@/lib/session";
import type { MatchResult } from "@/lib/standings";
import { useData } from "../../providers";

/** Called out because it's the one moment in the session where people physically move courts. */
function CourtSwapNotice() {
  const { t } = useI18n();
  return (
    <div className="mb-2 rounded-lg bg-accent/15 px-3 py-2.5">
      <p className="eyebrow text-accent">{t("play.courtSwap")}</p>
      <p className="mt-1 text-xs text-muted">{t("play.courtSwapHint")}</p>
    </div>
  );
}

export default function SessionPlayPage() {
  const { id } = useParams<{ id: string }>();
  const { sessions, playerName, patchSession, recordResults } = useData();
  const { t, n } = useI18n();
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
            rounds: plannedRoundCount(session.playerIds.length, session.hours),
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
    // Goes through the conflict-free path so it merges with, rather than overwrites, a score a
    // friend may have just entered on the other court.
    await recordResults(session.id, round.index, results);
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
        <div className="mb-7">
          <ExtraForm
            playerIds={session.playerIds}
            currency={session.currency}
            nameOf={playerName}
            onAdd={addExtra}
            onCancel={() => setAddingExtra(false)}
          />
        </div>
      ) : null}

      {playing ? (
        <section className="mb-9">
          <SectionTitle
            action={
              <Button variant="ghost" className="h-9 min-h-9 px-3 text-xs" onClick={() => setAddingExtra(true)}>
                {t("play.extra")}
              </Button>
            }
          >
            {t("play.round", { number: playing.index + 1 })}
          </SectionTitle>
          {startsWithCourtSwap(session, playing.index) ? <CourtSwapNotice /> : null}
          <RoundBoard
            key={playing.index}
            round={playing}
            courts={session.courts}
            nameOf={playerName}
            onSave={(results) => saveScore(playing, results)}
          />
        </section>
      ) : session.status === "finished" ? (
        <section className="mb-9">
          <EmptyState title={t("play.finishedTitle")}>
            {t("play.finishedBody", { rounds: n("round", played.length) })}
          </EmptyState>
        </section>
      ) : null}

      {played.length > 0 ? (
        <section className="mb-9">
          <SectionTitle>{t("play.played")}</SectionTitle>
          <div className="space-y-1">
            {[...played].reverse().map((round) =>
              editingIndex === round.index ? (
                <div key={round.index}>
                  <p className="eyebrow mb-2 text-muted">
                    {t("play.editingRound", { number: round.index + 1 })}
                  </p>
                  <RoundBoard
                    round={round}
                    courts={session.courts}
                    nameOf={playerName}
                    onSave={(results) => saveScore(round, results)}
                    saveLabel={t("play.updateRound")}
                  />
                  <Button variant="ghost" className="mt-2 w-full" onClick={() => setEditingIndex(null)}>
                    {t("common.cancel")}
                  </Button>
                </div>
              ) : (
                <Card key={round.index} className="p-4">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="eyebrow text-muted">
                      {t("play.round", { number: round.index + 1 })}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingIndex(round.index)}
                      className="eyebrow text-muted hover:text-ink"
                    >
                      {t("common.edit")}
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
                    <p className="mt-2 text-xs text-muted">
                      {t("play.satOut", { names: round.sittingOut.map(playerName).join(", ") })}
                    </p>
                  ) : null}
                </Card>
              ),
            )}
          </div>
        </section>
      ) : null}

      {upcoming.length > 0 ? (
        <section className="mb-9">
          <SectionTitle>{t("play.comingUp")}</SectionTitle>
          <Card className="divide-y divide-line p-4">
            {upcoming.map((round) => (
              <div key={round.index} className="py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <span className="eyebrow text-muted">{t("play.round", { number: round.index + 1 })}</span>
                  {startsWithCourtSwap(session, round.index) ? (
                    <span className="eyebrow text-accent">↔</span>
                  ) : null}
                </div>
                {round.matches.map((match) => (
                  <MatchSummary key={match.court} match={match} nameOf={playerName} courts={session.courts} />
                ))}
              </div>
            ))}
          </Card>
        </section>
      ) : null}

      {session.status === "active" ? (
        <Button variant="secondary" className="w-full" onClick={() => void setStatus("finished")}>
          {t("play.finishSession")}
        </Button>
      ) : (
        <Button variant="secondary" className="w-full" onClick={() => void setStatus("active")}>
          {t("play.reopenSession")}
        </Button>
      )}
    </>
  );
}
