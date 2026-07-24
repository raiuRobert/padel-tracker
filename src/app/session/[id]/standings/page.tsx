"use client";

import { useParams } from "next/navigation";
import { StandingsTable } from "@/components/StandingsTable";
import { EmptyState, SectionTitle } from "@/components/ui";
import { useI18n } from "@/i18n";
import { scoredRoundCount, sessionStandings } from "@/lib/session";
import { useData } from "../../../providers";

export default function SessionStandingsPage() {
  const { id } = useParams<{ id: string }>();
  const { sessions, playerName } = useData();
  const { t, n } = useI18n();

  const session = sessions.find((s) => s.id === id);
  if (!session) return null;

  const played = scoredRoundCount(session);

  if (played === 0) {
    return <EmptyState title={t("standings.noScoresTitle")}>{t("standings.noScoresBody")}</EmptyState>;
  }

  return (
    <section>
      <SectionTitle action={<span className="eyebrow text-muted">{t("standings.points")}</span>}>
        {t("standings.after", { rounds: n("round", played) })}
      </SectionTitle>
      <StandingsTable rows={sessionStandings(session)} nameOf={playerName} />
    </section>
  );
}
