"use client";

import Link from "next/link";
import { useConfirm } from "@/components/ConfirmDialog";
import { Badge, Button, ButtonLink, Card, EmptyState, Loading, PageTitle } from "@/components/ui";
import { useI18n } from "@/i18n";
import { scoredRoundCount, sessionCostSplit } from "@/lib/session";
import { useData } from "../providers";

export default function HistoryPage() {
  const { ready, sessions, groups, removeSession } = useData();
  const { t, n, money, formatDate } = useI18n();
  const confirm = useConfirm();

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
        {sessions.map((session, index) => {
          const group = groups.find((g) => g.id === session.groupId);
          const date = formatDate(session.date);
          return (
            <Card
              key={session.id}
              style={{ "--stagger": index } as React.CSSProperties}
              className="rise-in flex items-center gap-2 p-4"
            >
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
                {money(sessionCostSplit(session).grandTotalCents, session.currency)}
              </span>
              <Button
                variant="danger"
                className="h-10 min-h-10 shrink-0 px-2"
                aria-label={t("history.deleteLabel", { date })}
                onClick={async () => {
                  const ok = await confirm({
                    title: t("confirm.deleteSessionTitle"),
                    message: t("history.confirmDelete", { date }),
                    confirmLabel: t("common.delete"),
                  });
                  if (ok) await removeSession(session.id);
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
