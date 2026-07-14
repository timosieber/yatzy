# Production Yatzy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a complete German-language Yatzy scorecard with four modes, durable local games, PostgreSQL-backed history and leaderboards, and a verified single-service Railway production build.

**Architecture:** A Vite React client and Express API share domain scoring modules so both sides validate the same rules. Express serves the built client and delegates persistence to an injected repository, with PostgreSQL in production and a memory repository in API tests. Browser storage holds the active game and an idempotent queue of completed games.

**Tech Stack:** Node.js 22+, React 19, Vite 7, Express 5, PostgreSQL via `pg`, Zod, Vitest, Testing Library, Supertest, ESLint, Railway.

## Global Constraints

- Keep all user-facing copy in German.
- Support Standard, Blitz, Maxi Yatzy, and Free Rules with actual eye totals.
- Support two through eight players identified by normalized player name without accounts.
- Make gameplay mobile-first, keyboard-accessible, screenreader-labelled, light/dark themed, and reduced-motion aware.
- Validate every completed game independently on the server before persistence.
- Run as one Railway web service using only `DATABASE_URL` and Railway's injected `PORT`.

---

### Task 1: Project foundation and shared scoring engine

**Files:**
- Create: `package.json`, `package-lock.json`, `index.html`, `vite.config.js`, `eslint.config.js`
- Create: `src/domain/modes.js`, `src/domain/scoring.js`
- Create: `src/domain/scoring.test.js`
- Move: `App.jsx` to `src/App.jsx`, `styles.css` to `src/styles.css`
- Create: `src/main.jsx`

**Interfaces:**
- Produces `getMode(modeKey, overrides)`, `getCategories(config)`, `validScores(category, config)`, `calculatePlayer(scores, config)`, and `rankPlayers(players, config)`.

- [ ] **Step 1: Write failing domain tests**

```js
import { describe, expect, it } from 'vitest'
import { getMode } from './modes.js'
import { calculatePlayer, rankPlayers, validScores } from './scoring.js'

describe('Yatzy scoring', () => {
  it('awards the standard upper bonus at 63', () => {
    const config = getMode('standard')
    const scores = { ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18 }
    expect(calculatePlayer(scores, config).bonus).toBe(35)
  })

  it('exposes only possible category scores', () => {
    expect(validScores({ key: 'pair', type: 'pair' }, getMode('standard'))).toContain(12)
    expect(validScores({ key: 'pair', type: 'pair' }, getMode('standard'))).not.toContain(11)
  })

  it('gives tied leaders the same rank', () => {
    const config = getMode('blitz')
    const ranked = rankPlayers([{ name: 'A', scores: {} }, { name: 'B', scores: {} }], config)
    expect(ranked.map(player => player.rank)).toEqual([1, 1])
  })
})
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `npm test -- src/domain/scoring.test.js`
Expected: FAIL because the project and imported modules do not exist.

- [ ] **Step 3: Create the Vite project and scoring implementation**

Implement immutable mode definitions, count-distribution generation for six-sided dice, category scorers, possible-score caching, upper/lower totals, mode bonuses, completion detection, and competition ranking. Create npm scripts `dev`, `build`, `start`, `test`, `test:watch`, and `lint`.

- [ ] **Step 4: Run scoring tests and build**

Run: `npm test -- src/domain/scoring.test.js && npm run build`
Expected: all scoring tests pass and Vite creates `dist/`.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json index.html vite.config.js eslint.config.js src App.jsx styles.css
git commit -m "feat: add validated Yatzy scoring foundation"
```

### Task 2: Game reducer and durable browser state

**Files:**
- Create: `src/domain/game.js`, `src/domain/game.test.js`
- Create: `src/lib/storage.js`, `src/lib/storage.test.js`

**Interfaces:**
- Consumes scoring functions from Task 1.
- Produces `createGame(config, names)`, `gameReducer(state, action)`, `serializeGame(state)`, `loadPersistedState(storage)`, `persistState(storage, value)`, `enqueueSubmission(storage, game)`, and `flushQueue(storage, submit)`.

- [ ] **Step 1: Write failing reducer and persistence tests**

```js
it('advances to the next seat regardless of category', () => {
  const game = createGame(getMode('standard'), ['Mara', 'Timo'])
  const next = gameReducer(game, { type: 'score', playerIndex: 0, category: 'ones', value: 3 })
  expect(next.activePlayer).toBe(1)
})

it('correction keeps the active turn and can be undone', () => {
  const corrected = gameReducer(started, { type: 'correct', playerIndex: 0, category: 'ones', value: 4 })
  expect(corrected.activePlayer).toBe(started.activePlayer)
  expect(gameReducer(corrected, { type: 'undo' }).players[0].scores.ones).toBe(3)
})

it('keeps a failed completed game queued', async () => {
  await flushQueue(storage, async () => { throw new Error('offline') })
  expect(JSON.parse(storage.getItem('yatzy:v1')).queue).toHaveLength(1)
})
```

- [ ] **Step 2: Run tests and confirm RED**

Run: `npm test -- src/domain/game.test.js src/lib/storage.test.js`
Expected: FAIL because game and storage modules do not exist.

- [ ] **Step 3: Implement reducer and versioned persistence**

Use pure state transitions for score, correct, undo, and reset. Store a capped undo history of 100 snapshots. Persist `{ version: 1, theme, setup, activeGame, queue }`; reject corrupt or unsupported payloads and retain queued submissions until a successful idempotent response.

- [ ] **Step 4: Run reducer and storage tests**

Run: `npm test -- src/domain/game.test.js src/lib/storage.test.js`
Expected: all reducer and persistence tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/domain/game.js src/domain/game.test.js src/lib/storage.js src/lib/storage.test.js
git commit -m "feat: persist complete game sessions"
```

### Task 3: Validated API, PostgreSQL repository, and migrations

**Files:**
- Create: `server/app.js`, `server/index.js`, `server/gameService.js`
- Create: `server/repositories/memoryRepository.js`, `server/repositories/postgresRepository.js`
- Create: `server/db/migrate.js`, `server/db/migrate.test.js`
- Create: `db/migrations/001_initial.sql`
- Create: `server/app.test.js`, `server/gameService.test.js`

**Interfaces:**
- Consumes the shared scoring engine.
- Produces repository methods `saveGame(game)`, `listGames({ limit, cursor })`, `getGame(id)`, `getLeaderboard({ mode, limit })`, and `health()`.
- Produces Express endpoints `GET /api/health`, `POST /api/games`, `GET /api/games`, `GET /api/games/:id`, and `GET /api/leaderboard`.

- [ ] **Step 1: Write failing service and API tests**

```js
it('recalculates and stores a complete game idempotently', async () => {
  const first = await request(app).post('/api/games').send(validCompletedGame)
  const retry = await request(app).post('/api/games').send(validCompletedGame)
  expect(first.status).toBe(201)
  expect(retry.status).toBe(200)
  expect(await repository.countGames()).toBe(1)
})

it('rejects an impossible category score', async () => {
  const payload = structuredClone(validCompletedGame)
  payload.players[0].scores.pair = 11
  const response = await request(app).post('/api/games').send(payload)
  expect(response.status).toBe(422)
  expect(response.body.error.code).toBe('INVALID_SCORE')
})

it('merges leaderboard names case-insensitively', async () => {
  await repository.saveGame(gameWith('Timo', 200))
  await repository.saveGame(gameWith('timo', 220))
  const rows = await repository.getLeaderboard({ mode: 'standard', limit: 20 })
  expect(rows).toMatchObject([{ playerName: 'timo', bestScore: 220, gamesPlayed: 2 }])
})
```

- [ ] **Step 2: Run API tests and confirm RED**

Run: `npm test -- server`
Expected: FAIL because server modules do not exist.

- [ ] **Step 3: Implement validation, repositories, API, and SQL migration**

Validate UUID, mode configuration, two-to-eight unique seats, normalized names of 1–40 characters, exact category keys, complete scores, possible values, and completion timestamps no more than 24 hours in the future. Recalculate totals and ranks. Use parameterized SQL and a transaction for games plus players. Add Helmet, 64kb JSON limit, write rate limiting, and stable error envelopes.

- [ ] **Step 4: Run API and migration tests**

Run: `npm test -- server`
Expected: all service, endpoint, repository-contract, and migration tests pass.

- [ ] **Step 5: Commit**

```bash
git add server db package.json package-lock.json
git commit -m "feat: add PostgreSQL game history API"
```

### Task 4: Complete gameplay interface

**Files:**
- Create: `src/components/AppShell.jsx`, `src/components/Setup.jsx`, `src/components/GameBoard.jsx`
- Create: `src/components/ScoreDialog.jsx`, `src/components/ConfirmDialog.jsx`, `src/components/WinnerDialog.jsx`
- Create: `src/components/gameplay.test.jsx`
- Modify: `src/App.jsx`, `src/styles.css`

**Interfaces:**
- Consumes mode, scoring, reducer, and storage interfaces.
- Produces setup, resumption, score entry, correction, undo, completion, and local queue workflows.

- [ ] **Step 1: Write failing component tests**

```jsx
it('starts a standard game and advances after a score', async () => {
  render(<App />)
  await user.click(screen.getByRole('button', { name: /spiel starten/i }))
  await user.click(screen.getByRole('button', { name: /mara.*einser/i }))
  await user.click(screen.getByRole('button', { name: '3 Punkte' }))
  await user.click(screen.getByRole('button', { name: /eintragen/i }))
  expect(screen.getByText(/timo ist dran/i)).toBeInTheDocument()
})

it('offers resume and discard for a stored unfinished game', () => {
  seedActiveGame()
  render(<App />)
  expect(screen.getByRole('button', { name: /fortsetzen/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /verwerfen/i })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run gameplay tests and confirm RED**

Run: `npm test -- src/components/gameplay.test.jsx`
Expected: FAIL because the new components and workflows do not exist.

- [ ] **Step 3: Implement the complete scorecard UI**

Build mode setup, duplicate-name prevention, current-turn card, sticky score table, valid-score picker, manual accessible input fallback, correction confirmation, undo, leave confirmation, tied-winner presentation, local resumption, theme persistence, and queue submission. Use dialog roles, focus restoration, Escape handling, labels, and live regions.

- [ ] **Step 4: Run gameplay tests and lint**

Run: `npm test -- src/components/gameplay.test.jsx && npm run lint`
Expected: gameplay tests pass and ESLint reports no errors.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "feat: complete accessible Yatzy gameplay"
```

### Task 5: History and leaderboard interface

**Files:**
- Create: `src/api/client.js`, `src/api/client.test.js`
- Create: `src/components/History.jsx`, `src/components/GameDetail.jsx`, `src/components/Leaderboard.jsx`
- Create: `src/components/records.test.jsx`
- Modify: `src/App.jsx`, `src/styles.css`

**Interfaces:**
- Consumes the API endpoints from Task 3.
- Produces `submitGame`, `fetchGames`, `fetchGame`, and `fetchLeaderboard`, plus loading, empty, data, retry, and unavailable views.

- [ ] **Step 1: Write failing records tests**

```jsx
it('renders history and opens a scorecard', async () => {
  mockApi.history([completedGame])
  render(<App />)
  await user.click(screen.getByRole('button', { name: /vergangene spiele/i }))
  expect(await screen.findByText(/mara gewinnt/i)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /details/i }))
  expect(screen.getByRole('table', { name: /spielblock/i })).toBeInTheDocument()
})

it('filters the leaderboard by mode', async () => {
  render(<Leaderboard />)
  await user.selectOptions(screen.getByLabelText(/spielmodus/i), 'maxi')
  expect(api.fetchLeaderboard).toHaveBeenCalledWith('maxi')
})
```

- [ ] **Step 2: Run records tests and confirm RED**

Run: `npm test -- src/api/client.test.js src/components/records.test.jsx`
Expected: FAIL because API client and record views do not exist.

- [ ] **Step 3: Implement API client, navigation, history, details, and leaderboard**

Render German date formatting, participant summary, tied winners, complete read-only scorecards, mode filters, best score, games, wins, last-played metadata, skeleton/loading copy, empty states, and retry buttons. Keep failed queued submissions visible as a non-blocking status.

- [ ] **Step 4: Run records tests and the full suite**

Run: `npm test`
Expected: all domain, reducer, storage, API, gameplay, and records tests pass.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "feat: add game history and leaderboards"
```

### Task 6: Railway production delivery and complete verification

**Files:**
- Create: `railway.json`, `.env.example`, `.gitignore`, `README.md`
- Create: `server/production.test.js`
- Modify: `server/index.js`, `package.json`

**Interfaces:**
- Consumes the complete client, API, migration runner, and PostgreSQL repository.
- Produces a Railway-compatible build and start contract with `/api/health` readiness.

- [ ] **Step 1: Write failing production contract test**

```js
it('serves the built application and reserves API 404s', async () => {
  expect((await request(app).get('/')).status).toBe(200)
  const missing = await request(app).get('/api/not-a-route')
  expect(missing.status).toBe(404)
  expect(missing.body.error.code).toBe('NOT_FOUND')
})
```

- [ ] **Step 2: Run production test and confirm RED**

Run: `npm run build && npm test -- server/production.test.js`
Expected: FAIL until production static serving and API fallback are wired.

- [ ] **Step 3: Implement production serving and deployment documentation**

Bind Express to `0.0.0.0` and `process.env.PORT`, run migrations before listening, serve `dist`, return JSON for unknown API routes, and return `index.html` for application routes. Configure Railway build `npm ci && npm run build`, start `npm start`, and healthcheck `/api/health`. Document PostgreSQL creation, `DATABASE_URL`, local commands, rules, and verification.

- [ ] **Step 4: Run fresh complete verification**

Run: `npm ci && npm run lint && npm test -- --run && npm run build`
Expected: clean install succeeds, lint has zero errors, all tests pass, and production build exits 0.

When the directory is linked to a Railway project with PostgreSQL, run: `PORT=4173 railway run npm start`, then request `http://127.0.0.1:4173/api/health`.
Expected: HTTP 200 with database status `ready`. When no Railway project is linked, the automated production contract test remains the required local server verification and the README states the exact Railway linking steps.

- [ ] **Step 5: Commit and push**

```bash
git add railway.json .env.example .gitignore README.md server package.json package-lock.json
git commit -m "chore: prepare Railway production deployment"
git push origin main
```
