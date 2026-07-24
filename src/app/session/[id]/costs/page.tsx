"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { ExtraForm } from "@/components/ExtraForm";
import { Button, Card, EmptyState, Field, Input, SectionTitle, Select } from "@/components/ui";
import { useI18n } from "@/i18n";
import { toCents, type Extra } from "@/lib/cost";
import { centsToInput, CURRENCY, formatMoney } from "@/lib/format";
import { sessionCostSplit } from "@/lib/session";
import { useData } from "../../../providers";

export default function SessionCostsPage() {
  const { id } = useParams<{ id: string }>();
  const { sessions, playerName, patchSession } = useData();
  const { t, n } = useI18n();
  const [addingExtra, setAddingExtra] = useState(false);
  const [editingCost, setEditingCost] = useState(false);

  const session = sessions.find((s) => s.id === id);
  if (!session) return null;

  const split = sessionCostSplit(session);

  async function addExtra(extra: Extra) {
    if (!session) return;
    await patchSession(session.id, { extras: [...session.extras, extra] });
    setAddingExtra(false);
  }

  async function removeExtra(extraId: string) {
    if (!session) return;
    await patchSession(session.id, { extras: session.extras.filter((e) => e.id !== extraId) });
  }

  return (
    <>
      {editingCost ? (
        <div className="mb-7">
          <CostEditor sessionId={session.id} onDone={() => setEditingCost(false)} />
        </div>
      ) : (
        <section className="mb-7">
          <SectionTitle
            action={
              <Button variant="ghost" className="h-9 min-h-9 px-3 text-xs" onClick={() => setEditingCost(true)}>
                {t("common.edit")}
              </Button>
            }
          >
            {t("costs.theBill")}
          </SectionTitle>
          <Card className="p-4">
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">
                  {t("costs.courtsLine", {
                    courts: n("court", session.courts),
                    hours: n("hour", split.totalHours),
                  })}
                </dt>
                <dd className="score-figure">{formatMoney(split.courtCostCents)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">{t("costs.extras")}</dt>
                <dd className="score-figure">{formatMoney(split.extrasCostCents)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
                <dt className="eyebrow">{t("costs.total")}</dt>
                <dd className="score-figure text-2xl text-accent">{formatMoney(split.grandTotalCents)}</dd>
              </div>
              {session.paidBy ? (
                <div className="flex justify-between gap-3 pt-1">
                  <dt className="text-muted">{t("costs.frontedBy")}</dt>
                  <dd className="font-bold">{playerName(session.paidBy)}</dd>
                </div>
              ) : null}
            </dl>
          </Card>
        </section>
      )}

      {split.grandTotalCents === 0 ? (
        <EmptyState
          title={t("costs.noCostTitle")}
          action={<Button onClick={() => setEditingCost(true)}>{t("costs.addCourtCost")}</Button>}
        >
          {t("costs.noCostBody")}
        </EmptyState>
      ) : (
        <section className="mb-7">
          <SectionTitle action={<span className="eyebrow text-muted">{t("costs.courtPlusExtras")}</span>}>
            {t("costs.perPlayer")}
          </SectionTitle>
          <div className="space-y-1">
            {[...split.perPlayer]
              .sort((a, b) => b.totalCents - a.totalCents)
              .map((player) => (
                <Card key={player.playerId} className="p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate font-bold tracking-tight">{playerName(player.playerId)}</p>
                    <p className="score-figure text-xl">{formatMoney(player.totalCents)}</p>
                  </div>
                  <dl className="mt-2.5 space-y-1 text-sm text-muted">
                    <div className="flex justify-between gap-3">
                      <dt>{t("costs.courtLine", { rotations: n("rotation", player.roundsPlayed) })}</dt>
                      <dd className="tabular-nums">{formatMoney(player.courtShareCents)}</dd>
                    </div>
                    {player.extras.map((extra) => (
                      <div key={extra.extraId} className="flex justify-between gap-3">
                        <dt className="truncate">{extra.description}</dt>
                        <dd className="tabular-nums">{formatMoney(extra.shareCents)}</dd>
                      </div>
                    ))}
                  </dl>
                </Card>
              ))}
          </div>
        </section>
      )}

      <section className="mb-7">
        <SectionTitle
          action={
            addingExtra ? null : (
              <Button variant="ghost" className="h-9 min-h-9 px-3 text-xs" onClick={() => setAddingExtra(true)}>
                {t("play.extra")}
              </Button>
            )
          }
        >
          {t("costs.extras")}
        </SectionTitle>

        {addingExtra ? (
          <ExtraForm
            playerIds={session.playerIds}
            nameOf={playerName}
            onAdd={addExtra}
            onCancel={() => setAddingExtra(false)}
          />
        ) : session.extras.length === 0 ? (
          <EmptyState title={t("costs.noExtrasTitle")}>{t("costs.noExtrasBody")}</EmptyState>
        ) : (
          <div className="space-y-1">
            {session.extras.map((extra) => (
              <Card key={extra.id} className="flex items-center gap-3 p-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold tracking-tight">{extra.description}</p>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {extra.billedTo.map(playerName).join(", ")}
                  </p>
                </div>
                <span className="score-figure shrink-0 text-sm">{formatMoney(extra.costCents)}</span>
                <Button
                  variant="danger"
                  className="h-10 min-h-10 shrink-0 px-2"
                  onClick={() => void removeExtra(extra.id)}
                  aria-label={t("extra.removeLabel", { name: extra.description })}
                >
                  ✕
                </Button>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle>{t("costs.settleUp")}</SectionTitle>
        {split.settlements.length === 0 ? (
          <EmptyState title={t("costs.nothingToSettleTitle")}>
            {session.paidBy ? t("costs.settledBody") : t("costs.saySomeoneFronted")}
          </EmptyState>
        ) : (
          <div className="space-y-1">
            {split.settlements.map((settlement, index) => (
              <Card key={index} className="flex items-center justify-between gap-3 p-4 text-sm">
                <span className="min-w-0 truncate">
                  <span className="font-bold">{playerName(settlement.from)}</span>
                  <span className="mx-1.5 text-muted">{t("costs.owes")}</span>
                  <span className="font-bold">{playerName(settlement.to)}</span>
                </span>
                <span className="score-figure shrink-0 text-base">{formatMoney(settlement.amountCents)}</span>
              </Card>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function CostEditor({ sessionId, onDone }: { sessionId: string; onDone: () => void }) {
  const { sessions, playerName, patchSession } = useData();
  const { t } = useI18n();
  const session = sessions.find((s) => s.id === sessionId)!;

  const [bookings, setBookings] = useState(
    session.bookings.map((booking) => ({
      cost: booking.costCents ? centsToInput(booking.costCents) : "",
      hours: String(booking.hours),
    })),
  );
  const [paidBy, setPaidBy] = useState(session.paidBy ?? "");

  async function save() {
    const parsed = bookings.map((booking, index) => ({
      court: index + 1,
      costCents: toCents(Number(booking.cost) || 0),
      hours: Number(booking.hours) || session.hours,
    }));
    await patchSession(sessionId, {
      bookings: parsed,
      hours: Math.max(...parsed.map((b) => b.hours)),
      paidBy: paidBy || undefined,
    });
    onDone();
  }

  return (
    <Card className="space-y-5 p-4">
      <SectionTitle>{t("costs.theBill")}</SectionTitle>
      {bookings.map((booking, index) => (
        <div key={index} className="grid grid-cols-2 gap-3">
          <Field
            label={bookings.length === 1 ? t("setup.courtCost") : t("setup.courtNCost", { number: index + 1 })}
          >
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              placeholder={`${CURRENCY}0.00`}
              value={booking.cost}
              onChange={(e) =>
                setBookings((current) =>
                  current.map((b, i) => (i === index ? { ...b, cost: e.target.value } : b)),
                )
              }
            />
          </Field>
          <Field label={t("setup.hours")}>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.5"
              value={booking.hours}
              onChange={(e) =>
                setBookings((current) =>
                  current.map((b, i) => (i === index ? { ...b, hours: e.target.value } : b)),
                )
              }
            />
          </Field>
        </div>
      ))}

      <Field label={t("costs.whoFronted")}>
        <Select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
          <option value="">{t("common.nobody")}</option>
          {session.playerIds.map((playerId) => (
            <option key={playerId} value={playerId}>
              {playerName(playerId)}
            </option>
          ))}
        </Select>
      </Field>

      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={onDone}>
          {t("common.cancel")}
        </Button>
        <Button className="flex-1" onClick={() => void save()}>
          {t("common.save")}
        </Button>
      </div>
    </Card>
  );
}
