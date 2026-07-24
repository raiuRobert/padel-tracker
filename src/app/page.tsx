"use client";

import Link from "next/link";
import { Badge, ButtonLink, Card, EmptyState, Loading, PageTitle, SectionTitle } from "@/components/ui";
import { useI18n } from "@/i18n";
import { formatMoney } from "@/lib/format";
import { scoredRoundCount, sessionCostSplit } from "@/lib/session";
import { useData } from "./providers";

export default function HomePage() {
  const { ready, sessions, activePlayers } = useData();
  const { t, n, formatDate } = useI18n();

  if (!ready) return <Loading label={t("common.loading")} />;

  const active = sessions.find((session) => session.status === "active");
  const recent = sessions.filter((session) => session.status !== "active").slice(0, 3);

  return (
    <>
      <PageTitle title="Padel Tracker" subtitle={t("home.subtitle")} />

      <section className="mb-8">
        {active ? (
          <>
            <SectionTitle>{t("home.inProgress")}</SectionTitle>
            <Card className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xl font-black tracking-tight">{formatDate(active.date)}</p>
                  <p className="mt-1 text-sm text-muted">
                    {n("player", active.playerIds.length)} · {n("court", active.courts)} ·{" "}
                    <span className="capitalize">{active.mode}</span>
                  </p>
                </div>
                <Badge tone="accent">
                  {t("home.roundsIn", { count: n("round", scoredRoundCount(active)) })}
                </Badge>
              </div>
              <ButtonLink href={`/session/${active.id}`} className="mt-5 w-full">
                {t("home.continue")}
              </ButtonLink>
            </Card>
          </>
        ) : activePlayers.length < 4 ? (
          <EmptyState
            title={t("home.needPlayersTitle")}
            action={<ButtonLink href="/roster">{t("home.goToRoster")}</ButtonLink>}
          >
            {t("home.needPlayersBody")}
          </EmptyState>
        ) : (
          <Card className="p-6 text-center">
            <p className="text-xl font-black tracking-tight">{t("home.readyTitle")}</p>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted">{t("home.readyBody")}</p>
            <ButtonLink href="/session/new" className="mt-6 w-full">
              {t("home.start")}
            </ButtonLink>
          </Card>
        )}
      </section>

      <section>
        <SectionTitle
          action={
            sessions.length > 0 ? (
              <Link href="/history" className="eyebrow text-muted hover:text-ink">
                {t("home.seeAll")}
              </Link>
            ) : null
          }
        >
          {t("home.recent")}
        </SectionTitle>

        {recent.length === 0 ? (
          <EmptyState title={t("home.noFinishedTitle")}>{t("home.noFinishedBody")}</EmptyState>
        ) : (
          <div className="space-y-1">
            {recent.map((session) => (
              <Link key={session.id} href={`/session/${session.id}`} className="block">
                <Card className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-raised">
                  <div className="min-w-0">
                    <p className="font-bold tracking-tight">{formatDate(session.date)}</p>
                    <p className="mt-0.5 text-sm text-muted">
                      {n("round", scoredRoundCount(session))} · {n("player", session.playerIds.length)}
                    </p>
                  </div>
                  <span className="score-figure shrink-0 text-sm text-muted">
                    {formatMoney(sessionCostSplit(session).grandTotalCents)}
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
