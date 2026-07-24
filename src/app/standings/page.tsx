"use client";

import { useMemo, useState } from "react";
import { StandingsTable } from "@/components/StandingsTable";
import { ButtonLink, EmptyState, Loading, PageTitle, SectionTitle } from "@/components/ui";
import { useI18n } from "@/i18n";
import { toPlayedRounds } from "@/lib/session";
import { combineStandings } from "@/lib/standings";
import { useData } from "../providers";

const ALL = "__all__";

export default function AllTimeStandingsPage() {
  const { ready, sessions, groups, playerName } = useData();
  const { t, n } = useI18n();
  const [groupId, setGroupId] = useState<string>(ALL);

  const scoped = useMemo(
    () => (groupId === ALL ? sessions : sessions.filter((session) => session.groupId === groupId)),
    [sessions, groupId],
  );

  const rows = useMemo(() => {
    // Everyone who has played at least once in the selected scope, so a retired regular still shows.
    const playerIds = [...new Set(scoped.flatMap((session) => session.playerIds))];
    return combineStandings(playerIds, scoped.map(toPlayedRounds));
  }, [scoped]);

  if (!ready) return <Loading label={t("common.loading")} />;

  if (sessions.length === 0) {
    return (
      <>
        <PageTitle title={t("standings.allTimeTitle")} />
        <EmptyState
          title={t("standings.noSessionsTitle")}
          action={<ButtonLink href="/">{t("home.start")}</ButtonLink>}
        >
          {t("standings.noSessionsBody")}
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <PageTitle title={t("standings.allTimeTitle")} subtitle={t("standings.allTimeSubtitle")} />

      {groups.length > 0 ? (
        <div className="mb-5 flex flex-wrap gap-1.5">
          {[{ id: ALL, name: t("standings.everyone") }, ...groups].map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={groupId === option.id}
              onClick={() => setGroupId(option.id)}
              className={`eyebrow min-h-10 rounded-lg px-3.5 transition-colors ${
                groupId === option.id ? "bg-accent text-accent-ink" : "bg-raised text-muted hover:text-ink"
              }`}
            >
              {option.name}
            </button>
          ))}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState title={t("standings.nothingForGroupTitle")}>
          {t("standings.nothingForGroupBody")}
        </EmptyState>
      ) : (
        <section>
          <SectionTitle action={<span className="eyebrow text-muted">{t("standings.points")}</span>}>
            {n("session", scoped.length)}
          </SectionTitle>
          <StandingsTable rows={rows} nameOf={playerName} />
          <p className="mt-4 text-center text-xs text-muted">{t("standings.rankedBy")}</p>
        </section>
      )}
    </>
  );
}
