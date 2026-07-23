"use client";

import { useState, type FormEvent } from "react";
import { PlayerPicker } from "@/components/PlayerPicker";
import { Badge, Button, Card, EmptyState, Input, Loading, PageTitle, SectionTitle } from "@/components/ui";
import type { Group } from "@/lib/domain";
import { pluralise } from "@/lib/format";
import { useData } from "../providers";

export default function RosterPage() {
  const { ready, players, activePlayers, addPlayer, renamePlayer, removePlayer } = useData();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  if (!ready) return <Loading />;

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

  async function confirmRemove(id: string, name: string) {
    const message =
      `Remove ${name} from the roster and any saved groups?\n\n` +
      `If they've played a session they're kept as archived, so past results still show their name.`;
    if (window.confirm(message)) await removePlayer(id);
  }

  return (
    <>
      <PageTitle
        title="Roster"
        subtitle="Everyone who plays, plus the groups you start sessions from."
      />

      <section className="mb-8">
        <SectionTitle action={<span className="text-xs text-muted">{pluralise(activePlayers.length, "player")}</span>}>
          Players
        </SectionTitle>

        <form onSubmit={submitPlayer} className="mb-3 flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Add a player"
            aria-label="New player name"
            autoComplete="off"
          />
          <Button type="submit" disabled={!newName.trim()} className="shrink-0 px-5">
            Add
          </Button>
        </form>

        {players.length === 0 ? (
          <EmptyState icon="👋" title="No players yet">
            Add everyone who plays regularly. You only have to do this once.
          </EmptyState>
        ) : (
          <Card className="divide-y divide-line">
            {players.map((player) => (
              <div key={player.id} className="flex items-center gap-2 p-3">
                {editingId === player.id ? (
                  <>
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      aria-label={`Rename ${player.name}`}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void saveRename(player.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                    />
                    <Button variant="secondary" onClick={() => void saveRename(player.id)} className="shrink-0">
                      Save
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 truncate font-medium">
                      {player.name}
                      {player.archived ? (
                        <span className="ml-2 align-middle">
                          <Badge>archived</Badge>
                        </span>
                      ) : null}
                    </span>
                    <Button
                      variant="ghost"
                      className="px-3"
                      onClick={() => {
                        setEditingId(player.id);
                        setEditingName(player.name);
                      }}
                    >
                      Rename
                    </Button>
                    {player.archived ? null : (
                      <Button
                        variant="danger"
                        className="px-3"
                        onClick={() => void confirmRemove(player.id, player.name)}
                        aria-label={`Remove ${player.name}`}
                      >
                        Remove
                      </Button>
                    )}
                  </>
                )}
              </div>
            ))}
          </Card>
        )}
      </section>

      <GroupsSection />
    </>
  );
}

function GroupsSection() {
  const { activePlayers, groups, addGroup, updateGroup, removeGroup, playerName } = useData();
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
            className="px-3 text-sm"
            disabled={activePlayers.length === 0}
            onClick={() => setEditing("new")}
          >
            + New group
          </Button>
        }
      >
        Groups
      </SectionTitle>

      {groups.length === 0 ? (
        <EmptyState icon="🗂️" title="No groups saved">
          Save the people you usually play with so starting a session is two taps instead of eight.
        </EmptyState>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => (
            <Card key={group.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">{group.name}</p>
                  <p className="mt-0.5 truncate text-sm text-muted">
                    {group.playerIds.length === 0
                      ? "No players yet"
                      : group.playerIds.map(playerName).join(", ")}
                  </p>
                </div>
                <div className="flex shrink-0">
                  <Button variant="ghost" className="px-3" onClick={() => setEditing(group)}>
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    className="px-3"
                    onClick={() => {
                      if (window.confirm(`Delete the group "${group.name}"? Players are kept.`)) {
                        void removeGroup(group.id);
                      }
                    }}
                  >
                    Delete
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
  const [name, setName] = useState(group?.name ?? "");
  const [selected, setSelected] = useState<string[]>([...(group?.playerIds ?? [])]);

  const toggle = (id: string) =>
    setSelected((current) => (current.includes(id) ? current.filter((p) => p !== id) : [...current, id]));

  return (
    <section>
      <SectionTitle>{group ? "Edit group" : "New group"}</SectionTitle>
      <Card className="space-y-4 p-4">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Group name, e.g. Tuesday regulars"
          aria-label="Group name"
          autoFocus
        />
        <PlayerPicker players={activePlayers} selected={selected} onToggle={toggle} />
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button
            disabled={!name.trim()}
            onClick={() => void onSave(name.trim(), selected)}
            className="flex-1"
          >
            Save
          </Button>
        </div>
      </Card>
    </section>
  );
}
