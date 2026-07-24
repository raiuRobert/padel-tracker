"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useI18n } from "@/i18n";
import { Button } from "./ui";

/**
 * A styled replacement for `window.confirm` for destructive actions, so a delete prompt reads as a
 * warning — red, with a warning icon — instead of a plain browser dialog we can't colour.
 *
 * It's promise-based on purpose: call sites stay as simple as the native version they replace —
 * `if (await confirm({ ... })) doTheThing()` — rather than threading dialog state through each page.
 */
export interface ConfirmOptions {
  title: string;
  message: string;
  /** Label for the destructive action. Defaults to a generic "Confirm". */
  confirmLabel?: string;
  cancelLabel?: string;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((next) => {
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const settle = useCallback((ok: boolean) => {
    resolveRef.current?.(ok);
    resolveRef.current = null;
    setOptions(null);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options ? <Dialog options={options} onCancel={() => settle(false)} onConfirm={() => settle(true)} /> : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error("useConfirm must be used inside a ConfirmProvider.");
  return context;
}

function Dialog({
  options,
  onCancel,
  onConfirm,
}: {
  options: ConfirmOptions;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useI18n();
  // Focus the safe choice by default — this is a destructive prompt, so Enter shouldn't delete.
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-canvas/80 p-4 backdrop-blur-sm sm:items-center"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-2xl">
        <div className="mb-4 flex items-start gap-3">
          <span
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-danger/15 text-danger"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3.5 22 20H2L12 3.5ZM12 9.5v4.5M12 17.2v.1" />
            </svg>
          </span>
          <h2 id="confirm-title" className="pt-1 text-lg font-black tracking-tight text-ink">
            {options.title}
          </h2>
        </div>

        <p id="confirm-message" className="text-sm leading-relaxed whitespace-pre-line text-muted">
          {options.message}
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <Button variant="danger" onClick={onConfirm} className="w-full bg-danger/15 hover:bg-danger/25">
            {options.confirmLabel ?? t("common.confirm")}
          </Button>
          <Button ref={cancelRef} variant="ghost" onClick={onCancel} className="w-full">
            {options.cancelLabel ?? t("common.cancel")}
          </Button>
        </div>
      </div>
    </div>
  );
}
