"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { ExtraForm } from "@/components/ExtraForm";
import { Button, Card, EmptyState, Field, Input, SectionTitle, Select } from "@/components/ui";
import { toCents, type Extra } from "@/lib/cost";
import { centsToInput, CURRENCY, formatMoney, pluralise } from "@/lib/format";
import { sessionCostSplit } from "@/lib/session";
import { useData } from "../../../providers";

export default function SessionCostsPage() {
  const { id } = useParams<{ id: string }>();
  const { sessions, playerName, patchSession } = useData();
  const [addingExtra, setAddingExtra] = useState(false);
  const [editingCost, setEditingCost] = useState(false);

  const session = sessions.find((s) => s.id === id);
  if (!session) return null;

  const split = sessionCostSplit(session);
  const nothingToSplit = split.grandTotalCents === 0;

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
        <div className="mb-6">
          <CostEditor sessionId={session.id} onDone={() => setEditingCost(false)} />
        </div>
      ) : (
        <section className="mb-6">
          <SectionTitle
            action={
              <Button variant="ghost" className="h-9 min-h-9 px-3 text-sm" onClick={() => setEditingCost(true)}>
                Edit
              </Button>
            }
          >
            The bill
          </SectionTitle>
          <Card className="p-4">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">
                  Court{session.courts > 1 ? "s" : ""} · {pluralise(split.totalHours, "hour")}
                </dt>
                <dd className="font-semibold tabular-nums">{formatMoney(split.courtCostCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Extras</dt>
                <dd className="font-semibold tabular-nums">{formatMoney(split.extrasCostCents)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2">
                <dt className="font-semibold">Total</dt>
                <dd className="font-bold tabular-nums">{formatMoney(split.grandTotalCents)}</dd>
              </div>
              {session.paidBy ? (
                <div className="flex justify-between pt-1">
                  <dt className="text-muted">Fronted by</dt>
                  <dd className="font-semibold">{playerName(session.paidBy)}</dd>
                </div>
              ) : null}
            </dl>
          </Card>
        </section>
      )}

      {nothingToSplit ? (
        <EmptyState
          icon="🧾"
          title="No cost entered yet"
          action={<Button onClick={() => setEditingCost(true)}>Add the court cost</Button>}
        >
          Add what the court cost and everyone’s share is worked out from the rotations they played.
        </EmptyState>
      ) : (
        <section className="mb-6">
          <SectionTitle action={<span className="text-xs text-muted">court + extras</span>}>
            Per player
          </SectionTitle>
          <Card className="divide-y divide-line">
            {[...split.perPlayer]
              .sort((a, b) => b.totalCents - a.totalCents)
              .map((player) => (
                <div key={player.playerId} className="p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate font-semibold">{playerName(player.playerId)}</p>
                    <p className="shrink-0 font-mono font-bold tabular-nums">
                      {formatMoney(player.totalCents)}
                    </p>
                  </div>
                  <dl className="mt-2 space-y-1 text-sm text-muted">
                    <div className="flex justify-between gap-3">
                      <dt>Court · {pluralise(player.roundsPlayed, "rotation")}</dt>
                      <dd className="tabular-nums">{formatMoney(player.courtShareCents)}</dd>
                    </div>
                    {player.extras.map((extra) => (
                      <div key={extra.extraId} className="flex justify-between gap-3">
                        <dt className="truncate">{extra.description}</dt>
                        <dd className="tabular-nums">{formatMoney(extra.shareCents)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
          </Card>
        </section>
      )}

      <section className="mb-6">
        <SectionTitle
          action={
            addingExtra ? null : (
              <Button variant="ghost" className="h-9 min-h-9 px-3 text-sm" onClick={() => setAddingExtra(true)}>
                + Extra
              </Button>
            )
          }
        >
          Extras
        </SectionTitle>

        {addingExtra ? (
          <ExtraForm
            playerIds={session.playerIds}
            nameOf={playerName}
            onAdd={addExtra}
            onCancel={() => setAddingExtra(false)}
          />
        ) : session.extras.length === 0 ? (
          <EmptyState icon="🥤" title="Nothing from the fridge yet">
            Add drinks or snacks as they happen and they’ll land on the right person’s tab.
          </EmptyState>
        ) : (
          <Card className="divide-y divide-line">
            {session.extras.map((extra) => (
              <div key={extra.id} className="flex items-center gap-3 p-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{extra.description}</p>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {extra.billedTo.map(playerName).join(", ")}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-sm font-bold tabular-nums">
                  {formatMoney(extra.costCents)}
                </span>
                <Button
                  variant="danger"
                  className="h-9 min-h-9 shrink-0 px-2 text-sm"
                  onClick={() => void removeExtra(extra.id)}
                  aria-label={`Remove ${extra.description}`}
                >
                  ✕
                </Button>
              </div>
            ))}
          </Card>
        )}
      </section>

      <section>
        <SectionTitle>Settle up</SectionTitle>
        {split.settlements.length === 0 ? (
          <EmptyState icon="🤝" title="Nothing to settle">
            {session.paidBy
              ? "Everyone’s square."
              : "Say who fronted the court payment and this works out who owes them what."}
          </EmptyState>
        ) : (
          <Card className="divide-y divide-line">
            {split.settlements.map((settlement, index) => (
              <div key={index} className="flex items-center justify-between gap-3 p-3.5 text-sm">
                <span className="min-w-0 truncate">
                  <span className="font-semibold">{playerName(settlement.from)}</span>
                  <span className="mx-1.5 text-muted">owes</span>
                  <span className="font-semibold">{playerName(settlement.to)}</span>
                </span>
                <span className="shrink-0 font-mono font-bold tabular-nums">
                  {formatMoney(settlement.amountCents)}
                </span>
              </div>
            ))}
          </Card>
        )}
      </section>
    </>
  );
}

function CostEditor({ sessionId, onDone }: { sessionId: string; onDone: () => void }) {
  const { sessions, playerName, patchSession } = useData();
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
    <Card className="space-y-4 p-4">
      <SectionTitle>The bill</SectionTitle>
      {bookings.map((booking, index) => (
        <div key={index} className="grid grid-cols-2 gap-3">
          <Field label={bookings.length === 1 ? "Court cost" : `Court ${index + 1} cost`}>
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
          <Field label="Hours">
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

      <Field label="Who fronted the court payment?">
        <Select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
          <option value="">Nobody yet</option>
          {session.playerIds.map((playerId) => (
            <option key={playerId} value={playerId}>
              {playerName(playerId)}
            </option>
          ))}
        </Select>
      </Field>

      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={onDone}>
          Cancel
        </Button>
        <Button className="flex-1" onClick={() => void save()}>
          Save
        </Button>
      </div>
    </Card>
  );
}
