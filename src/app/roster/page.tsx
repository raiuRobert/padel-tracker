"use client";

import { useState, type FormEvent } from "react";
import { PlayerPicker } from "@/components/PlayerPicker";
import { Badge, Button, Card, EmptyState, Input, Loading, PageTitle, SectionTitle } from "@/components/ui";
import { useI18n } from "@/i18n";
import type { Group } from "@/lib/domain";
import { useData } from "../providers";

export default function RosterPage() {
  const { ready, players, activePlayers, addPlayer, renamePlayer, removePlayer } = useData();
  const { t, n } = useI18n();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  if (!ready) return <Loading label={t("common.loading")} />;

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

  return (
    <>
      <PageTitle title={t("roster.title")} subtitle={t("roster.subtitle")} />

      <section className="mb-9">
        <SectionTitle action={<span className="text-xs text-muted">{n("player", activePlayers.length)}</span>}>
          {t("roster.players")}
        </SectionTitle>

        <form onSubmit={submitPlayer} className="mb-2 flex gap-2">
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

        {players.length === 0 ? (
          <EmptyState title={t("roster.noPlayersTitle")}>{t("roster.noPlayersBody")}</EmptyState>
        ) : (
          <div className="space-y-1">
            {players.map((player) => (
              <Card key={player.id} className="flex items-center gap-2 p-2.5">
                {editingId === player.id ? (
                  <>
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
                  </>
                ) : (
                  <>
                    <span className="flex-1 truncate pl-1.5 font-bold tracking-tight">
                      {player.name}
                      {player.archived ? (
                        <span className="ml-2 align-middle">
                          <Badge>{t("roster.archived")}</Badge>
                        </span>
                      ) : null}
                    </span>
                    <Button
                      variant="ghost"
                      className="h-10 min-h-10 px-3 text-xs"
                      onClick={() => {
                        setEditingId(player.id);
                        setEditingName(player.name);
                      }}
                    >
                      {t("roster.rename")}
                    </Button>
                    {player.archived ? null : (
                      <Button
                        variant="danger"
                        className="h-10 min-h-10 px-3 text-xs"
                        aria-label={t("roster.removeLabel", { name: player.name })}
                        onClick={() => {
                          if (window.confirm(t("roster.confirmRemovePlayer", { name: player.name }))) {
                            void removePlayer(player.id);
                          }
                        }}
                      >
                        {t("common.remove")}
                      </Button>
                    )}
                  </>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      <GroupsSection />
    </>
  );
}

function GroupsSection() {
  const { activePlayers, groups, addGroup, updateGroup, removeGroup, playerName } = useData();
  const { t } = useI18n();
  const [editing, setEditing] = useState<Group | "new" | null>(null);

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
                    onClick={() => {
                      if (window.confirm(t("roster.confirmDeleteGroup", { name: group.name }))) {
                        void removeGroup(group.id);
                      }
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
