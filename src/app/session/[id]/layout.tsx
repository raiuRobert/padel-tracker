"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Badge, ButtonLink, EmptyState, Loading } from "@/components/ui";
import { useI18n, type MessageKey } from "@/i18n";
import { scoredRoundCount } from "@/lib/session";
import { useData } from "../../providers";

/** Header and sub-navigation shared by the three views of a live session. */
export default function SessionLayout({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  const { ready, sessions } = useData();
  const { t, n, formatDate } = useI18n();

  if (!ready) return <Loading label={t("common.loading")} />;

  const session = sessions.find((s) => s.id === id);
  if (!session) {
    return (
      <EmptyState
        title={t("session.notFoundTitle")}
        action={<ButtonLink href="/">{t("session.backToStart")}</ButtonLink>}
      >
        {t("session.notFoundBody")}
      </EmptyState>
    );
  }

  const tabs: { href: string; label: MessageKey }[] = [
    { href: `/session/${id}`, label: "session.play" },
    { href: `/session/${id}/standings`, label: "session.standings" },
    { href: `/session/${id}/costs`, label: "session.costs" },
  ];

  return (
    <>
      <header className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black tracking-tighter">{formatDate(session.date)}</h1>
            <p className="mt-1.5 text-sm text-muted">
              <span className="capitalize">{session.mode}</span> · {n("player", session.playerIds.length)} ·{" "}
              {n("court", session.courts)}
            </p>
          </div>
          <Badge tone={session.status === "active" ? "accent" : "muted"}>
            {session.status === "active"
              ? t("home.roundsIn", { count: n("round", scoredRoundCount(session)) })
              : t("session.finished")}
          </Badge>
        </div>

        <nav className="mt-5 grid grid-cols-3 gap-1 rounded-lg bg-surface p-1">
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`eyebrow flex min-h-10 items-center justify-center rounded transition-colors ${
                  active ? "bg-accent text-accent-ink" : "text-muted hover:text-ink"
                }`}
              >
                {t(tab.label)}
              </Link>
            );
          })}
        </nav>
      </header>

      {children}
    </>
  );
}
