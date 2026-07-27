"use client";

import { useEffect } from "react";
import { Button, ButtonLink, EmptyState, PageTitle } from "@/components/ui";
import { useI18n } from "@/i18n";

/**
 * Catches a render that throws, so one unusable screen stays one unusable screen.
 *
 * Without this, a single malformed session took the whole app down — including the history screen,
 * which is where you'd go to delete it. Recovering meant clearing browser storage, which costs you
 * every other session too. Layouts sit above this boundary, so the nav is still there to get out.
 */
export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  const { t } = useI18n();

  useEffect(() => {
    // The screen can't say anything useful about the cause, but the console can.
    console.error("padel: render failed", error);
  }, [error]);

  return (
    <>
      <PageTitle title={t("error.title")} />
      <EmptyState
        title={t("error.title")}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={reset}>{t("error.retry")}</Button>
            <ButtonLink variant="secondary" href="/">
              {t("error.home")}
            </ButtonLink>
          </div>
        }
      >
        {t("error.body")}
      </EmptyState>
    </>
  );
}
