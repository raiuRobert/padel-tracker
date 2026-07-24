"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { PlayerPicker } from "@/components/PlayerPicker";
import {
  Button,
  ButtonLink,
  Card,
  ChoiceGroup,
  EmptyState,
  Field,
  Input,
  Loading,
  PageTitle,
  SectionTitle,
  Select,
} from "@/components/ui";
import { useI18n } from "@/i18n";
import { toCents } from "@/lib/cost";
import { DEFAULT_HOURS, type NewSession } from "@/lib/domain";
import { CURRENCY, formatPair, todayIso } from "@/lib/format";
import { describeSupportedConfigurations, isSupportedConfiguration } from "@/lib/rotation";
import type { RotationMode } from "@/lib/rotation/types";
import { useData } from "../../providers";

interface BookingDraft {
  cost: string;
  hours: string;
}

/** Player counts we know how to run, and the court count each one implies. */
const COURTS_FOR_PLAYERS: Record<number, number> = { 4: 1, 5: 1, 6: 1, 8: 2 };

export default function NewSessionPage() {
  const router = useRouter();
  const { ready, activePlayers, groups, startSession } = useData();
  const { t, n } = useI18n();

  const [date, setDate] = useState(todayIso());
  const [selected, setSelected] = useState<string[]>([]);
  const [groupId, setGroupId] = useState<string | undefined>();
  const [courts, setCourts] = useState(1);
  const [mode, setMode] = useState<RotationMode>("americano");
  const [bookings, setBookings] = useState<BookingDraft[]>([{ cost: "", hours: String(DEFAULT_HOURS) }]);
  const [paidBy, setPaidBy] = useState("");
  const [saving, setSaving] = useState(false);

  /** Courts and bookings move together: two courts means two prices to enter. */
  function changeCourts(next: number) {
    setCourts(next);
    setBookings((current) => {
      if (current.length === next) return current;
      const template = current[0] ?? { cost: "", hours: String(DEFAULT_HOURS) };
      return Array.from({ length: next }, (_, i) => current[i] ?? { ...template, cost: "" });
    });
  }

  /**
   * The supported setups pin the court count to the head count, so it follows the selection rather
   * than letting someone build an invalid session and only find out at the end.
   */
  function selectPlayers(next: string[]) {
    setSelected(next);
    const implied = COURTS_FOR_PLAYERS[next.length];
    if (implied && implied !== courts) changeCourts(implied);
  }

  const valid = isSupportedConfiguration(selected.length, courts);
  const pairing = selected.length === 8;

  const message = useMemo(() => {
    if (selected.length === 0) return t("setup.pickPlayers");
    if (valid) {
      return t("setup.goodToGo", { players: n("player", selected.length), courts: n("court", courts) });
    }
    if (selected.length === 7) return t("setup.sevenPlayers");
    return t("setup.unsupported", {
      count: selected.length,
      options: describeSupportedConfigurations(),
    });
  }, [selected.length, valid, courts, t, n]);

  if (!ready) return <Loading label={t("common.loading")} />;

  if (activePlayers.length < 4) {
    return (
      <>
        <PageTitle title={t("setup.title")} />
        <EmptyState
          title={t("setup.notEnoughTitle")}
          action={<ButtonLink href="/roster">{t("home.goToRoster")}</ButtonLink>}
        >
          {t("setup.notEnoughBody")}
        </EmptyState>
      </>
    );
  }

  const toggle = (id: string) => {
    // Hand-picking players means this is no longer that group's session, so the all-time table for
    // the group doesn't quietly absorb a one-off line-up.
    setGroupId(undefined);
    selectPlayers(selected.includes(id) ? selected.filter((p) => p !== id) : [...selected, id]);
  };

  const applyGroup = (id: string) => {
    const group = groups.find((g) => g.id === id);
    if (!group) return;
    // Anyone since removed from the roster shouldn't silently join the session.
    const available = new Set(activePlayers.map((p) => p.id));
    selectPlayers(group.playerIds.filter((playerId) => available.has(playerId)));
    setGroupId(group.id);
  };

  const nameOf = (id: string) => activePlayers.find((p) => p.id === id)?.name ?? id;

  async function start() {
    setSaving(true);
    try {
      const parsedBookings = bookings.map((booking, index) => ({
        court: index + 1,
        costCents: toCents(Number(booking.cost) || 0),
        hours: Number(booking.hours) || DEFAULT_HOURS,
      }));

      const input: NewSession = {
        date,
        groupId,
        // For 8 players this order *is* the pairing, which the rotation engine reads directly.
        playerIds: selected,
        courts,
        mode,
        // Courts run concurrently, so the session is as long as the longest booking.
        hours: Math.max(...parsedBookings.map((b) => b.hours)),
        bookings: parsedBookings,
        paidBy: paidBy || undefined,
      };
      const session = await startSession(input);
      router.push(`/session/${session.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageTitle title={t("setup.title")} subtitle={t("setup.subtitle")} />

      <section className="mb-7">
        <SectionTitle>{t("setup.whosPlaying")}</SectionTitle>
        {groups.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {groups.map((group) => (
              <Button
                key={group.id}
                variant={groupId === group.id ? "primary" : "secondary"}
                className="h-10 min-h-10 px-3 text-xs"
                onClick={() => applyGroup(group.id)}
              >
                {group.name}
              </Button>
            ))}
          </div>
        ) : null}

        <PlayerPicker players={activePlayers} selected={selected} onToggle={toggle} showOrder={pairing} />
        <p className={`mt-3 text-sm ${valid ? "font-semibold text-accent" : "text-muted"}`}>{message}</p>

        {pairing ? (
          <div className="mt-4">
            <SectionTitle>{t("setup.pairs")}</SectionTitle>
            <Card className="p-4">
              <ol className="space-y-1.5">
                {[0, 1, 2, 3].map((pair) => (
                  <li key={pair} className="flex items-center gap-3">
                    <span className="score-figure flex size-6 shrink-0 items-center justify-center rounded bg-raised text-xs text-muted">
                      {pair + 1}
                    </span>
                    <span className="truncate font-bold tracking-tight">
                      {formatPair([selected[pair * 2], selected[pair * 2 + 1]].map(nameOf))}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-xs leading-relaxed text-muted">{t("setup.pairsHint")}</p>
            </Card>
          </div>
        ) : null}
      </section>

      <section className="mb-7">
        <SectionTitle>{t("setup.format")}</SectionTitle>
        <Card className="space-y-5 p-4">
          <Field
            label={t("setup.mode")}
            hint={mode === "americano" ? t("setup.americanoHint") : t("setup.mexicanoHint")}
          >
            <ChoiceGroup
              value={mode}
              options={[
                { value: "americano" as const, label: t("setup.americano"), sublabel: t("setup.americanoSub") },
                { value: "mexicano" as const, label: t("setup.mexicano"), sublabel: t("setup.mexicanoSub") },
              ]}
              onChange={setMode}
            />
          </Field>

          <Field label={t("setup.courts")}>
            <ChoiceGroup
              value={courts}
              options={[
                { value: 1, label: t("setup.oneCourt") },
                { value: 2, label: t("setup.twoCourts") },
              ]}
              onChange={changeCourts}
            />
          </Field>

          <Field label={t("setup.date")}>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </Card>
      </section>

      <section className="mb-8">
        <SectionTitle>{t("setup.cost")}</SectionTitle>
        <Card className="space-y-5 p-4">
          {bookings.map((booking, index) => (
            <div key={index} className="grid grid-cols-2 gap-3">
              <Field
                label={courts === 1 ? t("setup.courtCost") : t("setup.courtNCost", { number: index + 1 })}
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

          <Field label={t("setup.whoPaid")} hint={t("setup.paidHint")}>
            <Select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
              <option value="">{t("common.nobody")}</option>
              {selected.map((id) => (
                <option key={id} value={id}>
                  {nameOf(id)}
                </option>
              ))}
            </Select>
          </Field>
        </Card>
      </section>

      <Button className="w-full" disabled={!valid || saving} onClick={() => void start()}>
        {saving ? t("setup.starting") : t("setup.start")}
      </Button>
    </>
  );
}
