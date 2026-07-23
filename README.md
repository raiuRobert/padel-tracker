# Padel Tracker

A courtside web app for groups of friends who play social padel. It solves three problems:

1. **Fair rotations.** With 4, 5, 6, or 8 players across 1 or 2 courts, work out who partners with
   whom, who plays against whom, and who sits out — as evenly as possible.
2. **Score tracking.** Enter a score after each rotation and see who won the most games.
3. **Fair cost splitting.** Split the court fee in proportion to how much each person actually
   played, not an equal split — plus whatever they grabbed from the fridge.

No backend, no login. Everything lives in the browser (IndexedDB) and works offline once loaded.

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:3000.

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm test` | Run the unit test suite (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Lint |

## Rotation modes

You pick one when starting a session.

### Americano — fixed schedule, generated up front

The whole schedule is computed before play starts. Results never change who plays next; they only
add to each player's cumulative score. The shape depends on how many people showed up:

- **4 players, 1 court** — nobody sits out. Only 3 unique partnerships exist among 4 people, so a
  full cycle is 3 rounds, then it repeats.
- **5 players, 1 court** — one sit-out per round. There are 10 unique partnerships among 5 people
  and each round uses 2 of them, so a full cycle is exactly 5 rounds: every partnership happens
  once and everyone sits out once. Only a single seat rotates per round — the player coming off the
  sideline swaps in for one specific player, rather than a whole pair stepping out.
- **6 players, 1 court** — sit-outs happen in fixed *pairs*. The six are split into three fixed
  partnerships; each round two of them play and the third sits. A full cycle is 3 rounds, after
  which every pair has sat once and played every other pair once. Then the six are reshuffled into
  three brand-new partnerships and the cycle runs again. Scores accumulate per player across
  reshuffles.
- **8 players, 2 courts** — split into two fixed groups of 4, each running its own independent
  4-player cycle on its own court simultaneously. Players don't cross between courts (see
  *Assumptions* below).

The generator guarantees that, within a cycle, no player or pair sits out twice before everyone has
sat out once, and no partnership repeats before every available partnership has happened once.

### Mexicano — adaptive, standings-based

Only the first round is arbitrary. Before each subsequent round, players are ranked by cumulative
score and paired to keep games competitive: 1st with 4th against 2nd with 3rd, extended
proportionally for 5, 6, and 8 players and however many courts are in play. Sit-out rotation stays
fair independently of the score-driven pairing — nobody sits twice before everyone has sat once.

## Cost splitting

Each player's share of the court fee is proportional to the number of rotations they actually
played. Arrive late or leave early and you pay less. On top of that, **extras** (a drink from the
fridge, snacks) are billed to one specific player or split across a chosen subset — not necessarily
everyone in the session.

The summary shows court share, extras, and total separately for each player, so it's always obvious
why someone owes what they owe, plus who owes what to whoever fronted the court payment.

## Architecture

```
src/
  lib/            pure TypeScript — no React, no storage, no DOM
    rotation/     schedule generation for both modes
    cost/         cost-split calculation
  data/           storage layer behind a repository interface (IndexedDB via idb)
  app/            Next.js App Router UI
```

The rotation engine and cost-split logic are deliberately framework-agnostic plain TypeScript with
no UI or storage imports, so a future React Native / Expo app can reuse them as-is. The storage
layer sits behind a small repository interface, so swapping IndexedDB for a real backend (Supabase,
say) touches neither business logic nor UI.

## Assumptions

Decisions made without asking, noted here so they're easy to revisit:

- **8 players never cross courts.** The two groups of 4 stay fixed for the session. Mixing across
  courts is a deliberate extension point, not built in the MVP.
- **Session length is a free number input**, defaulting to 2 hours — not a fixed 2/3/4 dropdown.
- **First to 6 games** is the default per-rotation target, configurable per session.
- **Cost is split by rotations played**, which is the proxy for time on court. It assumes rotations
  are roughly equal length, which they are in practice.

## Out of scope (for now)

No native mobile app, no accounts or auth, no multi-device sync, no payment processing — the app
tells you who owes what, settling up is your problem.

## License

MIT — see [LICENSE](LICENSE).
