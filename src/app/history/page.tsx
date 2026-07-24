"use client";

import Link from "next/link";
import { Badge, Button, ButtonLink, Card, EmptyState, Loading, PageTitle } from "@/components/ui";
import { useI18n } from "@/i18n";
import { formatMoney } from "@/lib/format";
import { scoredRoundCount, sessionCostSplit } from "@/lib/session";
import { useData } from "../providers";

export default function HistoryPage() {
  const { ready, sessions, groups, removeSession } = useData();
  const { t, n, formatDate } = useI18n();

  if (!ready) return <Loading label={t("common.loading")} />;

  if (sessions.length === 0) {
    return (
      <>
        <PageTitle title={t("history.title")} />
        <EmptyState
          title={t("history.noSessionsTitle")}
          action={<ButtonLink href="/">{t("history.startSession")}</ButtonLink>}
        >
          {t("history.noSessionsBody")}
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <PageTitle title={t("history.title")} subtitle={n("session", sessions.length)} />

      <div className="space-y-1">
        {sessions.map((session) => {
          const group = groups.find((g) => g.id === session.groupId);
          const date = formatDate(session.date);
          return (
            <Card key={session.id} className="flex items-center gap-2 p-4">
              <Link href={`/session/${session.id}`} className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-bold tracking-tight">{date}</p>
                  {session.status === "active" ? <Badge tone="accent">{t("history.live")}</Badge> : null}
                </div>
                <p className="mt-0.5 truncate text-sm text-muted">
                  {group ? `${group.name} · ` : ""}
                  <span className="capitalize">{session.mode}</span> ·{" "}
                  {n("round", scoredRoundCount(session))}
                </p>
              </Link>
              <span className="score-figure shrink-0 text-sm text-muted">
                {formatMoney(sessionCostSplit(session).grandTotalCents)}
              </span>
              <Button
                variant="danger"
                className="h-10 min-h-10 shrink-0 px-2"
                aria-label={t("history.deleteLabel", { date })}
                onClick={() => {
                  if (window.confirm(t("history.confirmDelete", { date }))) {
                    void removeSession(session.id);
                  }
                }}
              >
                ✕
              </Button>
            </Card>
          );
        })}
      </div>
    </>
  );
}
