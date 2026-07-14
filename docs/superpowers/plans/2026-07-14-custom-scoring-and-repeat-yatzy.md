# Custom Scoring and Repeat Yatzy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add arbitrary nonnegative scores for four lower categories, fixed 25/30/40 house-rule scores, and unlimited cumulative Yatzys worth 50 points each in every mode.

**Architecture:** Category definitions declare one of four input policies (`manual`, `fixed`, `repeat`, `calculated`), while the shared scoring module remains the single validator for browser and server. The score dialog renders by that policy, persisted version-1 games are normalized into version 2 on load, and PostgreSQL total columns are widened to `BIGINT` without rewriting historical score JSON.

**Tech Stack:** React 19, Vite 7, Express 5, PostgreSQL, Zod 4, Vitest, Testing Library.

## Global Constraints

- The rules apply to Standard, Blitz, Maxi Yatzy, and Free Rules wherever the category exists.
- `pair`, `twoPairs`, `threeKind`, and `fourKind` accept every nonnegative safe integer.
- Full House is 25, Small Straight is 30, Large Straight is 40, and Full Straight remains 21.
- Every Yatzy is worth 50 in every mode; the stored Yatzy score is a nonnegative multiple of 50 with no product-level count limit.
- New submissions use `categoryVersion: 2`; stored version-1 history remains readable.
- Browser and server must use the same validation functions.
- No new runtime dependency is introduced.

---

### Task 1: Declarative category policies and shared scoring

**Files:**
- Modify: `src/domain/modes.js`
- Modify: `src/domain/scoring.js`
- Modify: `src/domain/scoring.test.js`

**Interfaces:**
- Produces: category property `input: 'manual' | 'fixed' | 'repeat' | 'calculated'`.
- Produces: `isValidScore(category, value, config): boolean` supporting manual and repeat values without enumerating them.
- Produces: mode property `categoryVersion: 2`.
- Consumes: existing `validScores`, `scoreDistribution`, and `calculatePlayer` APIs.

- [ ] **Step 1: Write failing policy and scoring tests**

Add imports and cases in `src/domain/scoring.test.js`:

```js
import { calculatePlayer, isValidScore, rankPlayers, validScores } from './scoring.js'

it('accepts arbitrary nonnegative integers in the four manual categories', () => {
  const config = getMode('standard')
  for (const key of ['pair', 'twoPairs', 'threeKind', 'fourKind']) {
    const category = config.lower.find(item => item.key === key)
    expect(category.input).toBe('manual')
    expect(isValidScore(category, 137, config)).toBe(true)
    expect(isValidScore(category, -1, config)).toBe(false)
    expect(isValidScore(category, 1.5, config)).toBe(false)
  }
})

it('uses the fixed house-rule values in every mode', () => {
  for (const mode of ['standard', 'maxi', 'free']) {
    const config = getMode(mode)
    expect(validScores(config.lower.find(item => item.key === 'fullHouse'), config)).toEqual([0, 25])
    expect(validScores(config.lower.find(item => item.key === 'smallStraight'), config)).toEqual([0, 30])
    expect(validScores(config.lower.find(item => item.key === 'largeStraight'), config)).toEqual([0, 40])
  }
  expect(validScores(getMode('maxi').lower.find(item => item.key === 'fullStraight'), getMode('maxi'))).toEqual([0, 21])
})

it('accepts cumulative Yatzys in 50-point steps in every mode', () => {
  for (const mode of ['standard', 'blitz', 'maxi', 'free']) {
    const config = getMode(mode)
    const yatzy = config.lower.find(item => item.key === 'yatzy')
    expect(yatzy).toMatchObject({ input: 'repeat', step: 50, fixed: 50 })
    expect(isValidScore(yatzy, 250, config)).toBe(true)
    expect(isValidScore(yatzy, 275, config)).toBe(false)
  }
})
```

- [ ] **Step 2: Run the focused tests and confirm RED**

Run: `npm test -- src/domain/scoring.test.js`

Expected: FAIL because category policies are absent, old fixed values are 15/20, and `250` is not a valid Yatzy score.

- [ ] **Step 3: Add policies and version 2 to mode definitions**

In `src/domain/modes.js`, mark the four requested keys as `input: 'manual'`, set fixed values to 25/30/40, and define every Yatzy as `{ fixed: 50, step: 50, input: 'repeat' }`. Mark every other category `input: 'fixed'` when it has a fixed score and `input: 'calculated'` otherwise. Include `categoryVersion: 2` in the object returned by `getMode`.

The Standard definitions become:

```js
const STANDARD_LOWER = [
  { key: 'pair', label: '1 Paar', type: 'pair', input: 'manual' },
  { key: 'twoPairs', label: '2 Paare', type: 'twoPairs', input: 'manual' },
  { key: 'threeKind', label: '3 gleiche', type: 'kind3', input: 'manual' },
  { key: 'fourKind', label: '4 gleiche', type: 'kind4', input: 'manual' },
  { key: 'fullHouse', label: 'Full House', type: 'fullHouse', fixed: 25, input: 'fixed' },
  { key: 'smallStraight', label: 'Kleine Straße', type: 'smallStraight', fixed: 30, input: 'fixed' },
  { key: 'largeStraight', label: 'Große Straße', type: 'largeStraight', fixed: 40, input: 'fixed' },
  { key: 'yatzy', label: 'Yatzy', type: 'yatzy', fixed: 50, step: 50, input: 'repeat' },
  { key: 'chance', label: 'Chance', type: 'chance', input: 'calculated' },
]
```

Apply the same policies to matching Maxi definitions, keeping Full Straight fixed at 21. Upper categories use `input: 'calculated'`.

- [ ] **Step 4: Implement policy-aware shared validation**

In `src/domain/scoring.js`, make fixed score calculation read `category.fixed`, and short-circuit validation:

```js
export function isValidScore(category, value, config) {
  if (!Number.isSafeInteger(value) || value < 0) return false
  if (category.input === 'manual') return true
  if (category.input === 'repeat') return value % category.step === 0
  return validScores(category, config).includes(value)
}
```

For `fullHouse`, `smallStraight`, and `largeStraight`, return `category.fixed` when their dice condition qualifies. Before returning from `calculatePlayer`, reject any unsafe subtotal or total with `throw new RangeError('Die Punktesumme ist zu gross.')`.

- [ ] **Step 5: Run domain tests and commit**

Run: `npm test -- src/domain/scoring.test.js src/domain/game.test.js`

Expected: PASS.

Commit:

```bash
git add src/domain/modes.js src/domain/scoring.js src/domain/scoring.test.js
git commit -m "feat: add custom house-rule scoring"
```

---

### Task 2: Manual score input and repeat-Yatzy controls

**Files:**
- Modify: `src/components/ScoreDialog.jsx`
- Modify: `src/styles.css`
- Modify: `src/components/gameplay.test.jsx`

**Interfaces:**
- Consumes: `category.input`, `category.step`, `isValidScore(category, value, config)`.
- Produces: an accessible numeric textbox for manual categories and `−50`/`+50` controls for repeat categories.
- Preserves: `onSave(number)` and `onClose()` component callbacks.

- [ ] **Step 1: Write failing interaction tests**

Add these cases to `src/components/gameplay.test.jsx`:

```jsx
it('accepts an arbitrary whole-number score for a pair', async () => {
  const user = userEvent.setup()
  render(<App />)
  await user.click(screen.getByRole('button', { name: /spiel starten/i }))
  await user.click(screen.getByRole('button', { name: /mara.*1 paar eintragen/i }))
  await user.type(screen.getByRole('spinbutton', { name: /punkte für 1 paar/i }), '137')
  await user.click(screen.getByRole('button', { name: /^eintragen$/i }))
  expect(screen.getByRole('button', { name: /mara.*1 paar korrigieren/i })).toHaveTextContent('137')
})

it('adds and corrects multiple Yatzys in 50-point steps', async () => {
  const user = userEvent.setup()
  render(<App />)
  await user.click(screen.getByRole('button', { name: /spiel starten/i }))
  await user.click(screen.getByRole('button', { name: /mara.*yatzy eintragen/i }))
  await user.click(screen.getByRole('button', { name: /50 punkte hinzufügen/i }))
  await user.click(screen.getByRole('button', { name: /50 punkte hinzufügen/i }))
  expect(screen.getByText('100', { selector: '.repeat-score-value' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /^eintragen$/i }))
  expect(screen.getByRole('button', { name: /mara.*yatzy korrigieren/i })).toHaveTextContent('100')
})
```

- [ ] **Step 2: Run the component tests and confirm RED**

Run: `npm test -- src/components/gameplay.test.jsx`

Expected: FAIL because the spinbutton and repeat controls do not exist.

- [ ] **Step 3: Render dialog content by policy**

In `src/components/ScoreDialog.jsx`, import `isValidScore`. Store manual input as a string so empty input stays distinguishable from zero:

```jsx
const [value, setValue] = useState(initialValue ?? (category.input === 'repeat' ? 0 : null))
const [manualValue, setManualValue] = useState(initialValue === undefined ? '' : String(initialValue))
const parsedManual = manualValue === '' ? null : Number(manualValue)
const selectedValue = category.input === 'manual' ? parsedManual : value
const canSave = selectedValue !== null && isValidScore(category, selectedValue, config)
```

For `manual`, render `<input type="number" min="0" step="1" aria-label={\`Punkte für ${category.label}\`} />` plus an inline validation message. For `repeat`, render a three-column counter with buttons labelled `50 Punkte entfernen` and `50 Punkte hinzufügen`, disabling decrement at zero. For `fixed` and `calculated`, retain the existing score-option buttons. Save only when `canSave` is true; the existing separate strike button still saves zero.

- [ ] **Step 4: Add compact responsive styles**

Add `.manual-score-field`, `.field-error`, `.repeat-score`, and `.repeat-score-value` rules to `src/styles.css`. Controls must be at least 48px high, the score value must use DM Mono, and both layouts must fit within 320px without horizontal scrolling.

- [ ] **Step 5: Run component and reducer tests and commit**

Run: `npm test -- src/components/gameplay.test.jsx src/domain/game.test.js`

Expected: PASS.

Commit:

```bash
git add src/components/ScoreDialog.jsx src/components/gameplay.test.jsx src/styles.css
git commit -m "feat: add manual scores and repeat Yatzy controls"
```

---

### Task 3: Versioned browser-state migration

**Files:**
- Modify: `src/lib/storage.js`
- Modify: `src/lib/storage.test.js`
- Modify: `src/components/gameplay.test.jsx`

**Interfaces:**
- Produces: `STORAGE_KEY = 'yatzy:v2'` and legacy lookup for `yatzy:v1`.
- Produces: `migratePersistedState(value): PersistedStateV2`.
- Consumes: `getMode(key, overrides)` to rebuild a version-2 config.

- [ ] **Step 1: Write failing migration tests**

Add to `src/lib/storage.test.js` a version-1 state containing an active game and undo snapshot with `fullHouse: 28`, `smallStraight: 15`, `largeStraight: 20`, and `yatzy: 175`. Store it under `yatzy:v1` and assert:

```js
const migrated = loadPersistedState(storage)
expect(migrated.version).toBe(2)
expect(migrated.activeGame.config.categoryVersion).toBe(2)
expect(migrated.activeGame.players[0].scores).toMatchObject({
  fullHouse: 25,
  smallStraight: 30,
  largeStraight: 40,
  yatzy: 150,
})
expect(migrated.activeGame.history[0].players[0].scores.fullHouse).toBe(25)
```

Also assert that a version-1 queued submission is normalized and marked `config.categoryVersion: 2`.

- [ ] **Step 2: Run storage tests and confirm RED**

Run: `npm test -- src/lib/storage.test.js`

Expected: FAIL because only `yatzy:v1` and state version 1 are supported.

- [ ] **Step 3: Implement deterministic migration**

In `src/lib/storage.js`, define `LEGACY_STORAGE_KEY`, set the current version to 2, and add helpers:

```js
function migrateScores(scores = {}) {
  const next = { ...scores }
  if (next.fullHouse) next.fullHouse = 25
  if (next.smallStraight) next.smallStraight = 30
  if (next.largeStraight) next.largeStraight = 40
  if (next.yatzy) next.yatzy = Math.max(0, Math.floor(next.yatzy / 50) * 50)
  return next
}

function migratePlayers(players = []) {
  return players.map(player => ({ ...player, scores: migrateScores(player.scores) }))
}
```

Rebuild active-game config through `getMode`, migrate current players and every history snapshot, and migrate queued payload scores/config. Read `yatzy:v2` first and fall back to `yatzy:v1`; persist only version 2.

- [ ] **Step 4: Verify storage and resume behavior and commit**

Run: `npm test -- src/lib/storage.test.js src/components/gameplay.test.jsx`

Expected: PASS.

Commit:

```bash
git add src/lib/storage.js src/lib/storage.test.js src/components/gameplay.test.jsx
git commit -m "feat: migrate saved games to scoring rules v2"
```

---

### Task 4: API version 2 and PostgreSQL wide totals

**Files:**
- Create: `db/migrations/002_widen_score_totals.sql`
- Modify: `server/gameService.js`
- Modify: `server/test/fixtures.js`
- Modify: `server/gameService.test.js`
- Modify: `server/repositories/postgresRepository.js`
- Modify: `server/repositories/postgresRepository.test.js`
- Modify: `server/db/migrate.test.js`
- Modify: `src/domain/game.js`

**Interfaces:**
- Produces: submission `config.categoryVersion: 2`.
- Produces: API validation for version-2 manual, fixed, and repeat scores.
- Produces: database `BIGINT` totals mapped back to safe JavaScript numbers.

- [ ] **Step 1: Write failing API and migration tests**

Update `completedGame` to emit `config.categoryVersion` from `getMode(mode)`. In `server/gameService.test.js`, replace the old impossible-pair assertion with:

```js
it('accepts manual scores and cumulative Yatzys but rejects invalid fixed scores', () => {
  const payload = completedGame()
  payload.players[0].scores.pair = 137
  payload.players[0].scores.yatzy = 150
  const result = validateCompletedGame(payload)
  expect(result.players[0].lowerTotal).toBe(287)

  payload.players[0].scores.fullHouse = 24
  expect(() => validateCompletedGame(payload)).toThrow(/ungültig/i)
})
```

Add assertions to `server/db/migrate.test.js` that migration discovery includes `002_widen_score_totals.sql` and that the SQL contains `ALTER COLUMN total TYPE BIGINT`. Add a repository test saving a manual score above the signed 32-bit range while keeping the complete total within `Number.MAX_SAFE_INTEGER`, then assert the read value and leaderboard best score are JavaScript numbers.

- [ ] **Step 2: Run server tests and confirm RED**

Run: `npm test -- server/gameService.test.js server/db/migrate.test.js server/repositories/postgresRepository.test.js`

Expected: FAIL because version 2 is rejected, the migration is absent, and pair 137 is invalid.

- [ ] **Step 3: Emit and validate category version 2**

In `src/domain/game.js`, use `game.config.categoryVersion` in `toSubmission`. In `server/gameService.js`, change the Zod literal to `z.literal(2)`, preserve the version in canonical config, and translate a `RangeError` from ranking into `GameValidationError('INVALID_SCORE', 'Die Punktesumme ist zu gross.')`.

- [ ] **Step 4: Add the BIGINT migration and numeric mapping**

Create `db/migrations/002_widen_score_totals.sql`:

```sql
ALTER TABLE game_players
  ALTER COLUMN upper_total TYPE BIGINT,
  ALTER COLUMN bonus TYPE BIGINT,
  ALTER COLUMN lower_total TYPE BIGINT,
  ALTER COLUMN total TYPE BIGINT;
```

In `server/repositories/postgresRepository.js`, convert `upper_total`, `bonus`, `lower_total`, `total`, and leaderboard aggregates with a helper that rejects unsafe values:

```js
function safeNumber(value) {
  const number = Number(value)
  if (!Number.isSafeInteger(number)) throw new RangeError('Gespeicherte Punktzahl ist zu gross.')
  return number
}
```

Update the test repository setup to apply both numbered migration files in order.

- [ ] **Step 5: Run all server tests and commit**

Run: `npm test -- server`

Expected: PASS.

Commit:

```bash
git add db/migrations/002_widen_score_totals.sql server src/domain/game.js
git commit -m "feat: validate scoring rules v2 on the server"
```

---

### Task 5: Documentation, browser QA, and release verification

**Files:**
- Modify: `README.md`
- Verify: `railway.json`

**Interfaces:**
- Consumes: the completed scoring, UI, persistence, API, and migration work.
- Produces: deploy-ready documentation and a verified GitHub commit.

- [ ] **Step 1: Update the documented house rules**

Replace the rule summary in `README.md` so it explicitly states the four manual categories, fixed 25/30/40 scores, and cumulative 50-point Yatzys in all modes. Keep the Railway instructions and `DATABASE_URL` reference guidance intact.

- [ ] **Step 2: Run the complete automated verification**

Run, in order:

```bash
npm ci
npm run lint
npm test
npm run build
git diff --check
```

Expected: 0 failures, 0 lint errors, successful Vite production build, and no whitespace errors.

- [ ] **Step 3: Perform real-browser desktop and mobile QA**

Start Vite locally, open the app with Playwright, and verify at 1440×900 and 390×844:

1. Start Standard with Mara and Timo.
2. Enter `137` for Mara's pair and confirm Timo becomes active.
3. Undo and confirm Mara becomes active again.
4. Enter two Yatzys through two `+50` actions and confirm the cell displays `100`.
5. Reopen the cell, add another Yatzy, save, and confirm `150` without changing the current player during correction.
6. Open Full House and both street dialogs and confirm only 25, 30, and 40 are offered.
7. Confirm no horizontal viewport overflow or console error.

- [ ] **Step 4: Commit documentation and push**

```bash
git add README.md
git commit -m "docs: document custom Yatzy house rules"
git push origin main
git ls-remote origin refs/heads/main
```

Expected: remote `main` hash equals local `HEAD`, and `git status --short --branch` reports `main...origin/main` with no changes.
