"use client";

import { useState } from "react";
import { newId } from "@/data/ids";
import { useI18n } from "@/i18n";
import { toCents, type Extra } from "@/lib/cost";
import { currencySymbol, type CurrencyCode } from "@/lib/currency";
import { Button, Card, Field, Input, SectionTitle } from "./ui";

/**
 * Adding something bought from the fridge. Available during the session as well as at pay-up, so
 * it has to be quick: description, price, and who's actually having it.
 */
export function ExtraForm({
  playerIds,
  currency,
  nameOf,
  onAdd,
  onCancel,
}: {
  playerIds: readonly string[];
  currency: CurrencyCode;
  nameOf: (id: string) => string;
  onAdd: (extra: Extra) => Promise<void> | void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [billedTo, setBilledTo] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggle = (id: string) =>
    setBilledTo((current) => (current.includes(id) ? current.filter((p) => p !== id) : [...current, id]));

  const valid = description.trim() !== "" && Number(cost) > 0 && billedTo.length > 0;

  async function submit() {
    if (!valid) return;
    setSaving(true);
    try {
      await onAdd({
        id: newId(),
        description: description.trim(),
        costCents: toCents(Number(cost)),
        billedTo,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="space-y-4 p-4">
      <SectionTitle>{t("extra.title")}</SectionTitle>

      <div className="grid grid-cols-[1fr_7rem] gap-3">
        <Field label={t("extra.what")}>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("extra.whatPlaceholder")}
            autoFocus
          />
        </Field>
        <Field label={t("extra.cost")}>
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            placeholder={`${currencySymbol(currency)}0.00`}
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
        </Field>
      </div>

      <Field label={t("extra.billedTo")} hint={t("extra.billedHint")}>
        <ul className="grid grid-cols-2 gap-1.5">
          {playerIds.map((id) => {
            const selected = billedTo.includes(id);
            return (
              <li key={id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggle(id)}
                  className={`min-h-12 w-full truncate rounded-lg px-3 text-sm font-bold transition-colors ${
                    selected ? "bg-accent text-accent-ink" : "bg-raised text-ink"
                  }`}
                >
                  {nameOf(id)}
                </button>
              </li>
            );
          })}
        </ul>
      </Field>

      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button className="flex-1" disabled={!valid || saving} onClick={() => void submit()}>
          {saving ? t("extra.adding") : t("common.add")}
        </Button>
      </div>
    </Card>
  );
}
