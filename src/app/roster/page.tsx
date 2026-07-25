"use client";

import { useState, type FormEvent } from "react";
import { useConfirm } from "@/components/ConfirmDialog";
import { PlayerPicker } from "@/components/PlayerPicker";
import { Button, Card, EmptyState, Input, Loading, PageTitle, SectionTitle } from "@/components/ui";
import { useI18n } from "@/i18n";
import type { Group } from "@/lib/domain";
import { useData } from "../providers";

/** The number of players below which no session can start — 4 fills one court. */
const MIN_PLAYERS = 4;

/**
 * One line carrying everything about the size of the roster: how many players there are, whether
 * that's enough, and how many more are needed.
 *
 * It replaced three separate elements that all encoded the same fact — a count in the section
 * header, the pips, and the hint text. The pips only earn their place while they're actionable, so
 * below the minimum they show the gap and above it they simply confirm, with the count folded into
 * the same sentence. No background either: another full-width band just added a box to look past.
 */
function RosterStatus({ count }: { count: number }) {
  const { t, n } = useI18n();
  const enough = count >= MIN_PLAYERS;
  const missing = MIN_PLAYERS - count;

  return (
    <p className={`mt-2.5 flex items-center gap-2.5 px-1 text-xs font-semibold ${enough ? "text-accent" : "text-muted"}`}>
      <span className="flex shrink-0 gap-1" aria-hidden>
        {Array.from({ length: MIN_PLAYERS }, (_, i) => (
          <span
            key={i}
            className={`size-1.5 rounded-full transition-colors duration-300 ${
              i < Math.min(count, MIN_PLAYERS) ? "bg-accent" : "bg-line"
            }`}
          />
        ))}
      </span>
      {enough
        ? t("roster.readyToPlay", { players: n("player", count) })
        : t("roster.needMore", { players: n("player", missing) })}
    </p>
  );
}

/** Rename and remove, as icons. Two words per row multiplied out to a wall of text on a phone. */
function RowAction({
  label,
  icon,
  onClick,
  tone = "muted",
}: {
  label: string;
  icon: "rename" | "remove";
  onClick: () => void;
  tone?: "muted" | "danger";
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      // 44px, the same minimum the rest of the app's controls use — an icon button is smaller to
      // look at but still has to be as easy to hit as the words it replaced.
      className={`flex size-11 shrink-0 items-center justify-center rounded-lg transition-colors
                  duration-150 active:scale-95 ${
                    tone === "danger"
                      ? "text-muted hover:bg-danger/10 hover:text-danger"
                      : "text-muted hover:bg-raised hover:text-ink"
                  }`}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {icon === "rename" ? (
          <>
            <path d="M12 20h9" />
            <path d="M16.4 3.6a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </>
        ) : (
          <path d="M6 6l12 12M18 6L6 18" />
        )}
      </svg>
    </button>
  );
}

export default function RosterPage() {
  const { ready, players, activePlayers, addPlayer, renamePlayer, removePlayer, removeAllPlayers } =
    useData();
  const { t, n } = useI18n();
  const confirm = useConfirm();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  if (!ready) return <Loading label={t("common.loading")} />;

  const archived = players.filter((player) => player.archived);

  async function submitPlayer(event: FormEvent) {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setNewName("");
    await addPlayer(name);
  }

  async function saveRename(id: string) {
    const name = editingName.trim();
    if (name) await renamePlayer(id, name);
    setEditingId(null);
  }

  /** One roster row. Shared by the active and archived lists, which differ only in the remove action. */
  function playerRow(player: (typeof players)[number], index: number) {
    if (editingId === player.id) {
      return (
        <Card key={player.id} className="flex items-center gap-2 p-2.5">
          <Input
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            aria-label={t("roster.renameLabel", { name: player.name })}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") void saveRename(player.id);
              if (e.key === "Escape") setEditingId(null);
            }}
          />
          <Button variant="secondary" onClick={() => void saveRename(player.id)} className="shrink-0">
            {t("common.save")}
          </Button>
        </Card>
      );
    }

    return (
      <Card
        key={player.id}
        style={{ "--stagger": index } as React.CSSProperties}
        className="rise-in flex items-center gap-1 py-1.5 pr-1.5 pl-3.5"
      >
        <span className={`flex-1 truncate font-bold tracking-tight ${player.archived ? "text-muted" : ""}`}>
          {player.name}
        </span>
        <RowAction
          label={t("roster.renameLabel", { name: player.name })}
          icon="rename"
          onClick={() => {
            setEditingId(player.id);
            setEditingName(player.name);
          }}
        />
        {player.archived ? null : (
          <RowAction
            label={t("roster.removeLabel", { name: player.name })}
            icon="remove"
            tone="danger"
            onClick={async () => {
              const ok = await confirm({
                title: t("confirm.removePlayerTitle"),
                message: t("roster.confirmRemovePlayer", { name: player.name }),
                confirmLabel: t("common.remove"),
              });
              if (ok) await removePlayer(player.id);
            }}
          />
        )}
      </Card>
    );
  }

  return (
    <>
      <PageTitle title={t("roster.title")} subtitle={t("roster.subtitle")} />

      <section className="mb-9">
        <SectionTitle>{t("roster.players")}</SectionTitle>

        <form onSubmit={submitPlayer} className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t("roster.addPlaceholder")}
            aria-label={t("roster.newPlayerLabel")}
            autoComplete="off"
          />
          <Button type="submit" disabled={!newName.trim()} className="shrink-0 px-5">
            {t("common.add")}
          </Button>
        </form>

        <RosterStatus count={activePlayers.length} />

        {activePlayers.length === 0 ? (
          <div className="mt-3">
            <EmptyState title={t("roster.noPlayersTitle")}>{t("roster.noPlayersBody")}</EmptyState>
          </div>
        ) : (
          <>
            <div className="mt-3 space-y-1">{activePlayers.map(playerRow)}</div>
            {/*
              At the end rather than in the header, and quiet until you reach for it: clearing the
              whole roster is rare and irreversible, so it shouldn't sit above the list competing
              with the per-row remove for attention. The confirmation is where the red belongs.
            */}
            <div className="mt-2 flex justify-end">
              <Button
                variant="ghost"
                className="h-9 min-h-9 px-2.5 text-xs hover:text-danger"
                onClick={async () => {
                  const ok = await confirm({
                    title: t("roster.confirmClearAllTitle"),
                    message: t("roster.confirmClearAll", { players: n("player", activePlayers.length) }),
                    confirmLabel: t("roster.clearAll"),
                  });
                  if (ok) await removeAllPlayers();
                }}
              >
                {t("roster.clearAll")}
              </Button>
            </div>
          </>
        )}
      </section>

      {/*
        Archived players sat in the middle of the roster with a badge, which made the list read as
        longer than it is and put people you can't pick next to people you can. They're history, so
        they belong below the live roster, not inside it.
      */}
      {archived.length > 0 ? (
        <section className="mb-9">
          <SectionTitle action={<span className="text-xs text-muted tabular-nums">{archived.length}</span>}>
            {t("roster.archivedSection")}
          </SectionTitle>
          <div className="space-y-1">{archived.map(playerRow)}</div>
          <p className="mt-2.5 px-1 text-xs leading-relaxed text-muted">{t("roster.archivedHint")}</p>
        </section>
      ) : null}

      <GroupsSection />
    </>
  );
}

function GroupsSection() {
  const { activePlayers, groups, sessions, addGroup, updateGroup, removeGroup, playerName } = useData();
  const { t } = useI18n();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<Group | "new" | null>(null);

  /**
   * Deleting a group doesn't touch a session started from it — a session carries its own players and
   * their names, so it keeps working. Testers found that surprising, so the prompt now says it
   * outright, including the one consequence that isn't obvious: those results stop counting towards
   * the group's all-time table.
   *
   * The session deliberately isn't stopped. Ending a live game because someone tidied their roster
   * would throw away scores that are still being played for, which is far worse than a stale link.
   */
  async function confirmDeleteGroup(group: Group): Promise<boolean> {
    const hasActiveSession = sessions.some((s) => s.groupId === group.id && s.status === "active");
    return confirm({
      title: t("confirm.deleteGroupTitle"),
      message: hasActiveSession
        ? t("roster.confirmDeleteGroupActive", { name: group.name })
        : t("roster.confirmDeleteGroup", { name: group.name }),
      confirmLabel: t("common.delete"),
    });
  }

  if (editing) {
    return (
      <GroupEditor
        group={editing === "new" ? null : editing}
        onCancel={() => setEditing(null)}
        onSave={async (name, playerIds) => {
          if (editing === "new") await addGroup(name, playerIds);
          else await updateGroup(editing.id, { name, playerIds });
          setEditing(null);
        }}
      />
    );
  }

  return (
    <section>
      <SectionTitle
        action={
          <Button
            variant="ghost"
            className="h-9 min-h-9 px-3 text-xs"
            disabled={activePlayers.length === 0}
            onClick={() => setEditing("new")}
          >
            {t("roster.newGroup")}
          </Button>
        }
      >
        {t("roster.groups")}
      </SectionTitle>

      {groups.length === 0 ? (
        <EmptyState title={t("roster.noGroupsTitle")}>{t("roster.noGroupsBody")}</EmptyState>
      ) : (
        <div className="space-y-1">
          {groups.map((group) => (
            <Card key={group.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold tracking-tight">{group.name}</p>
                  <p className="mt-1 truncate text-sm text-muted">
                    {group.playerIds.length === 0
                      ? t("roster.groupEmpty")
                      : group.playerIds.map(playerName).join(", ")}
                  </p>
                </div>
                <div className="flex shrink-0">
                  <Button
                    variant="ghost"
                    className="h-10 min-h-10 px-3 text-xs"
                    onClick={() => setEditing(group)}
                  >
                    {t("common.edit")}
                  </Button>
                  <Button
                    variant="danger"
                    className="h-10 min-h-10 px-3 text-xs"
                    onClick={async () => {
                      if (await confirmDeleteGroup(group)) await removeGroup(group.id);
                    }}
                  >
                    {t("common.delete")}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

function GroupEditor({
  group,
  onSave,
  onCancel,
}: {
  group: Group | null;
  onSave: (name: string, playerIds: string[]) => Promise<void>;
  onCancel: () => void;
}) {
  const { activePlayers } = useData();
  const { t } = useI18n();
  const [name, setName] = useState(group?.name ?? "");
  const [selected, setSelected] = useState<string[]>([...(group?.playerIds ?? [])]);

  const toggle = (id: string) =>
    setSelected((current) => (current.includes(id) ? current.filter((p) => p !== id) : [...current, id]));

  return (
    <section>
      <SectionTitle>{group ? t("roster.editGroup") : t("roster.newGroup")}</SectionTitle>
      <Card className="space-y-4 p-4">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("roster.groupNamePlaceholder")}
          aria-label={t("roster.groupNameLabel")}
          autoFocus
        />
        <PlayerPicker players={activePlayers} selected={selected} onToggle={toggle} />
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onCancel} className="flex-1">
            {t("common.cancel")}
          </Button>
          <Button disabled={!name.trim()} onClick={() => void onSave(name.trim(), selected)} className="flex-1">
            {t("common.save")}
          </Button>
        </div>
      </Card>
    </section>
  );
}
