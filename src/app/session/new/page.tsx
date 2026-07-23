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
  Select,
  SectionTitle,
} from "@/components/ui";
import { toCents } from "@/lib/cost";
import { DEFAULT_GAMES_TO_WIN, DEFAULT_HOURS, type NewSession } from "@/lib/domain";
import { CURRENCY, todayIso } from "@/lib/format";
import { describeSupportedConfigurations, isSupportedConfiguration } from "@/lib/rotation";
import type { RotationMode } from "@/lib/rotation/types";
import { useData } from "../../providers";

interface BookingDraft {
  cost: string;
  hours: string;
}

const MODES: { value: RotationMode; label: string; sublabel: string }[] = [
  { value: "americano", label: "Americano", sublabel: "Fixed schedule" },
  { value: "mexicano", label: "Mexicano", sublabel: "Ranked pairings" },
];

/** Player counts we know how to run, and the court count each one implies. */
const COURTS_FOR_PLAYERS: Record<number, number> = { 4: 1, 5: 1, 6: 1, 8: 2 };

export default function NewSessionPage() {
  const router = useRouter();
  const { ready, activePlayers, groups, startSession } = useData();

  const [date, setDate] = useState(todayIso());
  const [selected, setSelected] = useState<string[]>([]);
  const [groupId, setGroupId] = useState<string | undefined>();
  const [courts, setCourts] = useState(1);
  const [mode, setMode] = useState<RotationMode>("americano");
  const [gamesToWin, setGamesToWin] = useState(String(DEFAULT_GAMES_TO_WIN));
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

  const message = useMemo(() => {
    if (selected.length === 0) return "Pick who turned up.";
    if (valid) return null;
    if (selected.length === 7) return "Seven is the awkward one — play 6 or 8, or add a stand-in.";
    return `${selected.length} players doesn’t fit a court setup we can rotate fairly. Supported: ${describeSupportedConfigurations()}.`;
  }, [selected.length, valid]);

  if (!ready) return <Loading />;

  if (activePlayers.length < 4) {
    return (
      <>
        <PageTitle title="New session" />
        <EmptyState icon="👥" title="Not enough players" action={<ButtonLink href="/roster">Go to roster</ButtonLink>}>
          You need at least four people on the roster to start a session.
        </EmptyState>
      </>
    );
  }

  const toggle = (id: string) => {
    // Hand-picking players means this is no longer that group’s session, so the all-time table
    // for the group doesn’t quietly absorb a one-off line-up.
    setGroupId(undefined);
    selectPlayers(selected.includes(id) ? selected.filter((p) => p !== id) : [...selected, id]);
  };

  const applyGroup = (id: string) => {
    const group = groups.find((g) => g.id === id);
    if (!group) return;
    // Anyone since removed from the roster shouldn’t silently join the session.
    const available = new Set(activePlayers.map((p) => p.id));
    selectPlayers(group.playerIds.filter((playerId) => available.has(playerId)));
    setGroupId(group.id);
  };

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
        playerIds: selected,
        courts,
        mode,
        // Courts run concurrently, so the session is as long as the longest booking.
        hours: Math.max(...parsedBookings.map((b) => b.hours)),
        gamesToWin: Math.max(1, Number(gamesToWin) || DEFAULT_GAMES_TO_WIN),
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
      <PageTitle title="New session" subtitle="Set it up once; everything after this is tapping scores." />

      <section className="mb-6">
        <SectionTitle>Who’s playing</SectionTitle>
        {groups.length > 0 ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {groups.map((group) => (
              <Button
                key={group.id}
                variant={groupId === group.id ? "primary" : "secondary"}
                className="h-10 min-h-10 px-3 text-sm"
                onClick={() => applyGroup(group.id)}
              >
                {group.name}
              </Button>
            ))}
          </div>
        ) : null}
        <PlayerPicker players={activePlayers} selected={selected} onToggle={toggle} />
        <p className={`mt-3 text-sm ${valid ? "text-accent" : "text-muted"}`}>
          {message ?? `${selected.length} players on ${courts === 1 ? "1 court" : `${courts} courts`} — good to go.`}
        </p>
      </section>

      <section className="mb-6">
        <SectionTitle>Format</SectionTitle>
        <Card className="space-y-4 p-4">
          <Field
            label="Rotation mode"
            hint={
              mode === "americano"
                ? "Whole schedule fixed up front. Everyone partners with everyone."
                : "Pairings rebuilt each round from the standings, so games stay close."
            }
          >
            <ChoiceGroup value={mode} options={MODES} onChange={setMode} />
          </Field>

          <Field label="Courts">
            <ChoiceGroup
              value={courts}
              options={[
                { value: 1, label: "1 court" },
                { value: 2, label: "2 courts" },
              ]}
              onChange={changeCourts}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Games to win" hint="Per rotation.">
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                value={gamesToWin}
                onChange={(e) => setGamesToWin(e.target.value)}
              />
            </Field>
          </div>
        </Card>
      </section>

      <section className="mb-8">
        <SectionTitle>Cost</SectionTitle>
        <Card className="space-y-4 p-4">
          {bookings.map((booking, index) => (
            <div key={index} className="grid grid-cols-2 gap-3">
              <Field label={courts === 1 ? "Court cost" : `Court ${index + 1} cost`}>
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

          <Field label="Who paid for the court?" hint="Optional — used to work out who owes whom.">
            <Select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
              <option value="">Nobody yet</option>
              {selected.map((id) => (
                <option key={id} value={id}>
                  {activePlayers.find((p) => p.id === id)?.name ?? id}
                </option>
              ))}
            </Select>
          </Field>
        </Card>
      </section>

      <Button className="w-full" disabled={!valid || saving} onClick={() => void start()}>
        {saving ? "Starting…" : "Start session"}
      </Button>
    </>
  );
}
