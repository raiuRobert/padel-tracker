"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useI18n, type MessageKey } from "@/i18n";

/** Inline strokes rather than an icon dependency — four glyphs don't justify a package. */
const ICONS: Record<string, ReactNode> = {
  play: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M5 6.5c3 2.5 4.5 6.5 4 11M19 6.5c-3 2.5-4.5 6.5-4 11" />
    </>
  ),
  roster: (
    <>
      <circle cx="9" cy="9" r="3.2" />
      <path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M16 6.6a3.2 3.2 0 0 1 0 6.3M17.5 14.8c2 .6 3.4 2.4 3.4 4.7" />
    </>
  ),
  trophy: (
    <>
      <path d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0z" />
      <path d="M7.5 5.5h-3v1.2A3.3 3.3 0 0 0 7.8 10M16.5 5.5h3v1.2a3.3 3.3 0 0 1-3.3 3.3" />
      <path d="M12 13.5V17M8.5 20h7M10 20l.5-3h3l.5 3" />
    </>
  ),
  history: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
    </>
  ),
};

const TABS: { href: string; label: MessageKey; icon: string }[] = [
  { href: "/", label: "nav.play", icon: "play" },
  { href: "/roster", label: "nav.roster", icon: "roster" },
  { href: "/standings", label: "nav.allTime", icon: "trophy" },
  { href: "/history", label: "nav.history", icon: "history" },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-canvas/95 backdrop-blur
                 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-lg">
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.href);
          return (
            <li key={tab.href} className="relative flex-1">
              {active ? (
                <span aria-hidden className="tab-in absolute inset-x-5 top-0 h-0.5 rounded-full bg-accent" />
              ) : null}
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1.5 transition-colors ${
                  active ? "text-accent" : "text-muted hover:text-ink"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className={`size-[22px] transition-transform duration-300 ease-back-out ${
                    active ? "scale-110" : "scale-100"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  {ICONS[tab.icon]}
                </svg>
                <span className="eyebrow text-[0.6rem]">{t(tab.label)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
