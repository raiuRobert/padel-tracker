"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { useData } from "@/app/providers";
import { useI18n } from "@/i18n";
import { Button } from "./ui";

/**
 * Share a session so friends can join and score it live. Only rendered when sync is configured —
 * without a backend there's nothing to join, so we don't dangle a dead link.
 */
export function ShareButton({ sessionId }: { sessionId: string }) {
  const { syncEnabled } = useData();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  if (!syncEnabled) return null;

  return (
    <>
      <Button
        variant="secondary"
        className="h-9 min-h-9 gap-1.5 px-3 text-xs"
        onClick={() => setOpen(true)}
        aria-label={t("session.share")}
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="18" cy="5" r="2.5" />
          <circle cx="6" cy="12" r="2.5" />
          <circle cx="18" cy="19" r="2.5" />
          <path d="M8.2 10.8 15.8 6.2M8.2 13.2l7.6 4.6" />
        </svg>
        {t("session.share")}
      </Button>
      {open ? <ShareSheet sessionId={sessionId} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function ShareSheet({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const { t } = useI18n();
  // The link is deterministic from the id, so it's initial state, not an effect.
  const [url] = useState(() =>
    typeof window === "undefined" ? "" : `${window.location.origin}/session/${sessionId}`,
  );
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!url) return;
    // Dark modules on a light card so it scans; generated locally, no network.
    void QRCode.toDataURL(url, { margin: 1, width: 320, color: { dark: "#07090c", light: "#ffffff" } })
      .then(setQr)
      .catch(() => setQr(""));
  }, [url]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked; the link is on screen to copy by hand.
    }
  }

  async function share() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Padel Tracker", url });
      } catch {
        // User dismissed the share sheet — nothing to do.
      }
    } else {
      void copy();
    }
  }

  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-canvas/80 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-title"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-surface p-6 text-center shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3 text-left">
          <div>
            <h2 id="share-title" className="text-xl font-black tracking-tight text-ink">
              {t("share.title")}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{t("share.body")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("share.close")}
            className="-mr-1.5 -mt-1 flex size-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-raised hover:text-ink"
          >
            ✕
          </button>
        </div>

        {qr ? (
          <div className="mx-auto mb-2 w-fit rounded-2xl bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt={t("share.scan")} className="size-44" width={176} height={176} />
          </div>
        ) : (
          <div className="mx-auto mb-2 size-44 animate-pulse rounded-2xl bg-raised" />
        )}
        <p className="eyebrow mb-4 text-muted">{t("share.scan")}</p>

        <p className="mb-4 truncate rounded-lg bg-raised px-3 py-2.5 text-xs text-muted" dir="ltr">
          {url}
        </p>

        <div className="flex flex-col gap-2">
          {canNativeShare ? (
            <Button onClick={() => void share()} className="w-full">
              {t("share.shareVia")}
            </Button>
          ) : null}
          <Button variant={canNativeShare ? "secondary" : "primary"} onClick={() => void copy()} className="w-full">
            {copied ? t("share.copied") : t("share.copy")}
          </Button>
        </div>
      </div>
    </div>
  );
}
